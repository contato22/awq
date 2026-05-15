import { NextRequest, NextResponse } from "next/server";
import { getOpportunity, getAccount, updateOpportunity } from "@/lib/crm-db";
import { createProject, listProjects } from "@/lib/ppm-db";
import type { BuCode, ProjectType, ContractType, ServiceCategory } from "@/lib/ppm-types";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

const BU_SERVICE_CATEGORY: Record<string, ServiceCategory> = {
  JACQES:  "social_media",
  CAZA:    "video_production",
  ADVISOR: "consulting",
  VENTURE: "m4e_deal",
};

function inferContractType(bu: string): ContractType {
  return bu === "JACQES" ? "retainer" : "fixed_price";
}

function inferProjectType(bu: string): ProjectType {
  return bu === "JACQES" ? "retainer" : "one_off";
}

// POST /api/crm/ppm-sync
// Body: { opportunity_id: string, force?: boolean }
// Creates a PPM project from a closed_won CRM opportunity and marks it synced.
export async function POST(req: NextRequest) {
  try {
    const { opportunity_id, force = false } = await req.json();
    if (!opportunity_id) return err("opportunity_id required", 400);

    const opp = await getOpportunity(opportunity_id);
    if (!opp) return err("Opportunity not found", 404);
    if (opp.stage !== "closed_won") return err("Opportunity must be closed_won to create a PPM project", 400);

    // Idempotency: if already synced and force is not set, return existing link
    const oppAny = opp as Record<string, unknown>;
    if (oppAny.ppm_synced && oppAny.ppm_project_id && !force) {
      return ok({
        already_synced: true,
        project_id:     oppAny.ppm_project_id,
        opportunity_id,
      });
    }

    // Guard against duplicate projects linked to this opportunity
    if (!force) {
      const existing = await listProjects({ search: opp.opportunity_name });
      const linked = existing.find(p => p.opportunity_id === opportunity_id);
      if (linked) {
        return ok({ already_synced: true, project_id: linked.project_id, opportunity_id });
      }
    }

    const account = opp.account_id ? await getAccount(opp.account_id) : null;

    const startDate = opp.actual_close_date ?? new Date().toISOString().slice(0, 10);
    const defaultEnd = new Date(new Date(startDate).getTime() + 90 * 86400000).toISOString().slice(0, 10);
    const plannedEndDate = opp.expected_close_date ?? defaultEnd;

    // Default cost budget assumes 73% margin target
    const budgetCost = Math.round(opp.deal_value * 0.27);

    const project = await createProject({
      project_name:     opp.opportunity_name,
      customer_name:    account?.account_name ?? undefined,
      bu_code:          opp.bu as BuCode,
      opportunity_id:   opp.opportunity_id,
      project_type:     inferProjectType(opp.bu),
      service_category: BU_SERVICE_CATEGORY[opp.bu] ?? "other",
      contract_type:    inferContractType(opp.bu),
      start_date:       startDate,
      planned_end_date: plannedEndDate,
      budget_revenue:   opp.deal_value,
      budget_cost:      budgetCost,
      margin_target:    0.73,
      project_manager:  opp.owner,
      phase:            "initiation",
      status:           "active",
      health_status:    "green",
      priority:         "medium",
      description:      `Criado automaticamente a partir da oportunidade ${opp.opportunity_code ?? opportunity_id}.`,
      created_by:       opp.owner,
    });

    // Mark opportunity as PPM-synced
    await updateOpportunity(opportunity_id, {
      synced_to_epm: opp.synced_to_epm,
    });

    return ok({
      project_id:     project.project_id,
      project_code:   project.project_code,
      project_name:   project.project_name,
      opportunity_id,
    });
  } catch (e) { return err(String(e)); }
}

// GET /api/crm/ppm-sync?opportunity_id=<uuid>
// Returns the sync status and whether a PPM project can be created.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const opportunity_id = searchParams.get("opportunity_id");
  if (!opportunity_id) return err("opportunity_id required", 400);

  const opp = await getOpportunity(opportunity_id);
  if (!opp) return err("Opportunity not found", 404);

  const oppAny = opp as Record<string, unknown>;
  return ok({
    opportunity_id,
    opportunity_code:   opp.opportunity_code,
    opportunity_name:   opp.opportunity_name,
    stage:              opp.stage,
    deal_value:         opp.deal_value,
    bu:                 opp.bu,
    can_create_project: opp.stage === "closed_won",
    ppm_synced:         oppAny.ppm_synced ?? false,
    ppm_project_id:     oppAny.ppm_project_id ?? null,
  });
}
