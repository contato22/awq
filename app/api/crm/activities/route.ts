import { NextRequest, NextResponse } from "next/server";
import { listActivities, createActivity, listAccounts, listOpportunities, listLeads } from "@/lib/crm-db";
import type { CrmActivity } from "@/lib/crm-types";
import { getForcedBu, apiGuard } from "@/lib/api-guard";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "holding", "CRM Activities");
  if (denied) return denied;

  try {
    const p = req.nextUrl.searchParams;
    const forcedBu = await getForcedBu(req);
    let data = await listActivities({
      related_to_type: p.get("related_to_type") ?? undefined,
      related_to_id:   p.get("related_to_id")   ?? undefined,
      created_by:      p.get("created_by")       ?? undefined,
    });

    // BU isolation: filter activities to those tied to entities of the locked BU
    if (forcedBu) {
      const [accs, opps, leads] = await Promise.all([
        listAccounts({ bu: forcedBu }),
        listOpportunities({ bu: forcedBu }),
        listLeads({ bu: forcedBu }),
      ]);
      const allowed = new Set<string>([
        ...accs.map(a => a.account_id),
        ...opps.map(o => o.opportunity_id),
        ...leads.map(l => l.lead_id),
      ]);
      data = data.filter(a => allowed.has(a.related_to_id));
    }
    return ok(data);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "holding", "CRM Activities");
  if (denied) return denied;

  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.activity_type || !data.related_to_type || !data.related_to_id || !data.subject)
        return err("activity_type, related_to_type, related_to_id and subject required", 400);
      const row = await createActivity({
        activity_type:   data.activity_type,
        related_to_type: data.related_to_type,
        related_to_id:   data.related_to_id,
        subject:         data.subject,
        description:     data.description ?? null,
        outcome:         data.outcome     ?? null,
        scheduled_at:    data.scheduled_at ?? null,
        status:          data.status      ?? "completed",
        created_by:      data.created_by  ?? null,
      });
      return ok(row as CrmActivity);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
