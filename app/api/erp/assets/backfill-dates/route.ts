import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";

export const runtime = "nodejs";

/**
 * Anos de compra confirmados na planilha original (coluna ANO DE COMPRA).
 * Itens não listados aqui ficam com acquisition_date = NULL (data desconhecida).
 */
const ACQ_DATE_BY_SKU: Record<string, string> = {
  "CV-OFF-003": "2024-01-01", // Persianas
  "CV-OFF-004": "2024-01-01", // Trilhos de Iluminação
  "CV-OFF-001": "2026-01-01", // Cadeira Escritório Presidente
  "CV-OFF-002": "2026-01-01", // Pé Base de Mesa industrial
  "CV-OFF-005": "2026-01-01", // Cadeira Herman Miller
  "CV-OFF-006": "2026-01-01", // Apoio de Pés
  "CV-OFF-007": "2026-01-01", // Monitor
  "CV-OFF-008": "2026-01-01", // Monitor FeelWorld
};

/**
 * POST /api/erp/assets/backfill-dates
 *
 * Para cada ativo ATI-CV-* cujo `notes` referencia um SKU mapeado em
 * ACQ_DATE_BY_SKU, ajusta `acquisition_date`. Os demais ficam com NULL
 * (data de aquisição desconhecida — melhor que falsificar com hoje).
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getErpAdminClient();

  const { data: assets, error } = await db
    .from("erp_assets")
    .select("id, code, notes")
    .like("code", "ATI-CV-%");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updates: { id: string; code: string; sku: string; acquisition_date: string | null }[] = [];
  for (const a of assets ?? []) {
    const m = a.notes?.match(/SKU\s+(\S+)/);
    const sku = m?.[1] ?? "";
    const date = ACQ_DATE_BY_SKU[sku] ?? null;
    updates.push({ id: a.id, code: a.code, sku, acquisition_date: date });
  }

  const results: { code: string; sku: string; acquisition_date: string | null }[] = [];
  for (const u of updates) {
    const { error: uErr } = await db
      .from("erp_assets")
      .update({ acquisition_date: u.acquisition_date })
      .eq("id", u.id);
    if (uErr) return NextResponse.json({ error: uErr.message, applied: results }, { status: 500 });
    results.push({ code: u.code, sku: u.sku, acquisition_date: u.acquisition_date });
  }

  return NextResponse.json({ updated: results.length, results });
}
