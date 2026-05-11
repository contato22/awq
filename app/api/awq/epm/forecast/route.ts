import { NextResponse } from "next/server";
import { initEPMDB, getCashForecastWeeks, getDriverScenarios, upsertCashForecastWeek, upsertDriverScenario } from "@/lib/epm-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await initEPMDB();
    const [weeks, scenarios] = await Promise.all([getCashForecastWeeks(), getDriverScenarios()]);
    return NextResponse.json({ success: true, weeks, scenarios });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initEPMDB();
    const body = await req.json();
    if (body.action === "upsert_week") {
      await upsertCashForecastWeek(body.data);
    } else if (body.action === "upsert_scenario") {
      await upsertDriverScenario(body.data);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
