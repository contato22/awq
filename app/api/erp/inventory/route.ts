import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest) {
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET });
}

export async function GET(req: NextRequest) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";

  const db = getErpAdminClient();

  // Fetch itens + warehouses em paralelo e faz o join no servidor — evita
  // depender de FK declarada no Supabase para o nested select PostgREST.
  // Antes: .select("*, erp_inventory_warehouses(name)") retornava 500 quando
  // a relação não está definida no schema, deixando o front sem dados.
  let itemsQuery = db
    .from("erp_inventory_items")
    .select("*")
    .order("name", { ascending: true });
  if (search) itemsQuery = itemsQuery.or(`name.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%`);

  const [itemsRes, warehousesRes] = await Promise.all([
    itemsQuery,
    db.from("erp_inventory_warehouses").select("id, name"),
  ]);

  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });

  const warehouseById = new Map<string, { name: string }>();
  for (const w of warehousesRes.data ?? []) warehouseById.set(w.id, { name: w.name });

  const enriched = (itemsRes.data ?? []).map((it) => ({
    ...it,
    erp_inventory_warehouses: it.warehouse_id ? warehouseById.get(it.warehouse_id) ?? null : null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db = getErpAdminClient();
  const { data, error } = await db
    .from("erp_inventory_items")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
