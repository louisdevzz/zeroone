/**
 * ZeroClaw Gateway client.
 * Handles: pairing handshake, health check, webhook message proxy.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

function agentUrl(host: string, port: number, path: string): string {
  return `http://${host}:${port}${path}`;
}

// ── Health ─────────────────────────────────────────────────────

export async function checkHealth(host: string, port: number): Promise<boolean> {
  try {
    const res = await fetch(agentUrl(host, port, "/health"), {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Pairing ────────────────────────────────────────────────────

export interface PairResult {
  token: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Exchange the 6-digit pairing code for a bearer token.
 * ZeroClaw prints the code to stdout before its HTTP server is fully ready,
 * so we retry with exponential backoff to handle that race condition.
 */
export async function pairAgent(
  host: string,
  port: number,
  pairingCode: string,
  maxRetries = 10
): Promise<PairResult> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(agentUrl(host, port, "/pair"), {
        method: "POST",
        headers: { "X-Pairing-Code": pairingCode },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Pairing failed (${res.status}): ${body}`);
      }

      const data = (await res.json()) as { token?: string };
      if (!data.token) throw new Error("Pairing response missing token");

      return { token: data.token };
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * attempt, 5000);
        console.log(`[zeroclaw] pairAgent attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastErr;
}

// ── Webhook (message proxy) ────────────────────────────────────

export interface WebhookResponse {
  response?: string;
  [key: string]: unknown;
}

export async function sendMessage(
  host: string,
  port: number,
  bearerToken: string,
  message: string
): Promise<WebhookResponse> {
  const res = await fetch(agentUrl(host, port, "/webhook"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({ message }),
    signal: AbortSignal.timeout(60_000), // agents can take time
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Webhook failed (${res.status}): ${body}`);
  }

  return (await res.json()) as WebhookResponse;
}
