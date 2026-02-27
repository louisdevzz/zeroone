# CLAUDE.md — ZeroOne (ZCaaS Platform)

> Project conventions, architecture decisions, and working guidelines for Claude Code within the `zeroone` project.

---

## Project Overview

**ZeroOne** is a ZeroClaw-as-a-Service (ZCaaS) platform. Users deploy and manage [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) AI agent instances through a web dashboard.

**ZeroClaw is a Rust binary** — ~8.8MB binary, sub-10ms startup — not a framework you build on top of. ZeroOne wraps its Docker deployment model with a multi-tenant management layer.

**Brand color:** `#BA4811` (orange)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Shadcn/UI, Tailwind CSS v4 |
| Backend / Orchestrator | Express.js (Node.js), TypeScript |
| ORM | Drizzle ORM + `postgres.js` |
| Auth | JWT (`jsonwebtoken` + `bcryptjs`) + Firebase Admin (Google OAuth) |
| Agent Runtime | ZeroClaw (`ghcr.io/zeroclaw-labs/zeroclaw:latest`) |
| Container Isolation | Docker Engine via Dockerode SDK |
| Reverse Proxy | Traefik (auto subdomain + SSL per agent) |
| Database | PostgreSQL |
| Package Manager | pnpm (both `app/` and `backend/`) |
| Deployment | VPS (single node), Docker |

---

## Repository Structure

```
zeroone/
├── app/                        # Next.js 15 frontend
│   └── src/
│       ├── app/
│       │   ├── (auth)/         # /login, /register
│       │   └── (dashboard)/    # /dashboard/agents, /dashboard/agents/[id]
│       ├── components/
│       │   ├── ui/             # Shadcn primitives
│       │   ├── landing/        # Marketing page components
│       │   └── dashboard/      # channels-form.tsx, sidebar.tsx
│       └── lib/
│           ├── api.ts          # All API calls + TypeScript types
│           ├── auth.ts         # getSession(), saveSession()
│           └── firebase.ts     # Firebase client (Google sign-in)
│
├── backend/                    # Express.js API + orchestrator
│   └── src/
│       ├── routes/
│       │   ├── agents.ts       # CRUD + deploy/stop/restart/message/logs
│       │   └── auth.ts         # register, login, google, /me
│       ├── services/
│       │   ├── docker.service.ts    # Container lifecycle + putArchive
│       │   └── zeroclaw.service.ts  # pair(), sendMessage(), checkHealth()
│       ├── db/
│       │   ├── schema.ts       # Drizzle schema (users, agents)
│       │   └── index.ts        # Drizzle client singleton
│       ├── middleware/
│       │   └── auth.ts         # JWT authenticate middleware
│       └── lib/
│           └── crypto.ts       # AES-256-GCM encrypt/decrypt
│
└── zeroclaw/                   # ZeroClaw upstream source (read-only reference)
```

---

## How ZeroClaw Works (Critical)

Each ZeroClaw instance runs as a **gateway** server inside a Docker container:

```bash
# Container image: ghcr.io/zeroclaw-labs/zeroclaw:latest
# Command: ["gateway"]
# Exposes port 42617
```

### Gateway API (the only integration surface)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Public health check |
| `/pair` | POST | `X-Pairing-Code: <6-digit>` | Exchange code → bearer token |
| `/webhook` | POST | `Authorization: Bearer <token>` | Send message `{"message": "..."}` |

### Pairing Flow

```
1. Container starts → ZeroClaw prints 6-digit pairing code in logs
2. Backend polls logs → extracts code (regex: /X-Pairing-Code:\s*(\d{6})/ or box format)
3. POST /pair with X-Pairing-Code → receives { "token": "..." }
4. Backend AES-256-GCM encrypts token → stores in DB
5. All /webhook calls proxied through backend (token never sent to browser)
```

### Container Environment Variables

```bash
API_KEY=sk-...                    # LLM provider API key
PROVIDER=openrouter               # openrouter | openai | anthropic | ollama | ...
ZEROCLAW_MODEL=anthropic/claude-sonnet-4-6
ZEROCLAW_ALLOW_PUBLIC_BIND=true
ZEROCLAW_GATEWAY_PORT=42617
HOME=/zeroclaw-data
ZEROCLAW_WORKSPACE=/zeroclaw-data/workspace
```

### Workspace Files (written via docker cp — no shell in image)

```
/zeroclaw-data/
├── .zeroclaw/config.toml        # Memory, channels, gateway config
├── workspace/IDENTITY.md        # Agent persona
├── workspace/USER.md            # User preferences
└── workspace/SOUL.md            # Communication style
```

**Important:** ZeroClaw image has no shell (`sh`/`bash`). All file writes use
`container.putArchive()` (docker cp with in-memory tar buffer), never `docker exec sh -c`.

### Config TOML Format

```toml
default_temperature = 0.7

[memory]
backend = "sqlite"       # sqlite | markdown | none
auto_save = true

[gateway]
port = 42617

[channels_config]
cli = true

[channels_config.telegram]
bot_token = "..."
allowed_users = ["@username"]

[channels_config.discord]
bot_token = "..."
guild_id = "..."           # optional
allowed_users = []

[channels_config.slack]
bot_token = "xoxb-..."
app_token = "xapp-..."     # optional, Socket Mode
channel_id = "C123..."     # optional
```

---

## Database Schema (Drizzle + PostgreSQL)

Key columns on the `agents` table:

```typescript
// Identity
name, slug, agentName, userName, timezone, communicationStyle

// Runtime
containerId, containerPort, status  // PENDING|STARTING|RUNNING|STOPPING|STOPPED|ERROR
provider, model, temperature

// Memory
memoryBackend, autoSave  // autoSave stored as string "true"/"false"

// Secrets (AES-256-GCM encrypted, base64)
encryptedToken      // ZeroClaw bearer token
encryptedApiKey     // User LLM API key
encryptedChannels   // JSON: { telegram?, discord?, slack? }
```

---

## API Response Envelope

All backend responses use:

```json
{ "success": true,  "data": <T> }
{ "success": false, "error": "message" }
```

Frontend `request()` in `api.ts` unwraps `json.data ?? json` automatically.

---

## Deploy Flow (Background Job)

```
POST /api/agents
  → Create DB record (status: PENDING)
  → Respond 202 immediately (returns agent with PENDING status)
  → Background:
      1. status = STARTING
      2. ensureNetwork() + ensureImage()
      3. createAgentContainer() → start()
      4. sleep(500ms)
      5. initWorkspace() via putArchive (builds tar in memory, docker cp)
      6. pairingCodeSince = new Date()
      7. restartContainer() ← so ZeroClaw re-reads config.toml with channels
      8. waitForPairingCode(since=pairingCodeSince)
      9. pairAgent() → bearerToken
      10. pollHealth()
      11. status = RUNNING, store encryptedToken
```

---

## Frontend Auth

Sessions stored in `localStorage` as `zeroone_session`:
```json
{ "token": "jwt...", "user": { "id": "...", "email": "...", "name": "...", "plan": "FREE" } }
```

`getSession()` / `saveSession()` in `app/src/lib/auth.ts`.

---

## Environment Variables

### Backend (`backend/.env`)

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/zeroone"
ENCRYPTION_KEY="32-byte-hex-string"         # AES-256-GCM key
JWT_SECRET="..."

# Firebase Admin (Google OAuth verification)
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="..."

# Docker
DOCKER_SOCKET="/var/run/docker.sock"
ZEROCLAW_IMAGE="ghcr.io/zeroclaw-labs/zeroclaw:latest"
TRAEFIK_DOMAIN="zeroonec.xyz"
DOCKER_NETWORK="zeroone-net"
```

### Frontend (`app/.env.local`)

```bash
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Firebase client (Google sign-in)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
```

---

## Coding Conventions

- **TypeScript strict** everywhere
- **`"use client"`** only when needed (hooks, events, browser APIs)
- **Zod** for all input validation on backend routes
- **Never** expose Docker socket, bearer tokens, or encrypted keys to client-side code
- **pnpm** for all package manager commands (never npm/yarn/bun)
- **Don't modify** files inside `zeroclaw/` — read-only upstream reference
- **Drizzle** migrations: `pnpm db:push` (dev) or `pnpm db:migrate` (prod)
- **Conventional Commits:** `feat:`, `fix:`, `chore:`, `docs:`

---

## Working Guidelines for Claude

- Always read relevant files before modifying
- Do not auto-commit or push without explicit instruction
- Prefer editing existing files over creating new ones
- Check `zeroclaw/src/config/schema.rs` for ZeroClaw TOML field names before writing config
- No shell in ZeroClaw container — use `putArchive` not `docker exec`
- After writing config.toml, always restart the container so ZeroClaw re-reads it
- Use `since?: Date` parameter in `waitForPairingCode` after any restart to avoid matching stale codes
