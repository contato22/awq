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
  const status = searchParams.get("status") ?? "";

  const db = getErpAdminClient();
  let query = db.from("erp_expenses").select("*").order("expense_date", { ascending: false });
  if (search) query = query.or(`title.ilike.%${search}%,submitter_name.ilike.%${search}%,category.ilike.%${search}%`);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

async function POST_handler(req: NextRequest) {
  const token = await requireAuth(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db = getErpAdminClient();
  const { data, error } = await db
    .from("erp_expenses")
    .insert({
      ...body,
      submitter_id: token.sub as string,
      submitter_name: (token.name as string) ?? (token.email as string),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export const GET = withErpErrors(GET_handler);
export const POST = withErpErrors(POST_handler);
