# JACQES BI — Business Intelligence Dashboard

A Next.js 14 Business Intelligence dashboard for **JACQES**, a portfolio company of **AWQ Group**.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

## Features

| Page | Description |
|------|-------------|
| **Overview** | KPI cards, revenue trend, customer segments, top products, regional performance & alerts |
| **Revenue** | Monthly P&L bar chart, margin progression, acquisition channel breakdown |
| **Customers** | Customer directory with LTV, health status (active / at-risk / churned) |
| **Reports** | Report cards with export actions, scheduled report management |
| **Settings** | Workspace config, notifications, team access, data source connections |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

```
jacqes-bi/
├── app/
│   ├── layout.tsx           # Root layout with sidebar
│   ├── page.tsx             # Overview dashboard
│   ├── revenue/page.tsx     # Revenue analytics
│   ├── customers/page.tsx   # Customer management
│   ├── reports/page.tsx     # Reports & exports
│   └── settings/page.tsx   # Workspace settings
├── components/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── KPICard.tsx
│   ├── RevenueChart.tsx
│   ├── CustomerSegmentChart.tsx
│   ├── TopProductsTable.tsx
│   ├── RegionTable.tsx
│   ├── ChannelTable.tsx
│   └── AlertBanner.tsx
└── lib/
    ├── data.ts              # Mock data & TypeScript types
    └── utils.ts             # Formatting helpers
```

---

*JACQES BI · Powered by AWQ Group · Built with Next.js 14*
