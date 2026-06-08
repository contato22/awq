import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";

export const runtime = "nodejs";

/**
 * POST /api/erp/assets/tag-caza-vision
 *
 * Marca todos os ativos com código ATI-CV-* como location="Caza Vision",
 * pra segregar nos relatórios e dashboards por BU. Idempotente.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getErpAdminClient();

  const { data, error } = await db
    .from("erp_assets")
    .update({ location: "Caza Vision" })
    .like("code", "ATI-CV-%")
    .select("code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: data?.length ?? 0, codes: data?.map(a => a.code) ?? [] });
}
