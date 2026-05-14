import { NextResponse } from "next/server";
import { getGrcAdminClient } from "@/lib/grc-supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getGrcAdminClient();
  const results: Record<string, unknown> = {};

  const tables = ["grc_risks", "grc_controls", "grc_policies", "grc_audits"] as const;

  for (const table of tables) {
    // Write test
    const { data: inserted, error: insertErr } = await db
      .from(table)
      .insert({ title: "__health_check__" } as never)
      .select("id")
      .single();

    if (insertErr) {
      results[table] = { ok: false, error: insertErr.message };
      continue;
    }

    // Read test
    const { data: row, error: readErr } = await db
      .from(table)
      .select("id, title")
      .eq("id", (inserted as { id: string }).id)
      .single();

    // Cleanup
    await db.from(table).delete().eq("id", (inserted as { id: string }).id);

    results[table] = readErr
      ? { ok: false, error: readErr.message }
      : { ok: true, row };
  }

  const allOk = Object.values(results).every((r) => (r as { ok: boolean }).ok);

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", tables: results },
    { status: allOk ? 200 : 500 }
  );
}
