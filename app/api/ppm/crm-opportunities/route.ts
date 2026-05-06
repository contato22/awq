import { NextRequest, NextResponse } from "next/server";
import { listCrmOpportunities, createCrmOpportunity, updateCrmOpportunity } from "@/lib/ppm-db";

function ok(data: unknown)         { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400) { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const p      = req.nextUrl.searchParams;
    const linked = p.get("linked") as "linked" | "unlinked" | null;
    return ok(await listCrmOpportunities(linked ?? undefined));
  } catch (e) { return err((e as Error).message, 500); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title)          return err("title is required");
    if (!body.customer_name)  return err("customer_name is required");
    if (!body.bu_code)        return err("bu_code is required");
    if (body.value == null)   return err("value is required");
    return ok(await createCrmOpportunity({
      title:          body.title,
      customer_name:  body.customer_name,
      customer_id:    body.customer_id ?? `cust-${Date.now()}`,
      bu_code:        body.bu_code,
      stage:          body.stage ?? "Qualificação",
      value:          body.value,
      probability:    body.probability ?? 50,
      expected_close: body.expected_close ?? new Date(Date.now() + 86400000 * 90).toISOString().slice(0, 10),
      owner:          body.owner ?? "sistema",
      linked_project_id: body.linked_project_id,
    }));
  } catch (e) { return err((e as Error).message, 500); }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { opportunity_id, ...patch } = body;
    if (!opportunity_id) return err("opportunity_id is required");
    const updated = await updateCrmOpportunity(opportunity_id, patch);
    if (!updated) return err("Opportunity not found", 404);
    return ok(updated);
  } catch (e) { return err((e as Error).message, 500); }
}
