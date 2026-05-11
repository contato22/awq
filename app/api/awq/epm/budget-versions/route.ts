import { NextResponse } from "next/server";
import { initEPMDB, getBudgetVersions, getApprovalLog, upsertBudgetVersion, addApprovalEvent } from "@/lib/epm-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await initEPMDB();
    const [versions, approvalLog] = await Promise.all([getBudgetVersions(), getApprovalLog()]);
    return NextResponse.json({ success: true, versions, approvalLog });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initEPMDB();
    const body = await req.json();
    if (body.action === "upsert_version") await upsertBudgetVersion(body.data);
    else if (body.action === "add_event") await addApprovalEvent(body.data);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
