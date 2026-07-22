import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { getLeads, upsertLead } from "@/lib/patricia-canto/db";
import { buildInitialLeads, type Lead } from "@/lib/patricia-canto/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    let leads = await getLeads();
    if (leads.length === 0) {
      // Primeira leitura com a tabela vazia: semeia com os 33 leads originais
      // da planilha (idempotente — só acontece enquanto a tabela está vazia).
      const seed = buildInitialLeads();
      for (const lead of seed) await upsertLead(lead);
      leads = seed;
    }
    return NextResponse.json({ leads });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const lead = (await req.json()) as Lead;
    await upsertLead(lead);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
