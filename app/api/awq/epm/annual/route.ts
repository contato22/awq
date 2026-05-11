import { NextResponse } from "next/server";
import {
  getAnnualTrend,
  getAnnualPLLines,
  getAnnualCFRows,
  getAnnualBalanceSheet,
} from "@/lib/epm-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [trendData, annualPl, cfRows, bsData] = await Promise.all([
      getAnnualTrend(),
      getAnnualPLLines("FY2025"),
      getAnnualCFRows("FY2025"),
      getAnnualBalanceSheet("FY2025"),
    ]);
    return NextResponse.json({ success: true, trendData, annualPl, cfRows, bsData });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
