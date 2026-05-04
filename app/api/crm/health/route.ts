import { NextRequest, NextResponse } from "next/server";
import {
  initCrmDB,
  listNpsSurveys, createNpsSurvey, respondNps,
  listCsatSurveys, createCsatSurvey, respondCsat,
  getAccountHealthSummaries,
} from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const resource = p.get("resource");

    if (resource === "nps") {
      const rows = await listNpsSurveys({
        account_id: p.get("account_id") ?? undefined,
        period:     p.get("period")     ?? undefined,
      });
      return ok(rows);
    }

    if (resource === "csat") {
      const rows = await listCsatSurveys({
        account_id: p.get("account_id") ?? undefined,
      });
      return ok(rows);
    }

    // Default: account health summaries
    const summaries = await getAccountHealthSummaries();
    return ok(summaries);
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create_nps") {
      if (!data.account_id) return err("account_id required");
      const row = await createNpsSurvey(data);
      return ok(row);
    }

    if (action === "respond_nps") {
      const { survey_id, score, comment } = data;
      if (!survey_id) return err("survey_id required");
      if (score === undefined || score < 0 || score > 10) return err("score must be 0–10");
      const row = await respondNps(survey_id, score, comment);
      return ok(row);
    }

    if (action === "create_csat") {
      if (!data.account_id) return err("account_id required");
      const row = await createCsatSurvey(data);
      return ok(row);
    }

    if (action === "respond_csat") {
      const { survey_id, score, comment } = data;
      if (!survey_id) return err("survey_id required");
      if (score === undefined || score < 1 || score > 5) return err("score must be 1–5");
      const row = await respondCsat(survey_id, score, comment);
      return ok(row);
    }

    return err("Unknown action");
  } catch (e) { return err(String(e), 500); }
}
