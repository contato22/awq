import { NextRequest, NextResponse } from "next/server";
import {
  getProject, updateProject,
  listTasks, listMilestones, listAllocations,
  listTimeEntries, listRisks, listIssues,
  SEED_PROJECTS,
} from "@/lib/ppm-db";
import type { BuCode } from "@/lib/ppm-types";
import { getAuthIdentity } from "@/lib/api-auth";

export function generateStaticParams() {
  return SEED_PROJECTS.map(p => ({ id: p.project_id }));
}

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const identity = await getAuthIdentity(req);
    if (!identity) return err("Não autenticado", 401);
    const lockedBU = (identity.buLock ?? undefined) as BuCode | undefined;
    const project = await getProject(id);
    if (!project) return err("Project not found", 404);
    if (lockedBU && project.bu_code !== lockedBU) return err("Project not found", 404);
    const [tasks, milestones, allocations, timeEntries, risks, issues] = await Promise.all([
      listTasks(id),
      listMilestones(id),
      listAllocations(id),
      listTimeEntries({ project_id: id }),
      listRisks(id),
      listIssues(id),
    ]);
    return ok({ project, tasks, milestones, allocations, timeEntries, risks, issues });
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body  = await req.json();
    const updated = await updateProject(params.id, body);
    if (!updated) return err("Project not found", 404);
    return ok(updated);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
