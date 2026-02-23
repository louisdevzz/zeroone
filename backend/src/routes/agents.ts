import { Router } from "express";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { agents, users } from "../db/schema";
import { authenticate, type AuthRequest } from "../middleware/auth";
import { encrypt, decrypt } from "../lib/crypto";
import {
  deployAgent,
  stopContainer,
  startContainer,
  restartContainer,
  removeContainer,
  getContainerLogs,
  getContainerStats,
  waitForPairingCode,
  waitForNewPairingCode,
  initWorkspace,
  containerConnectHost,
  containerConnectPort,
  type WorkspaceContext,
} from "../services/docker.service";
import { pairAgent, sendMessage, checkHealth } from "../services/zeroclaw.service";
import { PLAN_LIMITS } from "../types";

const router = Router();

// All agent routes require authentication
router.use(authenticate);

// Express v5: req.params values are typed as string | string[], cast helper
const p = (val: string | string[]): string => (Array.isArray(val) ? val[0] : val);

// ── Schemas ────────────────────────────────────────────────────

const telegramSchema = z.object({
  botToken: z.string().min(1),
  allowedUsers: z.array(z.string()).default([]),
});

const discordSchema = z.object({
  botToken: z.string().min(1),
  guildId: z.string().optional(),
  allowedUsers: z.array(z.string()).default([]),
});

const slackSchema = z.object({
  botToken: z.string().min(1),
  appToken: z.string().optional(),
  channelId: z.string().optional(),
});

const channelsSchema = z.object({
  telegram: telegramSchema.optional(),
  discord: discordSchema.optional(),
  slack: slackSchema.optional(),
}).optional();

const createSchema = z.object({
  name: z.string().min(1).max(50),
  provider: z.string().default("openrouter"),
  model: z.string().default("anthropic/claude-sonnet-4-6"),
  apiKey: z.string().optional(),
  // ZeroClaw identity
  agentName: z.string().min(1).max(50).default("ZeroClaw"),
  userName: z.string().max(50).optional(),
  timezone: z.string().default("UTC"),
  communicationStyle: z.string().max(500).optional(),
  // ZeroClaw memory
  memoryBackend: z.enum(["sqlite", "markdown", "none"]).default("sqlite"),
  autoSave: z.boolean().default(true),
  // ZeroClaw channels
  channels: channelsSchema,
});

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  agentName: z.string().min(1).max(50).optional(),
  userName: z.string().max(50).optional(),
  timezone: z.string().optional(),
  communicationStyle: z.string().max(500).optional(),
  memoryBackend: z.enum(["sqlite", "markdown", "none"]).optional(),
  autoSave: z.boolean().optional(),
  channels: channelsSchema,
});

const messageSchema = z.object({
  message: z.string().min(1).max(32000),
});

// ── Helpers ────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function generateUniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
  for (let i = 0; i <= 99; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i}`;
    const existing = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  throw new Error("Could not generate unique slug");
}

function toPublic(agent: typeof agents.$inferSelect) {
  // Strip raw secrets, decrypt channels for the client
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { encryptedToken, encryptedApiKey, encryptedChannels, containerId, ...pub } = agent;

  let channels: unknown = undefined;
  if (encryptedChannels) {
    try {
      channels = JSON.parse(decrypt(encryptedChannels));
    } catch {
      // ignore corrupt data
    }
  }

  return { ...pub, channels: channels ?? null };
}

async function getOwnedAgent(id: string, userId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)))
    .limit(1);
  return agent ?? null;
}

// ── GET /api/agents ────────────────────────────────────────────

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const result = await db.select().from(agents).where(eq(agents.userId, userId));
  res.json({ success: true, data: result.map(toPublic) });
});

// ── GET /api/agents/check-name?name=X ─────────────────────────

router.get("/check-name", async (req: AuthRequest, res) => {
  const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
  if (!name) {
    res.status(400).json({ success: false, error: "name is required" });
    return;
  }
  // Check globally — slugs/subdomains must be unique across all users
  const [existing] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(sql`lower(${agents.name}) = lower(${name})`)
    .limit(1);
  res.json({ success: true, data: { available: !existing } });
});

// ── GET /api/agents/:id ────────────────────────────────────────

router.get("/:id", async (req: AuthRequest, res) => {
  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) {
    res.status(404).json({ success: false, error: "Agent not found" });
    return;
  }
  res.json({ success: true, data: toPublic(agent) });
});

// ── POST /api/agents ── Create & Deploy ────────────────────────

router.post("/", async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const userId = req.user!.userId;

  // Check plan quota
  const [user] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) {
    res.status(401).json({ success: false, error: "User not found" });
    return;
  }

  const limits = PLAN_LIMITS[user.plan];
  const agentList = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.userId, userId));

  if (agentList.length >= limits.maxAgents) {
    const maxLabel = isFinite(limits.maxAgents) ? `${limits.maxAgents} agents max` : "unlimited";
    res.status(403).json({
      success: false,
      error: `Plan limit reached. Your ${user.plan} plan allows ${maxLabel}. Upgrade to create more agents.`,
    });
    return;
  }

  // Check duplicate name globally — all agents share the same subdomain namespace
  const { name: rawName } = parsed.data;
  const [duplicate] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(sql`lower(${agents.name}) = lower(${rawName})`)
    .limit(1);
  if (duplicate) {
    res.status(409).json({ success: false, error: `An agent named "${rawName}" already exists` });
    return;
  }

  const {
    name, provider, model, apiKey,
    agentName, userName, timezone, communicationStyle,
    memoryBackend, autoSave, channels,
  } = parsed.data;

  // Ollama doesn't need an API key; other providers do
  const needsKey = provider !== "ollama";
  if (needsKey && !apiKey?.trim()) {
    res.status(400).json({ success: false, error: "LLM API key is required for this provider" });
    return;
  }

  const slug = await generateUniqueSlug(name);
  const subdomain = `${slug}.${process.env.TRAEFIK_DOMAIN ?? "zeroonec.xyz"}`;

  // Create DB record first
  const [agent] = await db
    .insert(agents)
    .values({
      userId,
      name,
      slug,
      provider,
      model,
      agentName,
      userName: userName ?? null,
      timezone,
      communicationStyle: communicationStyle ?? null,
      memoryBackend,
      autoSave: String(autoSave),
      status: "PENDING",
      subdomain,
      encryptedApiKey: apiKey ? encrypt(apiKey) : null,
      encryptedChannels: channels ? encrypt(JSON.stringify(channels)) : null,
    })
    .returning();

  // Respond immediately — deploy runs in background
  res.status(202).json({ success: true, data: toPublic(agent) });

  // Background deploy
  (async () => {
    try {
      await db.update(agents).set({ status: "STARTING" }).where(eq(agents.id, agent.id));

      const { containerId, hostPort, bearerToken } = await deployAgent(
        {
          slug,
          apiKey: apiKey ?? "",
          provider,
          model,
          memoryLimit: limits.memoryLimit,
          cpuQuota: limits.cpuQuota,
        },
        {
          agentName,
          userName: userName ?? "User",
          timezone,
          communicationStyle: communicationStyle ??
            "Be warm, natural, and clear. Adapt to the situation.",
          memoryBackend,
          autoSave,
          channels: channels ?? undefined,
        }
      );

      await db.update(agents).set({
        containerId,
        containerPort: hostPort,
        encryptedToken: encrypt(bearerToken),
        status: "RUNNING",
        lastHealthAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(agents.id, agent.id));

      console.log(`[agent] ${slug} deployed — container ${containerId} port ${hostPort}`);
    } catch (err) {
      console.error(`[agent] Deploy failed for ${slug}:`, err);
      await db.update(agents).set({ status: "ERROR", updatedAt: new Date() }).where(eq(agents.id, agent.id));
    }
  })();
});

// ── PATCH /api/agents/:id ── Update agent settings ─────────────

router.patch("/:id", async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }

  const { name, agentName, userName, timezone, communicationStyle,
    memoryBackend, autoSave, channels } = parsed.data;

  // Check duplicate name when renaming (exclude current agent)
  if (name !== undefined && name !== agent.name) {
    const [dup] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.userId, req.user!.userId), eq(agents.name, name)))
      .limit(1);
    if (dup) {
      res.status(409).json({ success: false, error: `An agent named "${name}" already exists` });
      return;
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (agentName !== undefined) updates.agentName = agentName;
  if (userName !== undefined) updates.userName = userName;
  if (timezone !== undefined) updates.timezone = timezone;
  if (communicationStyle !== undefined) updates.communicationStyle = communicationStyle;
  if (memoryBackend !== undefined) updates.memoryBackend = memoryBackend;
  if (autoSave !== undefined) updates.autoSave = String(autoSave);
  if (channels !== undefined) {
    updates.encryptedChannels = channels ? encrypt(JSON.stringify(channels)) : null;
  }

  const [updated] = await db
    .update(agents)
    .set(updates as Parameters<typeof db.update>[0] extends (t: infer T) => unknown ? T : never)
    .where(eq(agents.id, agent.id))
    .returning();

  res.json({ success: true, data: toPublic(updated) });

  // If channels were updated and container is running, re-apply config + restart
  if (channels !== undefined && agent.containerId && agent.containerPort && agent.status === "RUNNING") {
    (async () => {
      try {
        const workspace: WorkspaceContext = {
          agentName: agentName ?? agent.agentName,
          userName: userName ?? agent.userName ?? "User",
          timezone: timezone ?? agent.timezone,
          communicationStyle: communicationStyle ?? agent.communicationStyle
            ?? "Be warm, natural, and clear. Adapt to the situation.",
          memoryBackend: memoryBackend ?? agent.memoryBackend,
          autoSave: autoSave !== undefined ? autoSave : agent.autoSave === "true",
          channels: channels ?? undefined,
        };

        await db.update(agents).set({ status: "STARTING", updatedAt: new Date() }).where(eq(agents.id, agent.id));

        await initWorkspace(agent.containerId!, workspace);

        const oldCode = await waitForPairingCode(agent.containerId!, 30_000);
        await restartContainer(agent.containerId!);

        const pairingCode = await waitForNewPairingCode(agent.containerId!, 45_000, oldCode);
        const { token } = await pairAgent(
          containerConnectHost(agent.slug),
          containerConnectPort(agent.containerPort!),
          pairingCode
        );

        await db.update(agents).set({
          encryptedToken: encrypt(token),
          status: "RUNNING",
          lastHealthAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(agents.id, agent.id));

        console.log(`[agent] ${agent.slug} restarted after channel config update`);
      } catch (err) {
        console.error(`[agent] Restart failed after channel update for ${agent.slug}:`, err);
        await db.update(agents).set({ status: "ERROR", updatedAt: new Date() }).where(eq(agents.id, agent.id));
      }
    })();
  }
});

// ── POST /api/agents/:id/stop ──────────────────────────────────

router.post("/:id/stop", async (req: AuthRequest, res) => {
  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }
  if (!agent.containerId) { res.status(400).json({ success: false, error: "No container" }); return; }

  await db.update(agents).set({ status: "STOPPING", updatedAt: new Date() }).where(eq(agents.id, agent.id));
  await stopContainer(agent.containerId);
  await db.update(agents).set({ status: "STOPPED", updatedAt: new Date() }).where(eq(agents.id, agent.id));

  res.json({ success: true, data: { status: "STOPPED" } });
});

// ── POST /api/agents/:id/start ─────────────────────────────────

router.post("/:id/start", async (req: AuthRequest, res) => {
  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }
  if (!agent.containerId) { res.status(400).json({ success: false, error: "No container" }); return; }

  res.status(202).json({ success: true, data: { status: "STARTING" } });

  (async () => {
    try {
      await db.update(agents).set({ status: "STARTING", updatedAt: new Date() }).where(eq(agents.id, agent.id));
      await startContainer(agent.containerId!);

      const pairingCode = await waitForPairingCode(agent.containerId!, 45_000);
      const { token } = await pairAgent(
        containerConnectHost(agent.slug),
        containerConnectPort(agent.containerPort!),
        pairingCode
      );

      await db.update(agents).set({
        encryptedToken: encrypt(token),
        status: "RUNNING",
        lastHealthAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(agents.id, agent.id));
    } catch (err) {
      console.error(`[agent] Start failed for ${agent.slug}:`, err);
      await db.update(agents).set({ status: "ERROR", updatedAt: new Date() }).where(eq(agents.id, agent.id));
    }
  })();
});

// ── POST /api/agents/:id/restart ──────────────────────────────

router.post("/:id/restart", async (req: AuthRequest, res) => {
  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }
  if (!agent.containerId) { res.status(400).json({ success: false, error: "No container" }); return; }

  res.status(202).json({ success: true, data: { status: "STARTING" } });

  (async () => {
    try {
      await db.update(agents).set({ status: "STARTING", updatedAt: new Date() }).where(eq(agents.id, agent.id));
      const oldCode = await waitForPairingCode(agent.containerId!, 30_000);
      await restartContainer(agent.containerId!);

      const pairingCode = await waitForNewPairingCode(agent.containerId!, 45_000, oldCode);
      const { token } = await pairAgent(
        containerConnectHost(agent.slug),
        containerConnectPort(agent.containerPort!),
        pairingCode
      );

      await db.update(agents).set({
        encryptedToken: encrypt(token),
        status: "RUNNING",
        lastHealthAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(agents.id, agent.id));
    } catch (err) {
      console.error(`[agent] Restart failed for ${agent.slug}:`, err);
      await db.update(agents).set({ status: "ERROR", updatedAt: new Date() }).where(eq(agents.id, agent.id));
    }
  })();
});

// ── DELETE /api/agents/:id ─────────────────────────────────────

router.delete("/:id", async (req: AuthRequest, res) => {
  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }

  if (agent.containerId) await removeContainer(agent.containerId);
  await db.delete(agents).where(eq(agents.id, agent.id));

  res.json({ success: true, data: { deleted: true } });
});

// ── POST /api/agents/:id/message ──── Message Proxy ────────────

router.post("/:id/message", async (req: AuthRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }
  if (agent.status !== "RUNNING") {
    res.status(409).json({ success: false, error: `Agent is ${agent.status}` });
    return;
  }
  if (!agent.encryptedToken || !agent.containerPort) {
    res.status(409).json({ success: false, error: "Agent not ready" });
    return;
  }

  const token = decrypt(agent.encryptedToken);
  const response = await sendMessage(
    containerConnectHost(agent.slug),
    containerConnectPort(agent.containerPort),
    token,
    parsed.data.message
  );
  res.json({ success: true, data: response });
});

// ── GET /api/agents/:id/logs ───────────────────────────────────

router.get("/:id/logs", async (req: AuthRequest, res) => {
  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }
  if (!agent.containerId) { res.status(400).json({ success: false, error: "No container" }); return; }

  const tail = parseInt(req.query.tail as string) || 200;
  const lines = await getContainerLogs(agent.containerId, tail);
  res.json({ success: true, data: { logs: lines } });
});

// ── GET /api/agents/:id/stats ──────────────────────────────────

router.get("/:id/stats", async (req: AuthRequest, res) => {
  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }
  if (!agent.containerId || agent.status !== "RUNNING") {
    res.status(400).json({ success: false, error: "Agent not running" });
    return;
  }

  const stats = await getContainerStats(agent.containerId);
  res.json({ success: true, data: stats });
});

// ── GET /api/agents/:id/dashboard-token ───────────────────────

router.get("/:id/dashboard-token", async (req: AuthRequest, res) => {
  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }
  if (!agent.encryptedToken) {
    res.status(409).json({ success: false, error: "Agent not paired yet" });
    return;
  }
  const token = decrypt(agent.encryptedToken);
  res.json({ success: true, data: { token } });
});

// ── GET /api/agents/:id/health ─────────────────────────────────

router.get("/:id/health", async (req: AuthRequest, res) => {
  const agent = await getOwnedAgent(p(req.params.id), req.user!.userId);
  if (!agent) { res.status(404).json({ success: false, error: "Agent not found" }); return; }
  if (!agent.containerPort) { res.status(400).json({ success: false, error: "No container port" }); return; }

  const healthy = await checkHealth(
    containerConnectHost(agent.slug),
    containerConnectPort(agent.containerPort)
  );
  if (healthy) {
    await db.update(agents).set({ lastHealthAt: new Date(), updatedAt: new Date() }).where(eq(agents.id, agent.id));
  }
  res.json({ success: true, data: { healthy } });
});

export default router;
