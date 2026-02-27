<div align="center">
  <img src="images/logo.png" alt="ZeroOne" width="80" />
</div>

# ZeroOne

> Deploy your own AI agent in 60 seconds — no infrastructure knowledge required.

<div align="center">
  <img src="images/meta.png" alt="ZeroOne — Deploy AI Agents" width="100%" />
</div>

**ZeroOne** is a managed platform for creating, deploying, and running personal AI agents. Each agent gets its own identity, memory, and can be connected to Telegram, Discord, or Slack — all configured through a simple dashboard.

---

## What can you do with ZeroOne?

- **Create a personal AI assistant** that knows who you are, how you communicate, and remembers past conversations
- **Connect it to your channels** — chat with your agent directly on Telegram, Discord, or Slack
- **Choose any AI model** — Claude, GPT-4, Gemini, Llama, and 15+ others via OpenRouter, Anthropic, OpenAI, Ollama, Groq
- **Manage multiple agents** — deploy separate agents for different roles, teams, or workflows
- **Control everything from a dashboard** — start, stop, restart, edit, or delete agents without touching a terminal

---

## How it works

1. **Fill out the form** — give your agent a name, pick a model, write its personality
2. **Connect channels** — add a Telegram bot token, Discord bot, or Slack app
3. **Deploy** — ZeroOne spins up a dedicated container for your agent in ~60 seconds
4. **Start chatting** — your agent is live on your chosen channels and the web dashboard

No server setup. No Docker knowledge needed. No API key juggling.

---

## Features

### Agent Management
- One-click deploy — agent goes from form to running in ~60 seconds
- Edit identity, memory settings, and channel connections at any time
- Visual restart indicator when config changes are being applied
- Live agent status (Starting, Running, Stopped, Error)
- Start / Stop / Restart / Delete from the dashboard

### Agent Identity & Memory
- Custom agent name, persona, communication style, and timezone
- Persistent memory — your agent remembers conversations across sessions
- User profile — the agent knows your name and preferences

### Channel Integrations
- **Telegram** — connect a bot token, agent replies in your Telegram DMs or group
- **Discord** — connect a bot to a server, chat in any channel
- **Slack** — connect via bot token, agent joins your workspace
- **Web Dashboard** — built-in chat interface, no external app required

### AI Models
- OpenRouter (Claude, GPT-4, Gemini, Llama, Mistral, …)
- OpenAI, Anthropic, Groq, Ollama (self-hosted)
- Adjustable temperature per agent

### Security & Reliability
- Each agent runs in an isolated container
- API keys and tokens are encrypted at rest (AES-256-GCM)
- Automatic subdomain + SSL per agent (`<name>.zeroonec.xyz`)
- Session auth with Google OAuth or email/password

---

## Plans

| | Free | Pro | Enterprise |
|--|------|-----|-----------|
| Agents | 1 | 5 | Unlimited |
| Channels (Telegram / Discord / Slack) | ✓ | ✓ | ✓ |
| Memory | ✓ | ✓ | ✓ |
| All AI providers | ✓ | ✓ | ✓ |
| Priority support | — | — | ✓ |
| Custom limits | — | — | ✓ |

---

## Powered by ZeroClaw

Each agent runs on [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) — an open-source agent runtime built in Rust. It starts in under 10ms and is optimized for efficiency, which means ZeroOne can run many agents on a single server without the infrastructure cost ballooning.

---

## Live

**[zeroonec.xyz](https://zeroonec.xyz)**

---

<div align="center">Built with <a href="https://www.potlock.org">Potluck Labs</a>
</div>
