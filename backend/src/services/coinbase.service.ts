/**
 * Coinbase Commerce Service
 * Handles cryptocurrency payments via Coinbase Commerce API
 * 
 * Supported cryptocurrencies: BTC, ETH, USDC, SOL, and 10+ more
 * Docs: https://docs.cdp.coinbase.com/commerce/docs
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { payments, subscriptions, users, Plan } from "../db/schema";

// Coinbase Commerce API types
interface CoinbaseCharge {
  id: string;
  code: string;
  name: string;
  description: string;
  pricing: {
    local: { amount: string; currency: string };
    settlement: { amount: string; currency: string };
  };
  metadata: Record<string, any>;
  redirects: {
    cancel_url: string;
    success_url: string;
    will_redirect_after_success: boolean;
  };
  web3_data?: {
    transfer_intent?: {
      call_data: {
        id: string;
        prefix: string;
        recipient: string;
        amount: string;
        token: string;
      };
    };
  };
  created_at: string;
  expires_at: string;
  hosted_url: string;
  checkout?: {
    id: string;
  };
  timeline: Array<{
    status: string;
    time: string;
  }>;
  payments: Array<{
    network: string;
    transaction_id: string;
    status: string;
    value: {
      local: { amount: string; currency: string };
      crypto: { amount: string; currency: string };
    };
    block?: {
      height: number;
      hash: string;
      confirmations: number;
    };
    detected_at: string;
    confirmed_at?: string;
  }>;
  addresses: Record<string, string>;
}

interface CreateChargeRequest {
  name: string;
  description: string;
  local_price: {
    amount: string;
    currency: string;
  };
  pricing_type: "fixed_price" | "no_price";
  metadata?: Record<string, any>;
  redirect_url?: string;
  cancel_url?: string;
}

export class CoinbaseCommerceService {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl = "https://api.commerce.coinbase.com";

  constructor() {
    this.apiKey = process.env.COINBASE_COMMERCE_API_KEY || "";
    this.webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET || "";

    if (!this.apiKey) {
      console.warn("[coinbase] COINBASE_COMMERCE_API_KEY not configured");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-CC-Api-Key": this.apiKey,
        "X-CC-Version": "2018-03-22",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Coinbase API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a new charge for subscription payment
   */
  async createSubscriptionCharge(
    userId: string,
    plan: Plan,
    amount: number,
    billingInterval: "month" | "year",
    redirectUrl: string,
    cancelUrl: string
  ): Promise<{ charge: CoinbaseCharge; payment: typeof payments.$inferSelect }> {
    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Create charge on Coinbase Commerce
    const chargeData: CreateChargeRequest = {
      name: `ZeroOne ${plan} Plan - ${billingInterval === "year" ? "Yearly" : "Monthly"}`,
      description: `${plan} subscription for ZeroOne AI Agent Platform (${billingInterval}ly billing)`,
      local_price: {
        amount: amount.toFixed(2),
        currency: "USD",
      },
      pricing_type: "fixed_price",
      metadata: {
        user_id: userId,
        plan: plan,
        billing_interval: billingInterval,
        customer_email: user.email,
        customer_name: user.name || user.email,
        provider: "coinbase",
      },
      redirect_url: redirectUrl,
      cancel_url: cancelUrl,
    };

    const response = await this.request<{ data: CoinbaseCharge }>("/charges", {
      method: "POST",
      body: JSON.stringify(chargeData),
    });

    const charge = response.data;

    // Create payment record in our database
    const insertData: any = {
      userId,
      provider: "coinbase",
      coinbaseChargeId: charge.id,
      coinbaseChargeCode: charge.code,
      status: "PENDING",
      amount,
      currency: "USD",
    };
    
    if (charge.hosted_url) {
      insertData.coinbaseHostedUrl = charge.hosted_url;
    }
    if (charge.expires_at) {
      insertData.expiresAt = new Date(charge.expires_at);
    }
    insertData.metadata = this.sanitizeMetadata(charge);

    const [payment] = await db
      .insert(payments)
      .values(insertData)
      .returning();

    return { charge, payment };
  }

  /**
   * Get charge details from Coinbase
   */
  async getCharge(chargeId: string): Promise<CoinbaseCharge> {
    const response = await this.request<{ data: CoinbaseCharge }>(`/charges/${chargeId}`);
    return response.data;
  }

  /**
   * Handle webhook from Coinbase Commerce
   */
  async handleWebhook(payload: any, signature: string, rawBody?: string): Promise<void> {
    // Verify webhook signature for security
    if (this.webhookSecret && rawBody) {
      const isValid = this.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        throw new Error("Invalid webhook signature");
      }
    }
    
    const { event, data } = payload;
    const charge: CoinbaseCharge = data;

    console.log(`[coinbase] Webhook received: ${event.type}`, {
      chargeId: charge.id,
      chargeCode: charge.code,
    });

    // Find payment in our database
    const payment = await db.query.payments.findFirst({
      where: eq(payments.coinbaseChargeId, charge.id),
      with: {
        user: true,
      },
    });

    if (!payment) {
      console.warn(`[coinbase] Payment not found for charge ${charge.id}`);
      return;
    }

    switch (event.type) {
      case "charge:created":
        await this.handleChargeCreated(payment.id, charge);
        break;

      case "charge:pending":
        await this.handleChargePending(payment.id, charge);
        break;

      case "charge:confirmed":
        await this.handleChargeConfirmed(payment.id, charge);
        break;

      case "charge:failed":
      case "charge:expired":
        await this.handleChargeFailed(payment.id, charge);
        break;

      case "charge:delayed":
        await this.handleChargeDelayed(payment.id, charge);
        break;

      case "charge:resolved":
        await this.handleChargeResolved(payment.id, charge);
        break;

      default:
        console.log(`[coinbase] Unhandled webhook event: ${event.type}`);
    }
  }

  private async handleChargeCreated(paymentId: string, charge: CoinbaseCharge): Promise<void> {
    await db
      .update(payments)
      .set({
        status: "PENDING",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));
  }

  private async handleChargePending(paymentId: string, charge: CoinbaseCharge): Promise<void> {
    const cryptoPayment = charge.payments?.[0];
    
    const updateData: any = {
      status: "PENDING",
      metadata: this.sanitizeMetadata(charge),
      updatedAt: new Date(),
    };
    
    if (cryptoPayment) {
      updateData.cryptoAmount = parseFloat(cryptoPayment.value.crypto.amount);
      updateData.cryptoCurrency = cryptoPayment.value.crypto.currency;
    }
    
    await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, paymentId));
  }

  private async handleChargeConfirmed(paymentId: string, charge: CoinbaseCharge): Promise<void> {
    const cryptoPayment = charge.payments?.[0];
    
    const paymentUpdateData: any = {
      status: "COMPLETED",
      paidAt: new Date(),
      metadata: this.sanitizeMetadata(charge),
      updatedAt: new Date(),
    };
    
    if (cryptoPayment) {
      paymentUpdateData.cryptoAmount = parseFloat(cryptoPayment.value.crypto.amount);
      paymentUpdateData.cryptoCurrency = cryptoPayment.value.crypto.currency;
    }
    
    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set(paymentUpdateData)
        .where(eq(payments.id, paymentId));

      const payment = await tx.query.payments.findFirst({
        where: eq(payments.id, paymentId),
      });

      if (!payment) return;

      const metadata = charge.metadata || {};
      const plan = metadata.plan as Plan;
      const billingInterval = (metadata.billing_interval || "month") as "month" | "year";
      const userId = payment.userId;

      const now = new Date();
      const periodEnd = new Date(now);
      if (billingInterval === "year") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const [subscription] = await tx
        .insert(subscriptions)
        .values({
          userId,
          plan,
          provider: "coinbase",
          coinbaseChargeId: charge.id,
          coinbaseChargeCode: charge.code,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          billingInterval,
          amountPaid: payment.amount,
          currency: payment.currency,
        })
        .returning();

      await tx
        .update(users)
        .set({
          plan,
          currentSubscriptionId: subscription.id,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await tx
        .update(payments)
        .set({ subscriptionId: subscription.id })
        .where(eq(payments.id, paymentId));

      console.log(`[coinbase] Subscription activated for user ${userId}: ${plan}`);
    });
  }

  private async handleChargeFailed(paymentId: string, charge: CoinbaseCharge): Promise<void> {
    await db
      .update(payments)
      .set({
        status: "FAILED",
        metadata: this.sanitizeMetadata(charge),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));
  }

  private async handleChargeDelayed(paymentId: string, charge: CoinbaseCharge): Promise<void> {
    await db
      .update(payments)
      .set({
        status: "PENDING",
        metadata: this.sanitizeMetadata(charge),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));
  }

  private async handleChargeResolved(paymentId: string, charge: CoinbaseCharge): Promise<void> {
    const timeline = charge.timeline || [];
    const isResolvedSuccess = timeline.some(
      (t) => t.status === "RESOLVED" || t.status === "COMPLETED"
    );

    if (isResolvedSuccess) {
      await this.handleChargeConfirmed(paymentId, charge);
    } else {
      await this.handleChargeFailed(paymentId, charge);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<void> {
    await db.transaction(async (tx) => {
      const subscription = await tx.query.subscriptions.findFirst({
        where: eq(subscriptions.id, subscriptionId),
      });

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      if (immediate) {
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
      } else {
        await tx
          .update(subscriptions)
          .set({
            cancelAtPeriodEnd: true,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscriptionId));
      }
    });
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
   * Verify Coinbase Commerce webhook signature
   */
  private verifyWebhookSignature(rawBody: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(rawBody);
      const computedSignature = hmac.digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      console.error('[coinbase] Failed to verify webhook signature:', error);
      return false;
    }
  }

  /**
   * Sanitize metadata object to remove undefined values
   */
  private sanitizeMetadata(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }
}

// Export singleton instance
export const coinbaseService = new CoinbaseCommerceService();
