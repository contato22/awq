import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject, getPortfolioMetrics } from "@/lib/ppm-db";
import type { BuCode, ProjectStatus, HealthStatus, ProjectType } from "@/lib/ppm-types";

function ok(data: unknown)              { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)     { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const [projects, metrics] = await Promise.all([
      listProjects({
        bu_code:      (p.get("bu_code")      ?? undefined) as BuCode | undefined,
        status:       (p.get("status")       ?? undefined) as ProjectStatus | undefined,
        health_status:(p.get("health_status") ?? undefined) as HealthStatus | undefined,
        project_type: (p.get("project_type") ?? undefined) as ProjectType | undefined,
        search:        p.get("search")       ?? undefined,
      }),
      getPortfolioMetrics(),
    ]);
    return ok({ projects, metrics });
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_name, bu_code, project_type, contract_type, start_date, planned_end_date, budget_cost, budget_revenue } = body;

    if (!project_name)    return err("project_name is required");
    if (!bu_code)         return err("bu_code is required");
    if (!project_type)    return err("project_type is required");
    if (!contract_type)   return err("contract_type is required");
    if (!start_date)      return err("start_date is required");
    if (!planned_end_date)return err("planned_end_date is required");
    if (budget_revenue == null) return err("budget_revenue is required");
    if (budget_cost    == null) return err("budget_cost is required");

    const project = await createProject({
      ...body,
      phase:        body.phase        ?? "initiation",
      status:       body.status       ?? "active",
      health_status:body.health_status ?? "green",
      priority:     body.priority     ?? "medium",
    });
    return ok(project);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
