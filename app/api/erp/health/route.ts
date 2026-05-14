import { NextResponse } from "next/server";
import { getErpAdminClient, isErpConfigured } from "@/lib/supabase-erp";

export const runtime = "nodejs";

export async function GET() {
  if (!isErpConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "ERP Supabase env vars not set" },
      { status: 200 }
    );
  }

  try {
    const db = getErpAdminClient();
    // Lightweight connectivity check — just fetch one row from any system table.
    const { error } = await db.from("erp_assets").select("id").limit(1);

    if (error && error.code !== "42P01") {
      // 42P01 = table does not exist yet — that's OK, connection itself works.
      return NextResponse.json(
        { ok: false, configured: true, error: error.message },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, configured: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, configured: true, error: message }, { status: 200 });
  }
}
