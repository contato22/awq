# AWQ Group — Plataforma Central

A Next.js 14 control-tower platform for **AWQ Group** — a holding company with four business units: JACQES (Agência), Caza Vision (Produtora), AWQ Venture (Investimentos), and Advisor (Consultoria).

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Auth**: NextAuth.js (JWT + RBAC)
- **AI**: Anthropic SDK (OpenClaw assistant + BU agents)

## Architecture

| Mode | Deploy | Notes |
|------|--------|-------|
| `STATIC_EXPORT=1` | GitHub Pages (`/awq`) | Static JSON from `public/data/` |
| SSR | Vercel | Live Notion API queries |

## Project Structure

```
awq/
├── app/
│   ├── awq/                 # Control tower — AWQ Group holding layer
│   ├── jacqes/              # JACQES BU — all routes canonical here
│   ├── caza-vision/         # Caza Vision BU
│   ├── awq-venture/         # AWQ Venture BU
│   ├── advisor/             # Advisor BU
│   ├── business-units/      # Hub — all BUs overview
│   └── api/                 # Server routes (auth, agents, chat, notion)
├── components/
│   ├── Sidebar.tsx          # Contextual sidebar (switches by BU)
│   └── ...
└── lib/
    ├── platform-registry.ts # Source of truth for all routes
    ├── awq-group-data.ts    # Consolidated holding data
    ├── data.ts              # JACQES BU data (snapshot Q1 2026)
    └── caza-data.ts         # Caza Vision BU data
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the platform.

---

*AWQ Group — Plataforma Central · Built with Next.js 14*
