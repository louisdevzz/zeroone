/**
 * Test script — chạy trước khi test qua website.
 * Usage: pnpm test:agent [--skip-pull]
 *
 * Tests từng bước:
 *   1. Docker daemon reachable
 *   2. Pull ZeroClaw image (nếu chưa có)
 *   3. Tạo network zeroone-net
 *   4. Start container
 *   5. Đọc pairing code từ logs
 *   6. POST /pair → bearer token
 *   7. GET /health
 *   8. POST /webhook (gửi message)
 *   9. Cleanup container
 */

import Dockerode from "dockerode";
import { config } from "dotenv";

config();

const IMAGE = process.env.ZEROCLAW_IMAGE ?? "ghcr.io/zeroclaw-labs/zeroclaw:latest";
const NETWORK = process.env.DOCKER_NETWORK ?? "zeroone-net";
const HOST_PORT = 49999;
const GATEWAY_PORT = 42617;
const SKIP_PULL = process.argv.includes("--skip-pull");

const docker = new Dockerode({
  socketPath: process.env.DOCKER_SOCKET ?? "/var/run/docker.sock",
});

const PAIRING_RE = /X-Pairing-Code:\s*(\d{6})/;
const PAIRING_BOX_RE = /│\s+(\d{6})\s+│/;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ok(msg: string) {
  console.log(`  ✓  ${msg}`);
}

function step(n: number, msg: string) {
  console.log(`\n[${n}] ${msg}`);
}

function fail(msg: string, err?: unknown) {
  console.error(`  ✗  ${msg}`);
  if (err) console.error(err);
  process.exit(1);
}

// ── Main ────────────────────────────────────────────────────────

let containerId: string | null = null;

async function cleanup() {
  if (containerId) {
    console.log("\n[cleanup] Removing test container…");
    const c = docker.getContainer(containerId);
    await c.stop({ t: 5 }).catch(() => {});
    await c.remove({ force: true }).catch(() => {});
    ok("Container removed");
    containerId = null;
  }
}

process.on("SIGINT", async () => { await cleanup(); process.exit(0); });

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  ZeroOne · Agent Deploy Test Script   ");
  console.log("═══════════════════════════════════════");
  console.log(`  Image  : ${IMAGE}`);
  console.log(`  Port   : ${HOST_PORT}`);
  console.log(`  Network: ${NETWORK}`);

  // 1. Docker daemon
  step(1, "Docker daemon connectivity");
  try {
    const info = await docker.info();
    ok(`Docker ${info.ServerVersion} · Containers: ${info.Containers}`);
  } catch (err) {
    fail("Cannot reach Docker daemon. Is Docker running?", err);
  }

  // 2. Pull image
  step(2, `Image: ${IMAGE}`);
  if (SKIP_PULL) {
    console.log("  ⟳  --skip-pull passed, checking local only…");
  }
  try {
    await docker.getImage(IMAGE).inspect();
    ok("Image already present locally");
  } catch {
    if (SKIP_PULL) fail("Image not found locally and --skip-pull was set");
    console.log("  ⟳  Pulling image (this may take a minute)…");
    await new Promise<void>((resolve, reject) => {
      docker.pull(IMAGE, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(
          stream,
          (err2: Error | null) => (err2 ? reject(err2) : resolve()),
          (event: { status: string; progress?: string }) => {
            if (event.progress) process.stdout.write(`\r  ⟳  ${event.status} ${event.progress}   `);
          }
        );
      });
    });
    process.stdout.write("\n");
    ok("Image pulled");
  }

  // 3. Network
  step(3, `Network: ${NETWORK}`);
  const nets = await docker.listNetworks({ filters: { name: [NETWORK] } });
  if (nets.length === 0) {
    await docker.createNetwork({ Name: NETWORK, Driver: "bridge" });
    ok("Network created");
  } else {
    ok("Network already exists");
  }

  // 4. Create + start container
  step(4, "Create & start container");

  // Clean up leftover test container
  try {
    const old = docker.getContainer("zeroclaw-test-agent");
    await old.remove({ force: true });
    console.log("  ⟳  Removed leftover test container");
  } catch { /* no leftover */ }

  let container: Dockerode.Container;
  try {
    container = await docker.createContainer({
      name: "zeroclaw-test-agent",
      Image: IMAGE,
      Cmd: ["gateway"],
      Env: [
        "PROVIDER=openai",
        "ZEROCLAW_MODEL=gpt-4o-mini",
        "API_KEY=test-key-not-real",
        "ZEROCLAW_ALLOW_PUBLIC_BIND=true",
        `ZEROCLAW_GATEWAY_PORT=${GATEWAY_PORT}`,
        "HOME=/zeroclaw-data",
        "ZEROCLAW_WORKSPACE=/zeroclaw-data/workspace",
      ],
      ExposedPorts: { [`${GATEWAY_PORT}/tcp`]: {} },
      HostConfig: {
        PortBindings: {
          [`${GATEWAY_PORT}/tcp`]: [{ HostIp: "127.0.0.1", HostPort: String(HOST_PORT) }],
        },
        Memory: 64 * 1024 * 1024,
        NetworkMode: NETWORK,
      },
    });
    containerId = container.id;
    ok(`Container created: ${container.id.slice(0, 12)}`);
  } catch (err) {
    fail("Failed to create container", err);
    return;
  }

  await container!.start();
  ok("Container started");

  // 5. Pairing code
  step(5, "Wait for pairing code in logs (up to 30s)");
  let pairingCode: string | null = null;
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const buf = await container!.logs({ stdout: true, stderr: true, tail: 200 });
    const logs = buf.toString("utf8");
    const m = PAIRING_RE.exec(logs) ?? PAIRING_BOX_RE.exec(logs);
    if (m) { pairingCode = m[1]; break; }
    process.stdout.write("  ⟳  Waiting for ZeroClaw to print pairing code…\r");
    await sleep(500);
  }
  process.stdout.write("\n");

  if (!pairingCode) {
    // Print last logs to help debug
    const buf = await container!.logs({ stdout: true, stderr: true, tail: 50 });
    console.error("\n--- Last 50 log lines ---");
    console.error(buf.toString("utf8"));
    console.error("-------------------------");
    await cleanup();
    fail("Timed out waiting for pairing code");
    return;
  }
  ok(`Pairing code: ${pairingCode}`);

  // 6. POST /pair
  step(6, `POST http://127.0.0.1:${HOST_PORT}/pair`);
  let bearerToken: string;
  try {
    const res = await fetch(`http://127.0.0.1:${HOST_PORT}/pair`, {
      method: "POST",
      headers: { "X-Pairing-Code": pairingCode },
    });
    const json = (await res.json()) as { token?: string };
    if (!res.ok || !json.token) throw new Error(JSON.stringify(json));
    bearerToken = json.token;
    ok(`Bearer token: ${bearerToken.slice(0, 20)}…`);
  } catch (err) {
    await cleanup();
    fail("POST /pair failed", err);
    return;
  }

  // 7. GET /health
  step(7, `GET http://127.0.0.1:${HOST_PORT}/health`);
  try {
    const res = await fetch(`http://127.0.0.1:${HOST_PORT}/health`);
    const json = await res.json();
    ok(`Health: ${JSON.stringify(json)}`);
  } catch (err) {
    await cleanup();
    fail("GET /health failed", err);
    return;
  }

  // 8. POST /webhook
  step(8, `POST http://127.0.0.1:${HOST_PORT}/webhook`);
  try {
    const res = await fetch(`http://127.0.0.1:${HOST_PORT}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ message: "Say hello in one word." }),
    });
    const text = await res.text();
    ok(`Response (${res.status}): ${text.slice(0, 120)}`);
  } catch (err) {
    console.warn(`  ⚠  POST /webhook failed (API key is fake — expected): ${err}`);
  }

  // 9. Cleanup
  step(9, "Cleanup");
  await cleanup();

  console.log("\n═══════════════════════════════════════");
  console.log("  All steps passed! ZeroClaw works.    ");
  console.log("═══════════════════════════════════════\n");
}

main().catch(async (err) => {
  console.error("Unexpected error:", err);
  await cleanup();
  process.exit(1);
});
