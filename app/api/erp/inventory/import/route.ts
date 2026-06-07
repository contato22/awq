import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";

export const runtime = "nodejs";

type ImportRow = {
  sku: string;
  name: string;
  category: string;
  unit?: string;
  unit_cost?: number | null;
  sale_price?: number | null;
  stock_qty?: number | null;
  min_stock?: number | null;
  description?: string | null;
};

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items, warehouseId } = (await req.json()) as { items: ImportRow[]; warehouseId?: string };
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Nenhum item para importar" }, { status: 400 });
  }

  const db = getErpAdminClient();

  const { data: existing, error: exErr } = await db
    .from("erp_inventory_items")
    .select("sku");
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  const existingSkus = new Set((existing ?? []).map((r: { sku: string }) => r.sku));

  const seen = new Set<string>();
  const toInsert: ImportRow[] = [];
  const skipped: { sku: string; reason: string }[] = [];

  for (const raw of items) {
    const sku = String(raw.sku ?? "").trim();
    const name = String(raw.name ?? "").trim();
    const category = String(raw.category ?? "").trim();
    if (!sku || !name || !category) {
      skipped.push({ sku: sku || "(sem sku)", reason: "campos obrigatórios faltando (sku/name/category)" });
      continue;
    }
    if (existingSkus.has(sku) || seen.has(sku)) {
      skipped.push({ sku, reason: "SKU já existe" });
      continue;
    }
    seen.add(sku);
    toInsert.push({
      sku,
      name,
      category,
      unit: raw.unit?.trim() || "un",
      unit_cost: Number(raw.unit_cost ?? 0) || 0,
      sale_price: raw.sale_price == null || raw.sale_price === 0 ? null : Number(raw.sale_price),
      stock_qty: Number(raw.stock_qty ?? 0) || 0,
      min_stock: Number(raw.min_stock ?? 0) || 0,
      description: raw.description?.trim() || null,
      ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    } as ImportRow);
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ inserted: 0, skipped }, { status: 200 });
  }

  const { data, error } = await db
    .from("erp_inventory_items")
    .insert(toInsert)
    .select("id, sku");
  if (error) return NextResponse.json({ error: error.message, skipped }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0, skipped }, { status: 201 });
}
