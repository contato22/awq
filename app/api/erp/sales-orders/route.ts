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
  let query = db.from("erp_sales_orders").select("*").order("order_date", { ascending: false });
  if (search) query = query.or(`customer_name.ilike.%${search}%,order_number.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const token = await requireAuth(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db = getErpAdminClient();

  if (!body.order_number) {
    const year = new Date().getFullYear();
    const { count } = await db.from("erp_sales_orders").select("*", { count: "exact", head: true });
    body.order_number = `PV-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  }

  const { data, error } = await db
    .from("erp_sales_orders")
    .insert({ ...body, created_by: token.email as string })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
