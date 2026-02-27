import { Router, Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { planConfigs, Plan, payments, users } from "../db/schema";
import { stripeService } from "../services/stripe.service";
import { coinbaseService } from "../services/coinbase.service";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// Validation schemas
const createCheckoutSchema = z.object({
  plan: z.enum(["PRO", "BUSINESS", "ENTERPRISE"]),
  billingInterval: z.enum(["month", "year"]).default("month"),
  provider: z.enum(["stripe", "coinbase"]).default("stripe"),
});

const createCryptoCheckoutSchema = z.object({
  plan: z.enum(["PRO", "BUSINESS", "ENTERPRISE"]),
  billingInterval: z.enum(["month", "year"]).default("month"),
});

const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
});

// Plan configuration (seed data)
// Discount for yearly: ~17.5%
export const DEFAULT_PLANS = [
  {
    plan: "FREE" as Plan,
    name: "Free",
    description: "Perfect for getting started",
    priceMonthly: 0,
    priceYearly: 0,
    maxAgents: 1,
    maxMemoryMb: 128,
    maxCpuQuota: 0.5,
    features: [
      "1 AI Agent",
      "All AI providers",
      "Telegram, Discord, Slack",
      "Basic memory (SQLite)",
    ],
  },
  {
    plan: "PRO" as Plan,
    name: "Pro",
    description: "For power users and small teams",
    priceMonthly: 9,
    priceYearly: 89, // ~17.5% discount (was $108)
    maxAgents: 5,
    maxMemoryMb: 256,
    maxCpuQuota: 1.0,
    features: [
      "5 AI Agents",
      "All AI providers",
      "Priority email support",
      "Advanced memory options",
      "Custom domains",
      "Credit Card & USDC",
    ],
  },
  {
    plan: "BUSINESS" as Plan,
    name: "Business",
    description: "For growing teams with collaboration needs",
    priceMonthly: 49,
    priceYearly: 490, // ~17.5% discount (was $588)
    maxAgents: 50,
    maxMemoryMb: 512,
    maxCpuQuota: 2.0,
    features: [
      "50 AI Agents",
      "All AI providers",
      "Priority configuration support",
      "Team Collaboration",
      "Advanced analytics",
      "Shared workspaces",
      "Credit Card & USDC",
    ],
  },
  {
    plan: "ENTERPRISE" as Plan,
    name: "Enterprise",
    description: "For organizations with advanced security needs",
    priceMonthly: -1, // Custom pricing
    priceYearly: -1,  // Custom pricing
    maxAgents: -1,    // Unlimited
    maxMemoryMb: 1024,
    maxCpuQuota: 4.0,
    features: [
      "Unlimited AI Agents",
      "All AI providers",
      "Dedicated support",
      "On-premise deployment",
      "SSO/SAML authentication",
      "Custom SLA",
      "Audit logs",
    ],
  },
];

// ── Public Routes ──────────────────────────────────────────────

/**
 * GET /api/payments/plans
 * Get all available plans with pricing
 */
router.get("/plans", async (_req, res) => {
  try {
    // Always use DEFAULT_PLANS (source of truth)
    // DB plans are for reference only, not for active pricing
    const plans = DEFAULT_PLANS;

    res.json({
      success: true,
      data: plans.map((p) => ({
        plan: p.plan,
        name: p.name,
        description: p.description,
        price: {
          monthly: p.priceMonthly,
          yearly: p.priceYearly,
        },
        limits: {
          maxAgents: p.maxAgents,
          maxMemoryMb: p.maxMemoryMb,
          maxCpuQuota: p.maxCpuQuota,
        },
        features: p.features,
      })),
    });
  } catch (error) {
    console.error("[payments] Failed to get plans:", error);
    res.status(500).json({ success: false, error: "Failed to get plans" });
  }
});

/**
 * POST /api/payments/webhook
 * Stripe webhook handler
 */
router.post("/webhook", async (req, res) => {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    res.status(400).json({ success: false, error: "Missing stripe-signature header" });
    return;
  }

  try {
    // Get raw body as Buffer
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const rawBody = Buffer.concat(chunks);
        await stripeService.handleWebhook(rawBody, signature);
        res.json({ received: true });
      } catch (error: any) {
        console.error("[payments] Webhook error:", error);
        res.status(400).json({ success: false, error: error.message });
      }
    });
    req.on("error", (error) => {
      console.error("[payments] Webhook request error:", error);
      res.status(400).json({ success: false, error: "Request error" });
    });
  } catch (error: any) {
    console.error("[payments] Webhook error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/payments/webhook/coinbase
 * Coinbase Commerce webhook handler
 */
router.post("/webhook/coinbase", async (req, res) => {
  const signature = req.headers["x-cc-webhook-signature"] as string;

  try {
    // Get raw body for signature verification
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        const payload = JSON.parse(rawBody);
        
        await coinbaseService.handleWebhook(payload, signature, rawBody);
        res.json({ received: true });
      } catch (error: any) {
        console.error("[payments] Coinbase webhook error:", error);
        res.status(400).json({ success: false, error: error.message });
      }
    });
    req.on("error", (error) => {
      console.error("[payments] Coinbase webhook request error:", error);
      res.status(400).json({ success: false, error: "Request error" });
    });
  } catch (error: any) {
    console.error("[payments] Coinbase webhook error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── Protected Routes ───────────────────────────────────────────

/**
 * POST /api/payments/checkout
 * Create a new checkout session for subscription via Stripe
 */
router.post("/checkout", requireAuth, async (req: AuthRequest, res) => {
  try {
    const parseResult = createCheckoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request",
        details: parseResult.error.errors,
      });
      return;
    }

    const { plan, billingInterval } = parseResult.data;
    const userId = req.user!.userId;

    // Get plan pricing
    const planConfig = await db.query.planConfigs.findFirst({
      where: eq(planConfigs.plan, plan),
    });

    const defaultPlan = DEFAULT_PLANS.find((p) => p.plan === plan);
    const price = billingInterval === "year" 
      ? (planConfig?.priceYearly ?? defaultPlan?.priceYearly ?? 0)
      : (planConfig?.priceMonthly ?? defaultPlan?.priceMonthly ?? 0);

    if (price <= 0) {
      res.status(400).json({
        success: false,
        error: "Invalid plan price",
      });
      return;
    }

    // Get frontend URL for redirects
    // Priority: FRONTEND_URL > DOMAIN > default localhost:3000
    const frontendUrl = process.env.FRONTEND_URL || (process.env.DOMAIN ? `${process.env.NODE_ENV === "production" ? "https" : "http"}://${process.env.DOMAIN}` : null);
    
    let successUrl: string;
    let cancelUrl: string;
    
    if (frontendUrl) {
      successUrl = `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${frontendUrl}/billing/cancel`;
    } else {
      // Fallback for local development - hardcoded frontend port
      successUrl = `http://localhost:3000/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `http://localhost:3000/billing/cancel`;
    }

    // Create Stripe checkout session
    const { session, payment } = await stripeService.createCheckoutSession(
      userId,
      plan,
      billingInterval,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
        paymentId: payment.id,
        provider: "stripe",
        // Stripe checkout sessions expire after 24 hours by default
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[payments] Checkout error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create checkout",
    });
  }
});

/**
 * POST /api/payments/checkout/crypto
 * Create a new checkout session for cryptocurrency payment via Coinbase Commerce
 */
router.post("/checkout/crypto", requireAuth, async (req: AuthRequest, res) => {
  try {
    const parseResult = createCryptoCheckoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request",
        details: parseResult.error.errors,
      });
      return;
    }

    const { plan, billingInterval } = parseResult.data;
    const userId = req.user!.userId;

    // Get plan pricing
    const planConfig = DEFAULT_PLANS.find((p) => p.plan === plan);

    const price = billingInterval === "year" 
      ? (planConfig?.priceYearly ?? 0)
      : (planConfig?.priceMonthly ?? 0);

    if (price <= 0) {
      res.status(400).json({
        success: false,
        error: "Invalid plan price",
      });
      return;
    }

    // Get frontend URL for redirects
    const frontendUrl = process.env.FRONTEND_URL || (process.env.DOMAIN ? `${process.env.NODE_ENV === "production" ? "https" : "http"}://${process.env.DOMAIN}` : null);
    
    let successUrl: string;
    let cancelUrl: string;
    
    if (frontendUrl) {
      successUrl = `${frontendUrl}/billing/success?provider=coinbase`;
      cancelUrl = `${frontendUrl}/billing/cancel`;
    } else {
      successUrl = `http://localhost:3000/billing/success?provider=coinbase`;
      cancelUrl = `http://localhost:3000/billing/cancel`;
    }

    // Create Coinbase Commerce charge
    const { charge, payment } = await coinbaseService.createSubscriptionCharge(
      userId,
      plan,
      price,
      billingInterval,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      data: {
        checkoutUrl: charge.hosted_url,
        chargeId: charge.id,
        chargeCode: charge.code,
        paymentId: payment.id,
        provider: "coinbase",
        expiresAt: charge.expires_at,
      },
    });
  } catch (error: any) {
    console.error("[payments] Crypto checkout error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create crypto checkout",
    });
  }
});

/**
 * POST /api/payments/portal
 * Create a billing portal session for managing subscription
 */
router.post("/portal", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Get frontend URL for return URL
    const frontendUrl = process.env.FRONTEND_URL || (process.env.DOMAIN ? `${process.env.NODE_ENV === "production" ? "https" : "http"}://${process.env.DOMAIN}` : null);
    const returnUrl = frontendUrl ? `${frontendUrl}/dashboard/billing` : "http://localhost:3000/dashboard/billing";

    const portalUrl = await stripeService.createBillingPortalSession(userId, returnUrl);

    res.json({
      success: true,
      data: {
        portalUrl,
      },
    });
  } catch (error: any) {
    console.error("[payments] Portal error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create portal session",
    });
  }
});

/**
 * GET /api/payments/subscription
 * Get current user's subscription
 */
router.get("/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const subscription = await stripeService.getUserSubscription(userId);

    if (!subscription) {
      res.json({
        success: true,
        data: null,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        billingInterval: subscription.billingInterval,
        amountPaid: subscription.amountPaid,
        currency: subscription.currency,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
      },
    });
  } catch (error: any) {
    console.error("[payments] Get subscription error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get subscription",
    });
  }
});

/**
 * POST /api/payments/subscription/cancel
 * Cancel current subscription
 */
router.post("/subscription/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const parseResult = cancelSubscriptionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request",
      });
      return;
    }

    const userId = req.user!.userId;
    const { immediate } = parseResult.data;

    // Get user's current subscription
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        currentSubscriptionId: true,
      },
    });

    if (!user?.currentSubscriptionId) {
      res.status(400).json({
        success: false,
        error: "No active subscription found",
      });
      return;
    }

    await stripeService.cancelSubscription(user.currentSubscriptionId, immediate);

    res.json({
      success: true,
      data: {
        message: immediate 
          ? "Subscription cancelled immediately"
          : "Subscription will be cancelled at the end of the billing period",
      },
    });
  } catch (error: any) {
    console.error("[payments] Cancel subscription error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to cancel subscription",
    });
  }
});

/**
 * GET /api/payments/history
 * Get payment history for current user
 */
router.get("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const userPayments = await stripeService.getUserPayments(userId);

    res.json({
      success: true,
      data: userPayments.map((p) => ({
        id: p.id,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        cryptoAmount: p.cryptoAmount,
        cryptoCurrency: p.cryptoCurrency,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[payments] Get history error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get payment history",
    });
  }
});

/**
 * GET /api/payments/status/:paymentId
 * Check payment status
 */
router.get("/status/:paymentId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user!.userId;

    const payment = await db.query.payments.findFirst({
      where: (payments, { and, eq }) =>
        and(
          eq(payments.id, paymentId),
          eq(payments.userId, userId)
        ),
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: "Payment not found",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        cryptoAmount: payment.cryptoAmount,
        cryptoCurrency: payment.cryptoCurrency,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      },
    });
  } catch (error: any) {
    console.error("[payments] Get status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get payment status",
    });
  }
});

/**
 * GET /api/payments/checkout-session/:sessionId
 * Get checkout session status (for success page)
 */
router.get("/checkout-session/:sessionId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.userId;

    // Verify the session belongs to this user
    const payment = await db.query.payments.findFirst({
      where: (payments, { and, eq }) =>
        and(
          eq(payments.stripeCheckoutSessionId, sessionId),
          eq(payments.userId, userId)
        ),
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: "Checkout session not found",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      },
    });
  } catch (error: any) {
    console.error("[payments] Get checkout session error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get checkout session",
    });
  }
});

export default router;
