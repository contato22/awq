import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";
import { CAZA_VISION_SEED } from "@/lib/caza-vision-inventory-seed";

export const runtime = "nodejs";

/**
 * POST /api/erp/inventory/seed-caza-vision
 *
 * Insere os 51 itens do inventário inicial do Caza Vision em erp_inventory_items.
 * Idempotente: faz upsert por SKU (CV-*) — pode ser rodado várias vezes sem duplicar.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getErpAdminClient();

  const { data, error } = await db
    .from("erp_inventory_items")
    .upsert(CAZA_VISION_SEED, { onConflict: "sku", ignoreDuplicates: false })
    .select("id, sku");

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Schema ERP não inicializado.", setupRequired: true }, { status: 412 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalCost = CAZA_VISION_SEED.reduce((s, i) => s + i.unit_cost * i.stock_qty, 0);
  const totalSale = CAZA_VISION_SEED.reduce((s, i) => s + (i.sale_price ?? 0) * i.stock_qty, 0);

  return NextResponse.json({
    upserted: data?.length ?? 0,
    totalCost: Number(totalCost.toFixed(2)),
    totalSale: Number(totalSale.toFixed(2)),
    skus: data?.map(r => r.sku) ?? [],
  }, { status: 201 });
}
