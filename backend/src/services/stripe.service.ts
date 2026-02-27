/**
 * Stripe Payment Service
 * Handles hybrid payments: Credit Cards + Crypto (USDC)
 * 
 * Supported payment methods:
 * - Credit/Debit Cards (Visa, Mastercard, Amex, etc.)
 * - USDC on Ethereum, Solana, Polygon
 * - Apple Pay, Google Pay (via Stripe Link)
 * 
 * Docs: https://docs.stripe.com/get-started
 */

import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { payments, subscriptions, users, Plan } from "../db/schema";

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

// Price IDs configuration
// These should be created in Stripe Dashboard and set in environment variables
const STRIPE_PRICE_IDS: Record<Plan, { month: string; year: string }> = {
  FREE: { month: "", year: "" },
  PRO: {
    month: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || "",
    year: process.env.STRIPE_PRICE_ID_PRO_YEARLY || "",
  },
  BUSINESS: {
    month: process.env.STRIPE_PRICE_ID_BUSINESS_MONTHLY || "",
    year: process.env.STRIPE_PRICE_ID_BUSINESS_YEARLY || "",
  },
  ENTERPRISE: {
    month: process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || "",
    year: process.env.STRIPE_PRICE_ID_ENTERPRISE_YEARLY || "",
  },
};

export class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!stripeSecretKey) {
      console.warn("[stripe] STRIPE_SECRET_KEY not configured");
    }
    
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });
  }

  /**
   * Create or retrieve a Stripe customer for a user
   */
  async createOrGetCustomer(userId: string): Promise<string> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has a Stripe customer ID in metadata
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (existingSubscription?.stripeCustomerId) {
      // Verify customer still exists in Stripe
      try {
        const customer = await this.stripe.customers.retrieve(
          existingSubscription.stripeCustomerId
        );
        if (!customer.deleted) {
          return existingSubscription.stripeCustomerId;
        }
      } catch (error) {
        console.log("[stripe] Existing customer not found, creating new one");
      }
    }

    // Create new customer
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: userId,
      },
    });

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   * Supports both card payments and crypto (USDC)
   */
  async createCheckoutSession(
    userId: string,
    plan: Plan,
    billingInterval: "month" | "year",
    successUrl: string,
    cancelUrl: string
  ): Promise<{ session: Stripe.Checkout.Session; payment: typeof payments.$inferSelect }> {
    // Enterprise requires custom pricing - contact sales
    if (plan === "ENTERPRISE") {
      throw new Error("Enterprise plan requires custom pricing. Please contact sales.");
    }

    const priceId = STRIPE_PRICE_IDS[plan][billingInterval];
    
    if (!priceId) {
      throw new Error(`Price ID not configured for ${plan} plan with ${billingInterval}ly billing`);
    }

    const customerId = await this.createOrGetCustomer(userId);

    // Get plan config for amount
    const planConfig = await db.query.planConfigs.findFirst({
      where: (configs, { eq }) => eq(configs.plan, plan),
    });

    const amount = billingInterval === "year"
      ? (planConfig?.priceYearly ?? (plan === "PRO" ? 89 : plan === "BUSINESS" ? 490 : 0))
      : (planConfig?.priceMonthly ?? (plan === "PRO" ? 9 : plan === "BUSINESS" ? 49 : 0));

    // Create checkout session
    // Enable crypto payments by setting allowed_cryptocurrencies
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
        billingInterval,
      },
      // Enable automatic tax calculation if configured
      // automatic_tax: { enabled: true },
      
      // Enable automatic tax calculation if configured
      // automatic_tax: { enabled: true },
      
      // Allow crypto payments (USDC on Ethereum, Solana, Polygon)
      // Note: To enable USDC, go to Stripe Dashboard → Settings → Payment methods → Crypto
      // Customer will see "Pay with crypto" option if they have a wallet
      // https://docs.stripe.com/billing/subscriptions/stablecoins
      subscription_data: {
        metadata: {
          userId,
          plan,
          billingInterval,
        },
        // trial_period_days can be added here if you want to offer free trial
        // Note: Stripe requires minimum 1 day, cannot be 0
      },
      // Don't specify payment_method_types - let Stripe offer all enabled methods
      // including card, link, and crypto (if enabled in dashboard)
      allow_promotion_codes: true,
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto",
      },
    });

    // Create payment record
    const [payment] = await db
      .insert(payments)
      .values({
        userId,
        provider: "stripe",
        stripeCheckoutSessionId: session.id,
        status: "PENDING",
        amount,
        currency: "USD",
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
        metadata: {
          checkoutSession: session,
          plan,
          billingInterval,
        },
      })
      .returning();

    return { session, payment };
  }

  /**
   * Create a customer portal session for managing subscriptions
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediate: boolean = false
  ): Promise<void> {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, subscriptionId),
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (!subscription.stripeSubscriptionId) {
      throw new Error("Subscription not found in Stripe");
    }

    if (immediate) {
      // Cancel immediately
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      
      await db.transaction(async (tx) => {
        await tx
          .update(subscriptions)
          .set({
            status: "CANCELLED",
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscriptionId));

        await tx
          .update(users)
          .set({
            plan: "FREE",
            currentSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, subscription.userId));
      });
    } else {
      // Cancel at period end
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await db
        .update(subscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscriptionId));
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(
    payload: Buffer | string,
    signature: string
  ): Promise<{ received: boolean; event?: Stripe.Event }> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        stripeWebhookSecret
      );
    } catch (err: any) {
      console.error(`[stripe] Webhook signature verification failed:`, err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`[stripe] Webhook received: ${event.type}`, {
      id: event.id,
    });

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "checkout.session.expired":
        await this.handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_succeeded":
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.created":
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "payment_intent.succeeded":
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`[stripe] Unhandled event type: ${event.type}`);
    }

    return { received: true, event };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    if (session.mode !== "subscription" || !session.subscription) {
      return;
    }

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as Plan;
    const billingInterval = session.metadata?.billingInterval as "month" | "year";

    if (!userId || !plan) {
      console.error("[stripe] Missing metadata in checkout session", session.id);
      return;
    }

    // Get subscription details from Stripe
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const now = new Date();
    const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

    await db.transaction(async (tx) => {
      // Find or create payment record
      const existingPayment = await tx.query.payments.findFirst({
        where: eq(payments.stripeCheckoutSessionId, session.id),
      });

      if (existingPayment) {
        await tx
          .update(payments)
          .set({
            status: "COMPLETED",
            stripePaymentIntentId: session.payment_intent as string,
            paidAt: new Date(),
            metadata: {
              ...existingPayment.metadata,
              checkoutSession: session,
              subscription: stripeSubscription,
            },
            updatedAt: new Date(),
          })
          .where(eq(payments.id, existingPayment.id));
      }

      // Create subscription record
      const [subscription] = await tx
        .insert(subscriptions)
        .values({
          userId,
          plan,
          provider: "stripe",
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: stripeSubscription.items.data[0]?.price.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          billingInterval,
          amountPaid: session.amount_total ? session.amount_total / 100 : undefined,
          currency: session.currency?.toUpperCase() || "USD",
        })
        .returning();

      // Update user's plan
      await tx
        .update(users)
        .set({
          plan,
          currentSubscriptionId: subscription.id,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Link payment to subscription
      if (existingPayment) {
        await tx
          .update(payments)
          .set({ subscriptionId: subscription.id })
          .where(eq(payments.id, existingPayment.id));
      }

      console.log(`[stripe] Subscription activated for user ${userId}: ${plan}`);
    });
  }

  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
    const existingPayment = await db.query.payments.findFirst({
      where: eq(payments.stripeCheckoutSessionId, session.id),
    });

    if (existingPayment) {
      await db
        .update(payments)
        .set({
          status: "EXPIRED",
          updatedAt: new Date(),
        })
        .where(eq(payments.id, existingPayment.id));
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, invoice.subscription as string),
    });

    if (!subscription) {
      console.warn(`[stripe] Subscription not found for invoice ${invoice.id}`);
      return;
    }

    // Check if this is a USDC/crypto payment
    const paymentIntent = invoice.payment_intent
      ? await this.stripe.paymentIntents.retrieve(invoice.payment_intent as string)
      : null;

    const paymentMethod = paymentIntent?.payment_method as string | undefined;
    let isCrypto = false;
    let cryptoCurrency: string | undefined;

    if (paymentMethod) {
      try {
        const pm = await this.stripe.paymentMethods.retrieve(paymentMethod);
        // Crypto payments in Stripe are typically identified by type
        isCrypto = pm.type === "crypto";
        if (isCrypto) {
          cryptoCurrency = "USDC"; // Stripe currently supports USDC primarily
        }
      } catch (error) {
        console.error("[stripe] Error retrieving payment method:", error);
      }
    }

    // Create payment record for this invoice
    await db.insert(payments).values({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      provider: "stripe",
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent as string,
      status: "COMPLETED",
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      cryptoAmount: isCrypto ? invoice.amount_paid / 100 : undefined,
      cryptoCurrency: isCrypto ? cryptoCurrency : undefined,
      paymentMethod: isCrypto ? "crypto" : "card",
      paidAt: new Date(invoice.status_transitions.paid_at * 1000),
      metadata: {
        invoice,
        paymentIntent,
        isCrypto,
      },
    });

    // Update subscription period
    const stripeSub = await this.stripe.subscriptions.retrieve(
      invoice.subscription as string
    );

    await db
      .update(subscriptions)
      .set({
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        status: "ACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, invoice.subscription as string),
    });

    if (subscription) {
      await db
        .update(subscriptions)
        .set({
          status: "PAST_DUE",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));
    }
  }

  private async handleSubscriptionCreated(stripeSub: Stripe.Subscription): Promise<void> {
    // Subscription is created via checkout session, handled there
    console.log(`[stripe] Subscription created: ${stripeSub.id}`);
  }

  private async handleSubscriptionUpdated(stripeSub: Stripe.Subscription): Promise<void> {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, stripeSub.id),
    });

    if (!subscription) return;

    const status = this.mapStripeStatus(stripeSub.status);
    
    await db
      .update(subscriptions)
      .set({
        status,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, stripeSub.id),
    });

    if (!subscription) return;

    await db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({
          status: "CANCELLED",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      await tx
        .update(users)
        .set({
          plan: "FREE",
          currentSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, subscription.userId));
    });
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Update payment record if exists
    const payment = await db.query.payments.findFirst({
      where: eq(payments.stripePaymentIntentId, paymentIntent.id),
    });

    if (payment && payment.status !== "COMPLETED") {
      await db
        .update(payments)
        .set({
          status: "COMPLETED",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.stripePaymentIntentId, paymentIntent.id),
    });

    if (payment) {
      await db
        .update(payments)
        .set({
          status: "FAILED",
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
    }
  }

  /**
   * Map Stripe subscription status to our status enum
   */
  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
    const statusMap: Record<string, string> = {
      active: "ACTIVE",
      canceled: "CANCELLED",
      incomplete: "PENDING",
      incomplete_expired: "EXPIRED",
      past_due: "PAST_DUE",
      paused: "PENDING",
      trialing: "TRIALING",
      unpaid: "UNPAID",
    };

    return statusMap[stripeStatus] || "PENDING";
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        currentSubscription: true,
      },
    });

    return user?.currentSubscription || null;
  }

  /**
   * Get user's payment history
   */
  async getUserPayments(userId: string) {
    return db.query.payments.findMany({
      where: eq(payments.userId, userId),
      orderBy: (payments, { desc }) => [desc(payments.createdAt)],
    });
  }

  /**
   * Create a billing portal session for user to manage their subscription
   */
  async createBillingPortalSession(userId: string, returnUrl: string): Promise<string> {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error("No Stripe subscription found");
    }

    return this.createPortalSession(subscription.stripeCustomerId, returnUrl);
  }

  /**
   * Process expired subscriptions - check if any Stripe subscriptions need cleanup
   */
  async processExpiredSubscriptions(): Promise<void> {
    const now = new Date();

    const expiredSubscriptions = await db.query.subscriptions.findMany({
      where: (subscriptions, { and, eq, lt }) =>
        and(
          eq(subscriptions.status, "ACTIVE"),
          lt(subscriptions.currentPeriodEnd, now),
          eq(subscriptions.cancelAtPeriodEnd, true)
        ),
    });

    for (const subscription of expiredSubscriptions) {
      await db.transaction(async (tx) => {
        await tx
          .update(subscriptions)
          .set({
            status: "EXPIRED",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));

        await tx
          .update(users)
          .set({
            plan: "FREE",
            currentSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, subscription.userId));

        console.log(`[stripe] Subscription expired for user ${subscription.userId}`);
      });
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
