import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────

export const planEnum = pgEnum("plan", ["FREE", "PRO", "ENTERPRISE"]);

export const agentStatusEnum = pgEnum("agent_status", [
  "PENDING",
  "STARTING",
  "RUNNING",
  "STOPPING",
  "STOPPED",
  "ERROR",
]);

// ── Users ──────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  password: text("password"),           // null for Google-only accounts
  googleId: text("google_id").unique(), // Firebase UID
  avatar: text("avatar"),               // Google profile picture URL
  name: text("name"),
  plan: planEnum("plan").notNull().default("FREE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

export const usersRelations = relations(users, ({ many }) => ({
  agents: many(agents),
}));

export const agentsRelations = relations(agents, ({ one }) => ({
  user: one(users, { fields: [agents.userId], references: [users.id] }),
}));

// ── Inferred Types ─────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentStatus = (typeof agentStatusEnum.enumValues)[number];
export type Plan = (typeof planEnum.enumValues)[number];
