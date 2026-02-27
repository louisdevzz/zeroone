import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  real,
  index,
  uniqueIndex,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────

export const planEnum = pgEnum("plan", ["FREE", "PRO", "BUSINESS", "ENTERPRISE"]);

export const agentStatusEnum = pgEnum("agent_status", [
  "PENDING",
  "STARTING",
  "RUNNING",
  "STOPPING",
  "STOPPED",
  "ERROR",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "PAST_DUE",
  "TRIALING",
  "UNPAID",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "EXPIRED",
  "PROCESSING",
  "REQUIRES_ACTION",
]);

// ── Users ──────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clerkId: text("clerk_id").unique(), // Clerk user ID
  email: text("email").notNull().unique(),
  password: text("password"),           // null for OAuth-only accounts
  googleId: text("google_id").unique(), // Deprecated: use Clerk instead
  avatar: text("avatar"),               // Profile picture URL
  name: text("name"),
  plan: planEnum("plan").notNull().default("FREE"),
  // Subscription tracking
  currentSubscriptionId: text("current_subscription_id"),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Subscription Plans Configuration ────────────────────────────

export const planConfigs = pgTable("plan_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  plan: planEnum("plan").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  priceMonthly: real("price_monthly").notNull(), // in USD
  priceYearly: real("price_yearly"), // in USD (optional discount)
  maxAgents: integer("max_agents").notNull(),
  maxMemoryMb: integer("max_memory_mb").notNull().default(128),
  maxCpuQuota: real("max_cpu_quota").notNull().default(0.5),
  features: jsonb("features").$type<string[]>(), // JSON array of feature descriptions
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Subscriptions ───────────────────────────────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull(),
    
    // Payment Provider
    provider: text("provider").notNull().default("stripe"), // stripe | coinbase
    
    // Stripe
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    
    // Coinbase Commerce
    coinbaseChargeId: text("coinbase_charge_id").unique(),
    coinbaseChargeCode: text("coinbase_charge_code"),
    
    // Status & Timing
    status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at"),
    
    // Billing
    billingInterval: text("billing_interval").notNull().default("month"), // month | year
    amountPaid: real("amount_paid"), // in USD
    currency: text("currency").default("USD"),
    
    // Metadata
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("subscriptions_user_id_idx").on(t.userId),
    index("subscriptions_status_idx").on(t.status),
    index("subscriptions_stripe_subscription_id_idx").on(t.stripeSubscriptionId),
    index("subscriptions_stripe_customer_id_idx").on(t.stripeCustomerId),
    index("subscriptions_coinbase_charge_id_idx").on(t.coinbaseChargeId),
  ]
);

// ── Payments (Individual charges) ───────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    
    // Payment Provider
    provider: text("provider").notNull().default("stripe"), // stripe | coinbase
    
    // Stripe details
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    stripeInvoiceId: text("stripe_invoice_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    paymentMethod: text("payment_method"), // card, usdc, link, etc.
    
    // Coinbase Commerce details
    coinbaseChargeId: text("coinbase_charge_id").unique(),
    coinbaseChargeCode: text("coinbase_charge_code"),
    coinbaseHostedUrl: text("coinbase_hosted_url"), // Checkout URL
    
    // Payment details
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    amount: real("amount").notNull(), // in USD
    currency: text("currency").notNull().default("USD"),
    cryptoAmount: real("crypto_amount"), // Amount paid in crypto
    cryptoCurrency: text("crypto_currency"), // e.g., "BTC", "ETH", "USDC"
    
    // Timestamps
    paidAt: timestamp("paid_at"),
    expiresAt: timestamp("expires_at"),
    
    // Metadata
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("payments_user_id_idx").on(t.userId),
    index("payments_subscription_id_idx").on(t.subscriptionId),
    index("payments_status_idx").on(t.status),
    index("payments_stripe_payment_intent_id_idx").on(t.stripePaymentIntentId),
    index("payments_stripe_checkout_session_id_idx").on(t.stripeCheckoutSessionId),
    index("payments_coinbase_charge_id_idx").on(t.coinbaseChargeId),
  ]
);

// ── Agents ─────────────────────────────────────────────────────

export const agents = pgTable(
  "agents",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Identity
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),

    // Docker
    containerId: text("container_id"),
    containerPort: integer("container_port"), // host port mapped to container:42617
    status: agentStatusEnum("status").notNull().default("PENDING"),

    // LLM config
    provider: text("provider").notNull().default("openrouter"),
    model: text("model").notNull().default("anthropic/claude-sonnet-4-6"),
    temperature: real("temperature").notNull().default(0.7),

    // ZeroClaw identity (written to IDENTITY.md / USER.md in workspace)
    agentName: text("agent_name").notNull().default("ZeroClaw"),
    userName: text("user_name"),
    timezone: text("timezone").notNull().default("UTC"),
    communicationStyle: text("communication_style"),

    // ZeroClaw memory config
    memoryBackend: text("memory_backend").notNull().default("sqlite"),
    autoSave: text("auto_save").notNull().default("true"), // stored as string

    // ZeroClaw channels config (encrypted JSON)
    encryptedChannels: text("encrypted_channels"), // AES-256-GCM encrypted JSON

    // Secrets (AES-256-GCM encrypted, base64)
    encryptedToken: text("encrypted_token"),   // ZeroClaw bearer token
    encryptedApiKey: text("encrypted_api_key"), // User LLM API key

    // Provider URL override (for compatible / custom endpoints)
    providerUrl: text("provider_url"),

    // Routing
    subdomain: text("subdomain"), // e.g. "my-agent.zeroonec.xyz"

    // Metrics (polled from Docker stats)
    memoryMb: real("memory_mb"),
    cpuPercent: real("cpu_percent"),
    lastHealthAt: timestamp("last_health_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("agents_user_id_idx").on(t.userId),
    uniqueIndex("agents_slug_idx").on(t.slug),
    index("agents_container_id_idx").on(t.containerId),
  ]
);

// ── Relations ──────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  agents: many(agents),
  subscriptions: many(subscriptions),
  payments: many(payments),
  currentSubscription: one(subscriptions, {
    fields: [users.currentSubscriptionId],
    references: [subscriptions.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  subscription: one(subscriptions, { fields: [payments.subscriptionId], references: [subscriptions.id] }),
}));

export const agentsRelations = relations(agents, ({ one }) => ({
  user: one(users, { fields: [agents.userId], references: [users.id] }),
}));

export const planConfigsRelations = relations(planConfigs, ({ many }) => ({
  // Future: track which users are on this plan
}));

// ── Inferred Types ─────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentStatus = (typeof agentStatusEnum.enumValues)[number];
export type Plan = (typeof planEnum.enumValues)[number];
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PlanConfig = typeof planConfigs.$inferSelect;
export type NewPlanConfig = typeof planConfigs.$inferInsert;
