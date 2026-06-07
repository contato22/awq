import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";

export const runtime = "nodejs";

/**
 * Mapeamento: categoria de inventário → (categoria de ativo, vida útil em meses).
 * Vidas úteis seguem a IN SRF 162/98 (anexos I e II):
 *   - Equipamentos eletrônicos / áudio / vídeo / informática: 5 anos (60 meses)
 *   - Móveis e utensílios / instalações: 10 anos (120 meses)
 */
const CATEGORY_MAP: Record<string, { assetCategory: string; usefulLifeMonths: number }> = {
  "CÂMERAS":            { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "LENTES":             { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "GIMBALS":            { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "LUZES":              { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "ÁUDIO":              { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "MODIFICADOR DE LUZ": { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "CARREGADOR":         { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "TRIPÉ":              { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "BATERIAS":           { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "CARTÕES":            { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "CABOS":              { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "ADAPTADORES":        { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "ACESSÓRIOS":         { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "CASES":              { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "ARMAZENAMENTO":      { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "COMPUTADORES":       { assetCategory: "Equipamento", usefulLifeMonths: 60 },
  "ESCRITÓRIO":         { assetCategory: "Móvel",       usefulLifeMonths: 120 },
};

type Body = {
  /** Categorias do inventário a migrar. Vazio = todas mapeadas. */
  categories?: string[];
  /** Valor mínimo de aquisição (R$). Abaixo disso vira despesa, não imobilizado. Default 1200. */
  minValue?: number;
  /** Se true, faz a importação. Se false, retorna apenas o preview. */
  commit?: boolean;
  /** Apenas SKUs específicos (ignora filtros se preenchido). */
  skus?: string[];
  /** Quando o item já está marcado como ativo, marcar como is_active=false no inventário após criar o asset. */
  deactivateSource?: boolean;
};

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  const minValue = Number.isFinite(body.minValue) ? Number(body.minValue) : 1200;
  const wantedCats = body.categories?.length ? new Set(body.categories.map(c => c.toUpperCase())) : null;
  const skuFilter = body.skus?.length ? new Set(body.skus) : null;

  const db = getErpAdminClient();

  const { data: items, error: itErr } = await db
    .from("erp_inventory_items")
    .select("id, sku, name, category, unit_cost, stock_qty, description")
    .eq("is_active", true);
  if (itErr) {
    if (itErr.code === "42P01") {
      return NextResponse.json({ error: "Schema ERP não inicializado. Rode awq_erp_full_schema.sql no SQL Editor do Supabase ERP.", setupRequired: true }, { status: 412 });
    }
    return NextResponse.json({ error: itErr.message }, { status: 500 });
  }

  const { data: existingAssets, error: aErr } = await db
    .from("erp_assets")
    .select("code");
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  const existingCodes = new Set((existingAssets ?? []).map((a: { code: string }) => a.code));

  const candidates: {
    sourceId: string;
    sku: string;
    code: string;
    description: string;
    category: string;
    inventoryCategory: string;
    acquisition_value: number;
    useful_life_months: number;
    depreciation_method: "linear";
    residual_value: number;
    supplier: string | null;
    notes: string;
  }[] = [];
  const skipped: { sku: string; reason: string }[] = [];

  let seq = 1;
  const nextCode = () => {
    let code = "";
    do {
      code = `ATI-CV-${String(seq).padStart(4, "0")}`;
      seq++;
    } while (existingCodes.has(code));
    existingCodes.add(code);
    return code;
  };

  for (const it of items ?? []) {
    const cat = (it.category ?? "").toUpperCase();
    const map = CATEGORY_MAP[cat];
    if (skuFilter) {
      if (!skuFilter.has(it.sku)) continue;
    } else {
      if (!map) { skipped.push({ sku: it.sku, reason: `categoria "${it.category}" sem mapeamento` }); continue; }
      if (wantedCats && !wantedCats.has(cat)) continue;
    }
    const value = Number(it.unit_cost) * Number(it.stock_qty || 1);
    if (value < minValue) {
      skipped.push({ sku: it.sku, reason: `valor R$ ${value.toFixed(2)} abaixo do mínimo R$ ${minValue.toFixed(2)}` });
      continue;
    }
    const m = map ?? { assetCategory: "Equipamento", usefulLifeMonths: 60 };
    candidates.push({
      sourceId: it.id,
      sku: it.sku,
      code: nextCode(),
      description: it.name,
      category: m.assetCategory,
      inventoryCategory: it.category,
      acquisition_value: value,
      useful_life_months: m.usefulLifeMonths,
      depreciation_method: "linear",
      residual_value: 0,
      supplier: it.description || null,
      notes: `Migrado do inventário · SKU ${it.sku}`,
    });
  }

  if (!body.commit) {
    return NextResponse.json({ preview: true, candidates, skipped, minValue });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ created: 0, skipped, minValue }, { status: 200 });
  }

  const toInsert = candidates.map(c => ({
    code: c.code,
    description: c.description,
    category: c.category,
    acquisition_value: c.acquisition_value,
    acquisition_date: new Date().toISOString().slice(0, 10),
    useful_life_months: c.useful_life_months,
    residual_value: c.residual_value,
    depreciation_method: c.depreciation_method,
    supplier: c.supplier,
    notes: c.notes,
    status: "Ativo",
    created_by: (token.email as string) ?? null,
  }));

  const { data: created, error: insErr } = await db
    .from("erp_assets")
    .insert(toInsert)
    .select("id, code");
  if (insErr) return NextResponse.json({ error: insErr.message, skipped }, { status: 500 });

  if (body.deactivateSource) {
    const ids = candidates.map(c => c.sourceId);
    await db.from("erp_inventory_items").update({ is_active: false }).in("id", ids);
  }

  return NextResponse.json({ created: created?.length ?? 0, codes: created?.map(c => c.code) ?? [], skipped, minValue }, { status: 201 });
}
