import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  initMaDB,
  listIcMeetings,
  listIcDecisions,
  createIcMeeting,
  createIcDecision,
} from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "awq_venture", "MA IC Meetings");
  if (denied) return denied;

  try {
    await initMaDB();
    const p    = req.nextUrl.searchParams;
    const type = p.get("type");

    if (type === "meetings") {
      const rows = await listIcMeetings();
      return ok(rows);
    }

    if (type === "decisions") {
      const deal_id = p.get("deal_id");
      if (!deal_id) return err("deal_id required when type=decisions", 400);
      const rows = await listIcDecisions(deal_id);
      return ok(rows);
    }

    // Default: return both
    const [meetings, decisions] = await Promise.all([
      listIcMeetings(),
      listIcDecisions(undefined),
    ]);
    return ok({ meetings, decisions });
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "awq_venture", "MA IC Meetings");
  if (denied) return denied;

  try {
    await initMaDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create_meeting") {
      if (!data.meeting_date) return err("meeting_date required", 400);
      const row = await createIcMeeting(data);
      return ok(row);
    }

    if (action === "create_decision") {
      if (!data.deal_id)        return err("deal_id required", 400);
      if (!data.decision)       return err("decision required", 400);
      if (!data.decision_date)  return err("decision_date required", 400);
      const row = await createIcDecision(data);
      return ok(row);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
