# ZeroOne — Frontend (`app/`)

Next.js 15 dashboard for managing ZeroClaw AI agents.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Shadcn/UI** (Radix primitives)
- **Firebase** (Google OAuth client-side)
- **pnpm**

## Structure

```
app/
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/        # Email + Google sign-in
    │   │   └── register/     # Email registration
    │   ├── (dashboard)/
    │   │   ├── layout.tsx    # Auth guard + sidebar
    │   │   └── dashboard/
    │   │       ├── page.tsx              # Overview
    │   │       ├── settings/page.tsx     # User settings
    │   │       └── agents/
    │   │           ├── page.tsx          # Agent list (auto-polls on STARTING)
    │   │           ├── new/page.tsx      # 5-step create wizard
    │   │           └── [id]/
    │   │               ├── page.tsx      # Chat / Logs / Info tabs
    │   │               └── edit/page.tsx # Edit agent settings
    │   ├── layout.tsx
    │   └── page.tsx          # Landing page
    ├── components/
    │   ├── ui/               # Shadcn primitives
    │   ├── landing/          # Hero, Features, Pricing, Navbar, Footer
    │   ├── dashboard/
    │   │   ├── sidebar.tsx
    │   │   └── channels-form.tsx   # Telegram / Discord / Slack config
    │   └── shared/
    │       └── status-badge.tsx    # RUNNING / STARTING / ERROR badges
    └── lib/
        ├── api.ts            # All API calls + TypeScript types
        ├── auth.ts           # getSession() / saveSession() (localStorage)
        ├── firebase.ts       # Firebase client (Google sign-in)
        └── utils.ts          # cn() helper
```

## Setup

```bash
pnpm install

cp .env.example .env.local
# Edit .env.local
```

### Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001

# Firebase (Google OAuth)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Development

```bash
pnpm dev      # http://localhost:3000
pnpm build
pnpm start
pnpm lint
```

## Key Behaviors

- **Auth guard** in `(dashboard)/layout.tsx` — redirects to `/login` if no session
- **Agent status polling** — detail page and list page auto-poll every 3s while agent is `PENDING` / `STARTING` / `STOPPING`
- **Channels form** — toggle Telegram/Discord/Slack; `putArchive` on backend writes config.toml without needing a shell
- **Session storage** — JWT + user object stored in `localStorage` as `zeroone_session`
