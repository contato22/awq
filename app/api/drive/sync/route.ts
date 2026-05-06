import { NextRequest, NextResponse } from "next/server";
import { USE_DRIVE } from "@/lib/drive-client";
import { exportAll, exportDaily, exportWeekly, exportMonthly, exportAnnual } from "@/lib/drive-export";

// POST /api/drive/sync
// Body: { period?: "daily" | "weekly" | "monthly" | "annual" | "all" }
export async function POST(req: NextRequest) {
  if (!USE_DRIVE) {
    return NextResponse.json({ error: "Google Drive não configurado" }, { status: 503 });
  }

  const { period = "all" } = await req.json().catch(() => ({ period: "all" }));

  const exportFn: Record<string, () => Promise<unknown>> = {
    daily: () => exportDaily(),
    weekly: () => exportWeekly(),
    monthly: () => exportMonthly(),
    annual: () => exportAnnual(),
    all: () => exportAll(),
  };

  const fn = exportFn[period];
  if (!fn) {
    return NextResponse.json({ error: `Período inválido: ${period}` }, { status: 400 });
  }

  const result = await fn();
  return NextResponse.json({ ok: true, period, result });
}
