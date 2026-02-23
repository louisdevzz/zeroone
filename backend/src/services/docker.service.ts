import Dockerode from "dockerode";
import { pairAgent, checkHealth } from "./zeroclaw.service";

const docker = new Dockerode({
  socketPath: process.env.DOCKER_SOCKET ?? "/var/run/docker.sock",
});

const ZEROCLAW_IMAGE = process.env.ZEROCLAW_IMAGE ?? "ghcr.io/louisdevzz/zeroclaw:latest";
const TRAEFIK_DOMAIN = process.env.TRAEFIK_DOMAIN ?? "zeroonec.xyz";
const NETWORK_NAME = process.env.DOCKER_NETWORK ?? "zeroone-net";

// IS_DOCKER: true when the backend itself runs inside a Docker container on the same network
// as the agents (production). Use BACKEND_IN_DOCKER=true to opt-in explicitly.
// Defaults to false so local dev (backend on host, agents in Docker) always uses 127.0.0.1.
const IS_DOCKER = process.env.BACKEND_IN_DOCKER === "true";

export function containerConnectHost(slug: string): string {
  return IS_DOCKER ? `zeroclaw-${slug}` : "127.0.0.1";
}

export function containerConnectPort(hostPort: number): number {
  return IS_DOCKER ? 42617 : hostPort;
}

// ── Port management ────────────────────────────────────────────

/** Find a free host port in range 40000–50000. */
export async function findFreePort(): Promise<number> {
  const containers = await docker.listContainers({ all: true });
  const usedPorts = new Set<number>();

  for (const c of containers) {
    for (const p of c.Ports ?? []) {
      if (p.PublicPort) usedPorts.add(p.PublicPort);
    }
  }

  for (let port = 40000; port <= 50000; port++) {
    if (!usedPorts.has(port)) return port;
  }
  throw new Error("No free ports available in range 40000–50000");
}

// ── Container creation ─────────────────────────────────────────

export interface CreateContainerOptions {
  slug: string;
  apiKey: string;
  provider: string;
  model: string;
  hostPort: number;
  memoryLimit?: string; // e.g. "128m"
  cpuQuota?: number;    // 0.0 – 2.0 (multiplied by 1e9 for Docker nano-CPUs)
}

export async function createAgentContainer(opts: CreateContainerOptions): Promise<string> {
  const containerName = `zeroclaw-${opts.slug}`;
  const memoryBytes = parseMem(opts.memoryLimit ?? "128m");
  const nanoCpus = Math.round((opts.cpuQuota ?? 0.5) * 1e9);

  const container = await docker.createContainer({
    name: containerName,
    Image: ZEROCLAW_IMAGE,
    Cmd: ["daemon"],
    Env: [
      `API_KEY=${opts.apiKey}`,
      `PROVIDER=${opts.provider}`,
      `ZEROCLAW_MODEL=${opts.model}`,
      `ZEROCLAW_ALLOW_PUBLIC_BIND=true`,
      `ZEROCLAW_GATEWAY_PORT=42617`,
      `HOME=/zeroclaw-data`,
      `ZEROCLAW_WORKSPACE=/zeroclaw-data/workspace`,
    ],
    ExposedPorts: { "42617/tcp": {} },
    HostConfig: {
      PortBindings: {
        "42617/tcp": [{ HostIp: "0.0.0.0", HostPort: String(opts.hostPort) }],
      },
      Memory: memoryBytes,
      NanoCpus: nanoCpus,
      RestartPolicy: { Name: "unless-stopped" },
      NetworkMode: NETWORK_NAME,
    },
    Labels: {
      "traefik.enable": "true",
      [`traefik.http.routers.${opts.slug}.rule`]: `Host(\`${opts.slug}.${TRAEFIK_DOMAIN}\`)`,
      [`traefik.http.routers.${opts.slug}.entrypoints`]: "websecure",
      [`traefik.http.routers.${opts.slug}.tls.certresolver`]: "letsencrypt",
      [`traefik.http.services.${opts.slug}.loadbalancer.server.port`]: "42617",
      "managed-by": "zeroone",
      "agent-slug": opts.slug,
    },
    Volumes: {
      "/zeroclaw-data": {},
    },
  });

  return container.id;
}

export async function startContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.start();
}

export async function stopContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.stop({ t: 10 }).catch(() => {}); // ignore if already stopped
}

export async function removeContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.remove({ force: true }).catch(() => {});
}

export async function restartContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.restart({ t: 10 });
}

// ── Workspace initialization ───────────────────────────────────

export interface ChannelsContext {
  telegram?: { botToken: string; allowedUsers?: string[] };
  discord?: { botToken: string; guildId?: string; allowedUsers?: string[] };
  slack?: { botToken: string; appToken?: string; channelId?: string };
}

export interface WorkspaceContext {
  agentName: string;
  userName: string;
  timezone: string;
  communicationStyle: string;
  memoryBackend: string;
  autoSave: boolean;
  channels?: ChannelsContext;
}

/**
 * Build a minimal POSIX tar buffer from a list of files.
 * Used to copy files into a container via putArchive (docker cp) —
 * which works even when the container image has no shell.
 */
function buildTar(files: Array<{ name: string; content: string }>): Buffer {
  const parts: Buffer[] = [];

  for (const { name, content } of files) {
    const data = Buffer.from(content, "utf8");
    const size = data.length;

    // 512-byte USTAR header
    const hdr = Buffer.alloc(512, 0);

    // name (0–99)
    hdr.write(name.slice(0, 100), 0, "utf8");
    // mode (100–107)
    hdr.write("0000644\0", 100, "ascii");
    // uid, gid (108–123)
    hdr.write("0000000\0", 108, "ascii");
    hdr.write("0000000\0", 116, "ascii");
    // size in octal (124–135)
    hdr.write(size.toString(8).padStart(11, "0") + "\0", 124, "ascii");
    // mtime in octal (136–147)
    hdr.write(
      Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0",
      136, "ascii",
    );
    // checksum placeholder = 8 spaces (148–155)
    hdr.fill(0x20, 148, 156);
    // typeflag '0' = regular file (156)
    hdr[156] = 0x30;
    // USTAR magic (257–264)
    hdr.write("ustar  \0", 257, "ascii");

    // Compute checksum over header with spaces in checksum field
    let chk = 0;
    for (let i = 0; i < 512; i++) chk += hdr[i];
    hdr.write(chk.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");

    parts.push(hdr);

    // File data padded to 512-byte boundary
    if (size > 0) {
      const padded = Buffer.alloc(Math.ceil(size / 512) * 512, 0);
      data.copy(padded);
      parts.push(padded);
    }
  }

  // End-of-archive: two 512-byte zero blocks
  parts.push(Buffer.alloc(1024, 0));
  return Buffer.concat(parts);
}

/**
 * Write ZeroClaw identity/config files into the container workspace
 * using docker cp (putArchive). Works with scratch/distroless images
 * that have no shell — no exec required.
 */
export async function initWorkspace(
  containerId: string,
  ctx: WorkspaceContext
): Promise<void> {
  const agent = ctx.agentName || "ZeroClaw";
  const user = ctx.userName || "User";
  const tz = ctx.timezone || "UTC";
  const style = ctx.communicationStyle ||
    "Be warm, natural, and clear. Adapt to the situation.";

  // ── Build config.toml ────────────────────────────────────────
  // Correct section: [channels_config.telegram] (not [channels.telegram])
  const tomlLines = [
    `default_temperature = 0.7`,
    ``,
    `[memory]`,
    `backend = "${ctx.memoryBackend}"`,
    `auto_save = ${ctx.autoSave}`,
    ``,
    `[gateway]`,
    `port = 42617`,
    `host = "0.0.0.0"`,
    `allow_public_bind = true`,
    ``,
    `[channels_config]`,
    `cli = true`,
  ];

  const ch = ctx.channels;
  if (ch?.telegram) {
    const users = (ch.telegram.allowedUsers ?? []).map((u) => `"${u}"`).join(", ");
    tomlLines.push("", "[channels_config.telegram]");
    tomlLines.push(`bot_token = "${ch.telegram.botToken}"`);
    if (users) tomlLines.push(`allowed_users = [${users}]`);
  }
  if (ch?.discord) {
    const users = (ch.discord.allowedUsers ?? []).map((u) => `"${u}"`).join(", ");
    tomlLines.push("", "[channels_config.discord]");
    tomlLines.push(`bot_token = "${ch.discord.botToken}"`);
    if (ch.discord.guildId) tomlLines.push(`guild_id = "${ch.discord.guildId}"`);
    if (users) tomlLines.push(`allowed_users = [${users}]`);
  }
  if (ch?.slack) {
    tomlLines.push("", "[channels_config.slack]");
    tomlLines.push(`bot_token = "${ch.slack.botToken}"`);
    if (ch.slack.appToken) tomlLines.push(`app_token = "${ch.slack.appToken}"`);
    if (ch.slack.channelId) tomlLines.push(`channel_id = "${ch.slack.channelId}"`);
  }

  const toml = tomlLines.join("\n");

  // ── Build identity / persona files ───────────────────────────
  const identity = [
    `# IDENTITY.md — Who Am I?`,
    ``,
    `- **Name:** ${agent}`,
    `- **Creature:** A Rust-forged AI — fast, lean, and relentless`,
    `- **Vibe:** Sharp, direct, resourceful. Not corporate. Not a chatbot.`,
    ``,
    `---`,
    ``,
    `Update this file as you evolve. Your identity is yours to shape.`,
  ].join("\n");

  const userMd = [
    `# USER.md — Who Am I Helping?`,
    ``,
    `- **Name:** ${user}`,
    `- **Timezone:** ${tz}`,
    ``,
    `## Communication Style`,
    ``,
    style,
  ].join("\n");

  const soul = [
    `# SOUL.md — How I Communicate`,
    ``,
    style,
  ].join("\n");

  // ── Write files via docker cp (no shell required) ─────────────
  const tarBuf = buildTar([
    { name: ".zeroclaw/config.toml",   content: toml },
    { name: "workspace/IDENTITY.md",   content: identity },
    { name: "workspace/USER.md",       content: userMd },
    { name: "workspace/SOUL.md",       content: soul },
  ]);

  const container = docker.getContainer(containerId);
  await new Promise<void>((resolve, reject) => {
    (container.putArchive as (
      file: Buffer,
      opts: { path: string },
      cb: (err: Error | null) => void
    ) => void)(tarBuf, { path: "/zeroclaw-data" }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log(`[docker] Workspace files written to container ${containerId}`);
}

// ── Log streaming / pairing code extraction ────────────────────

const PAIRING_CODE_RE = /X-Pairing-Code:\s*(\d{6})/g;
// Also match the box format: │  123456  │
const PAIRING_BOX_RE = /│\s+(\d{6})\s+│/g;

/**
 * Wait for the ZeroClaw container to print its 6-digit pairing code.
 * Polls container logs every 500ms up to `timeoutMs`.
 */
export async function waitForPairingCode(
  containerId: string,
  timeoutMs = 30_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const lines = await getContainerLogs(containerId, 100);
    const logs = lines.join("\n");

    const all = [...logs.matchAll(PAIRING_CODE_RE), ...logs.matchAll(PAIRING_BOX_RE)];
    if (all.length > 0) return all[all.length - 1][1];

    await sleep(500);
  }

  throw new Error("Timed out waiting for ZeroClaw pairing code");
}

/**
 * After a container restart, wait for a NEW pairing code that differs from oldCode.
 * This avoids the Math.floor timestamp truncation issue where the Docker `since` filter
 * includes the old code because the first and second startup happen in the same Unix second.
 */
export async function waitForNewPairingCode(
  containerId: string,
  timeoutMs: number,
  oldCode: string,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const lines = await getContainerLogs(containerId, 100);
    const logs = lines.join("\n");
    const all = [...logs.matchAll(PAIRING_CODE_RE), ...logs.matchAll(PAIRING_BOX_RE)];
    if (all.length > 0) {
      const latest = all[all.length - 1][1];
      if (latest !== oldCode) return latest;
    }
    await sleep(500);
  }

  throw new Error("Timed out waiting for new ZeroClaw pairing code after restart");
}

/**
 * Parse Docker's multiplexed log buffer into clean lines.
 * Docker prepends each chunk with an 8-byte header:
 *   [stream_type(1), padding(3), size_big_endian(4)]
 * We strip those and split into individual log lines.
 */
function parseDockerlogs(buf: Buffer): string[] {
  const lines: string[] = [];
  let offset = 0;

  while (offset + 8 <= buf.length) {
    // stream type: 1 = stdout, 2 = stderr (we keep both)
    const size = buf.readUInt32BE(offset + 4);
    offset += 8;
    if (size === 0) continue;
    if (offset + size > buf.length) break;

    const chunk = buf.slice(offset, offset + size).toString("utf8");
    offset += size;

    // Split chunk into lines, filter empty
    for (const line of chunk.split("\n")) {
      const clean = line.replace(/\r$/, "").trimEnd();
      if (clean) lines.push(clean);
    }
  }

  // Fallback: if no headers found (plain text), just split by newline
  if (lines.length === 0 && buf.length > 0) {
    return buf
      .toString("utf8")
      .split("\n")
      .map((l) => l.replace(/\r$/, "").trimEnd())
      .filter(Boolean);
  }

  return lines;
}

export async function getContainerLogs(
  containerId: string,
  tail: number | "all" = "all",
  since?: number  // Unix timestamp — only return logs after this time
): Promise<string[]> {
  const container = docker.getContainer(containerId);
  const logsBuffer = (await container.logs({
    stdout: true,
    stderr: true,
    tail: tail === "all" ? undefined : tail,
    ...(since !== undefined ? { since } : {}),
  })) as Buffer;
  return parseDockerlogs(logsBuffer);
}

// ── Stats ──────────────────────────────────────────────────────

export interface ContainerStats {
  memoryMb: number;
  cpuPercent: number;
}

export async function getContainerStats(containerId: string): Promise<ContainerStats> {
  const container = docker.getContainer(containerId);
  const stats = (await container.stats({ stream: false })) as DockerStats;

  const memoryMb = stats.memory_stats.usage / 1024 / 1024;

  // CPU % calculation
  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta =
    stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numCpus = stats.cpu_stats.online_cpus ?? 1;
  const cpuPercent =
    systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

  return { memoryMb: Math.round(memoryMb * 10) / 10, cpuPercent: Math.round(cpuPercent * 10) / 10 };
}

// ── Network ────────────────────────────────────────────────────

/** Ensure the zeroone Docker network exists. */
export async function ensureNetwork(): Promise<void> {
  const networks = await docker.listNetworks({ filters: { name: [NETWORK_NAME] } });
  if (networks.length === 0) {
    await docker.createNetwork({ Name: NETWORK_NAME, Driver: "bridge" });
    console.log(`[docker] Created network: ${NETWORK_NAME}`);
  }
}

// ── Image management ───────────────────────────────────────────

/** Pull image if not present locally. */
export async function ensureImage(image: string = ZEROCLAW_IMAGE): Promise<void> {
  try {
    await docker.getImage(image).inspect();
    console.log(`[docker] Image already present: ${image}`);
  } catch {
    console.log(`[docker] Pulling image: ${image} …`);
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err2: Error | null) => {
          if (err2) return reject(err2);
          console.log(`[docker] Pull complete: ${image}`);
          resolve();
        });
      });
    });
  }
}

// ── Full deploy flow ───────────────────────────────────────────

export interface DeployResult {
  containerId: string;
  hostPort: number;
  bearerToken: string;
}

/**
 * Full deploy flow:
 * 1. Find free port
 * 2. Create + start container
 * 3. Init workspace (IDENTITY.md, USER.md, SOUL.md, config.toml)
 * 4. Wait for pairing code in logs
 * 5. Pair → get bearer token
 * 6. Health check
 */
export async function deployAgent(
  opts: Omit<CreateContainerOptions, "hostPort">,
  workspace?: WorkspaceContext
): Promise<DeployResult> {
  await ensureNetwork();
  await ensureImage();

  const hostPort = await findFreePort();
  const containerId = await createAgentContainer({ ...opts, hostPort });

  await startContainer(containerId);

  let pairingCode: string;

  if (workspace) {
    // Wait briefly for the Docker volume to be fully mounted before writing
    await sleep(500);
    await initWorkspace(containerId, workspace).catch((err) => {
      console.warn("[docker] initWorkspace warning:", err);
    });

    // Get the current pairing code before restart so we can detect the new one after.
    // This avoids the Math.floor timestamp truncation issue where Docker's `since` filter
    // includes the old code because both codes appear in the same Unix second.
    const oldCode = await waitForPairingCode(containerId, 30_000);
    console.log(`[docker] Got pre-restart pairing code: ${oldCode}`);

    // ZeroClaw reads config.toml at startup — before we wrote it.
    // Restart so it picks up the channels config we just wrote.
    await restartContainer(containerId);
    console.log("[docker] Restarted container after workspace init");

    // Wait for a DIFFERENT pairing code — unambiguously the post-restart one.
    pairingCode = await waitForNewPairingCode(containerId, 45_000, oldCode);
  } else {
    pairingCode = await waitForPairingCode(containerId, 45_000);
  }

  // Pair with gateway — use container hostname when running in Docker
  const connectHost = containerConnectHost(opts.slug);
  const connectPort = containerConnectPort(hostPort);
  const { token } = await pairAgent(connectHost, connectPort, pairingCode);

  // Confirm health
  const healthy = await pollHealth(connectHost, connectPort, 15_000);
  if (!healthy) throw new Error("Container started but /health check failed");

  return { containerId, hostPort, bearerToken: token };
}

async function pollHealth(host: string, port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkHealth(host, port)) return true;
    await sleep(1000);
  }
  return false;
}

// ── Helpers ────────────────────────────────────────────────────

function parseMem(limit: string): number {
  const n = parseInt(limit);
  if (limit.endsWith("g")) return n * 1024 * 1024 * 1024;
  if (limit.endsWith("m")) return n * 1024 * 1024;
  if (limit.endsWith("k")) return n * 1024;
  return n;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Minimal typing for Docker stats response
interface DockerStats {
  memory_stats: { usage: number };
  cpu_stats: {
    cpu_usage: { total_usage: number };
    system_cpu_usage: number;
    online_cpus?: number;
  };
  precpu_stats: {
    cpu_usage: { total_usage: number };
    system_cpu_usage: number;
  };
}
