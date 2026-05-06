import { NextRequest, NextResponse } from "next/server";
import { USE_DRIVE } from "@/lib/drive-client";
import { exportMonthly } from "@/lib/drive-export";

// Chamado pelo Vercel Cron: dia 1 de cada mês às 05:00 UTC
export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

async function handler(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const bodySecret = await req.json().then((b: { secret?: string }) => b.secret).catch(() => null);
    if (auth !== `Bearer ${secret}` && bodySecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!USE_DRIVE) {
    return NextResponse.json({ skipped: true, reason: "Drive não configurado" });
  }

  const result = await exportMonthly();
  return NextResponse.json({ ok: true, ...result });
}
