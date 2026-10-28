import { withErpErrors } from "@/lib/erp-route";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest) {
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET });
}

async function GET_handler(req: NextRequest) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";

  const db = getErpAdminClient();
  let query = db
    .from("erp_inventory_items")
    .select("*, erp_inventory_warehouses(name)")
    .order("name", { ascending: true });
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) {
    // 42P01 = relação inexistente. Schema ainda não rodado em produção.
    if (error.code === "42P01") {
      return NextResponse.json(
        { items: [], setupRequired: true, message: "Tabela erp_inventory_items não existe. Rode awq_erp_full_schema.sql no SQL Editor do Supabase." },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

async function POST_handler(req: NextRequest) {
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

export const GET = withErpErrors(GET_handler);
export const POST = withErpErrors(POST_handler);
