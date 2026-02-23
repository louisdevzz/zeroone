# AGENTS.md — ZeroOne Agent System Design

> Defines the agent model, lifecycle, configuration, orchestration logic, and runtime behavior for the ZCaaS platform.
> Based on the actual ZeroClaw runtime: a Rust binary that exposes a Gateway HTTP API.

---

## What is a ZeroClaw Agent Instance?

A **ZeroClaw Agent** in ZeroOne is a Docker container running the official image:

```
ghcr.io/zeroclaw-labs/zeroclaw:latest
Cmd: ["gateway"]
Port: 42617
```

Each instance:
- Consumes ~5MB base RAM (Rust binary)
- Exposes a secure HTTP Gateway API on port 42617
- Requires a one-time pairing handshake before accepting messages
- Stores memory in SQLite (default) or Markdown files
- Supports 15+ AI providers: OpenRouter, OpenAI, Anthropic, Ollama, Groq, etc.
- Supports messaging channels: Telegram, Discord, Slack, Webhook

> **Note:** The container image is scratch/distroless — there is no shell (`sh`/`bash`).
> All file writes into the container use `docker cp` (Dockerode `putArchive`).

---

## ZeroClaw Gateway API (Integration Surface)

| Endpoint | Method | Auth | Body | Description |
|----------|--------|------|------|-------------|
| `/health` | GET | None | — | `{ "status": "ok" }` |
| `/pair` | POST | `X-Pairing-Code: <6-digit>` | — | Returns `{ "token": "..." }` |
| `/webhook` | POST | `Authorization: Bearer <token>` | `{ "message": "..." }` | Send prompt, get response |

### Pairing Security Model

```
Container starts
      │
      ▼
ZeroClaw prints 6-digit pairing code to stdout (one-time, expires after use)
      │   Format: "X-Pairing-Code: 123456"  or  "│  123456  │" (box format)
      ▼
Backend reads Docker container logs → extracts pairing code
      │   Regex: /X-Pairing-Code:\s*(\d{6})/  or  /│\s+(\d{6})\s+│/
      ▼
POST /pair  { headers: { "X-Pairing-Code": "123456" } }
      │
      ▼
Response: { "token": "eyJ..." }   ← bearer token (valid until restart)
      │
      ▼
Backend AES-256-GCM encrypts token → stores as encryptedToken in DB
      │
      ▼
All future requests: POST /webhook  { Authorization: Bearer eyJ... }
```

> **Every container restart generates a new pairing code.**
> The orchestrator must re-pair and update `encryptedToken` on every restart.
> Always pass `since: Date` to `waitForPairingCode()` after a restart to avoid
> matching old codes still in the log buffer.

---

## Agent Configuration (ZeroClaw TOML)

Written to `/zeroclaw-data/.zeroclaw/config.toml` via `docker cp` before restart.

```toml
default_temperature = 0.7

[memory]
backend = "sqlite"    # sqlite | markdown | none
auto_save = true

[gateway]
port = 42617

[channels_config]
cli = true            # keep CLI always enabled

# Optional channels — only included when configured by user:

[channels_config.telegram]
bot_token = "123456:ABC-DEF..."
allowed_users = ["@alice", "123456789"]   # empty = allow all

[channels_config.discord]
bot_token = "MTk4NjIy..."
guild_id = "123456789012345678"           # optional, restrict to one server
allowed_users = []

[channels_config.slack]
bot_token = "xoxb-..."
app_token = "xapp-..."                    # optional, for Socket Mode
channel_id = "C1234567890"               # optional
```

Identity and persona files written to `/zeroclaw-data/workspace/`:
- `IDENTITY.md` — agent name, personality
- `USER.md` — user name, timezone
- `SOUL.md` — communication style

---

## Agent DB Schema (Drizzle + PostgreSQL)

```typescript
agents {
  id              : text PK
  userId          : text FK → users.id

  // Identity
  name            : text         // display name
  slug            : text UNIQUE  // used for container name + subdomain
  agentName       : text         // persona name (written to IDENTITY.md)
  userName        : text?        // user's name (written to USER.md)
  timezone        : text         // default "UTC"
  communicationStyle: text?      // written to SOUL.md

  // Docker
  containerId     : text?
  containerPort   : integer?     // host port mapped to container:42617
  status          : enum(PENDING|STARTING|RUNNING|STOPPING|STOPPED|ERROR)

  // LLM
  provider        : text
  model           : text
  temperature     : real

  // Memory
  memoryBackend   : text         // "sqlite" | "markdown" | "none"
  autoSave        : text         // "true" | "false" (stored as string)

  // Secrets (AES-256-GCM encrypted, base64)
  encryptedToken    : text?      // ZeroClaw bearer token
  encryptedApiKey   : text?      // User LLM API key
  encryptedChannels : text?      // JSON: { telegram?, discord?, slack? }

  // Routing
  subdomain       : text?        // "<slug>.zeroonec.xyz"

  // Metrics (polled from Docker stats)
  memoryMb        : real?
  cpuPercent      : real?
  lastHealthAt    : timestamp?
}
```

---

## Agent Lifecycle

```
User submits form → POST /api/agents
       │
       ▼  (responds 202 immediately with PENDING record)
┌─────────────────────────────────────────────────────┐
│  BACKGROUND DEPLOY (docker.service.ts)              │
│                                                     │
│  1.  status = STARTING                              │
│  2.  ensureNetwork() + ensureImage()                │
│  3.  findFreePort() → hostPort (40000–50000)        │
│  4.  createAgentContainer()  [not started yet]      │
│  5.  startContainer()                               │
│  6.  sleep(500ms)                                   │
│  7.  initWorkspace() via putArchive                 │
│      ├── builds tar buffer in memory (no shell)     │
│      ├── .zeroclaw/config.toml  (memory + channels) │
│      ├── workspace/IDENTITY.md                      │
│      ├── workspace/USER.md                          │
│      └── workspace/SOUL.md                         │
│  8.  pairingCodeSince = new Date()                  │
│  9.  restartContainer()  ← ZeroClaw re-reads config │
│  10. waitForPairingCode(since=pairingCodeSince)     │
│  11. pairAgent() → bearerToken                      │
│  12. pollHealth() → confirms /health returns 200    │
│  13. status = RUNNING                               │
│      store: containerId, containerPort,             │
│             encryptedToken, lastHealthAt            │
└─────────────────────────────────────────────────────┘
       │
       ▼
Agent accessible at: https://<slug>.zeroonec.xyz
```

### State Transitions

```
PENDING ──► STARTING ──► RUNNING ──► STOPPING ──► STOPPED
               │                         ▲
               └────────► ERROR          │
                                    (user stops)

STOPPED ──► STARTING  (re-pair: new pairing code + new bearer token)
ERROR   ──► PENDING   (retry deploy)
```

---

## Backend API Endpoints

### Agent Management

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agents` | Create and deploy a new agent (202, background) |
| `GET` | `/api/agents` | List all agents for current user |
| `GET` | `/api/agents/:id` | Get agent details (channels decrypted) |
| `PATCH` | `/api/agents/:id` | Update config; if channels changed + running → restart |
| `DELETE` | `/api/agents/:id` | Destroy agent + container |

### Agent Control

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agents/:id/start` | Start stopped agent (re-pair) |
| `POST` | `/api/agents/:id/stop` | Gracefully stop |
| `POST` | `/api/agents/:id/restart` | Restart (re-pair with new token) |
| `GET` | `/api/agents/:id/logs` | Container logs (last 200 lines) |
| `GET` | `/api/agents/:id/stats` | Live CPU % + RAM MB |
| `GET` | `/api/agents/:id/health` | Proxy to ZeroClaw /health |

### Message Proxy

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agents/:id/message` | Proxy `{"message":"..."}` to ZeroClaw /webhook |

---

## Docker Container Spec

```typescript
createContainer({
  name: "zeroclaw-<slug>",
  Image: "ghcr.io/zeroclaw-labs/zeroclaw:latest",
  Cmd: ["gateway"],
  Env: [
    "API_KEY=<llm-api-key>",
    "PROVIDER=<provider>",
    "ZEROCLAW_MODEL=<model>",
    "ZEROCLAW_ALLOW_PUBLIC_BIND=true",
    "ZEROCLAW_GATEWAY_PORT=42617",
    "HOME=/zeroclaw-data",
    "ZEROCLAW_WORKSPACE=/zeroclaw-data/workspace",
  ],
  ExposedPorts: { "42617/tcp": {} },
  HostConfig: {
    PortBindings: { "42617/tcp": [{ HostIp: "127.0.0.1", HostPort: "<hostPort>" }] },
    Memory: <memoryBytes>,
    NanoCpus: <cpuQuota * 1e9>,
    RestartPolicy: { Name: "unless-stopped" },
    NetworkMode: "zeroone-net",
  },
  Labels: {
    "traefik.enable": "true",
    "traefik.http.routers.<slug>.rule": "Host(`<slug>.zeroonec.xyz`)",
    // ... TLS + loadbalancer labels
  },
  Volumes: { "/zeroclaw-data": {} },
})
```

### Resource Defaults by Plan

| Plan | Memory | CPU Quota | Max Agents |
|------|--------|-----------|------------|
| Free | 128MB | 0.5 | 3 |
| Pro | 256MB | 1.0 | 20 |
| Enterprise | Custom | Custom | Unlimited |

---

## Supported LLM Providers

| Provider | `PROVIDER` value |
|----------|-----------------|
| OpenRouter | `openrouter` |
| OpenAI | `openai` |
| Anthropic | `anthropic` |
| Ollama | `ollama` |
| Groq | `groq` |
| Google Gemini | `gemini` |
| Mistral | `mistral` |
| DeepSeek | `deepseek` |

---

## Security Model

| Concern | Mitigation |
|---------|-----------|
| Bearer token | AES-256-GCM encrypted in DB, never sent to browser |
| LLM API key | AES-256-GCM encrypted in DB, injected only as container env var |
| Channel secrets | AES-256-GCM encrypted JSON (`encryptedChannels`), decrypted only server-side |
| Container escape | Each agent is an isolated container with resource limits |
| User isolation | Each user's agents on isolated Docker anonymous volumes |
| Gateway exposure | Bound to `127.0.0.1:<port>`, only accessible via Traefik |
