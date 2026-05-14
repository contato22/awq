import { NextRequest, NextResponse } from "next/server";
import { initPpmDB, listRisks, createRisk } from "@/lib/ppm-db";

let _ppmReady = false;
async function ensurePpm() { if (!_ppmReady) { await initPpmDB(); _ppmReady = true; } }

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    await ensurePpm();
    const project_id = req.nextUrl.searchParams.get("project_id") ?? undefined;
    const risks = await listRisks(project_id);
    return ok(risks);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePpm();
    const body = await req.json();
    if (!body.project_id)       return err("project_id is required");
    if (!body.risk_description) return err("risk_description is required");
    if (!body.impact)           return err("impact is required");
    if (!body.probability)      return err("probability is required");

    const risk = await createRisk({
      ...body,
      status:          body.status          ?? "identified",
      identified_date: body.identified_date ?? new Date().toISOString().slice(0, 10),
    });
    return ok(risk);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
