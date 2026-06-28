// POST /api/enrd/posvenda/import
// Recebe o CSV da planilha da Tamara (texto), parseia, concilia com gestão e
// grava as OS. Fato transacional — nunca estima; linhas sem cliente/valor são
// descartadas com aviso. Auth via middleware.
//
// Body: text/csv cru, OU JSON { csv: string }.

import { NextRequest, NextResponse } from "next/server";
import { parseTamaraCSV, conciliar, upsertOS, writeImportLog } from "@/lib/enrd-posvenda-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email") ?? null;
  try {
    const ct = req.headers.get("content-type") ?? "";
    let csv = "";
    if (ct.includes("application/json")) {
      const body = await req.json();
      csv = String(body.csv ?? "");
    } else {
      csv = await req.text();
    }
    if (!csv.trim()) {
      return NextResponse.json({ ok: false, error: "CSV vazio." }, { status: 400 });
    }

    const parsed = parseTamaraCSV(csv);
    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nenhuma OS válida no CSV.", avisos: parsed.avisos, descartadas: parsed.descartadas },
        { status: 422 }
      );
    }

    const conc = await conciliar(parsed.rows);
    const gravadas = await upsertOS(conc.rows);
    await writeImportLog({
      ran_by: userEmail,
      linhas: gravadas,
      descartadas: parsed.descartadas,
      ok: true,
      detail: `OK ${conc.ok} · REVISAR ${conc.revisar}`,
    });

    return NextResponse.json({
      ok: true,
      gravadas,
      descartadas: parsed.descartadas,
      conciliacao: { ok: conc.ok, revisar: conc.revisar },
      avisos: parsed.avisos.slice(0, 50),
      at: new Date().toISOString(),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    try {
      await writeImportLog({ ran_by: userEmail, linhas: 0, descartadas: 0, ok: false, detail });
    } catch {
      /* best-effort */
    }
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}
