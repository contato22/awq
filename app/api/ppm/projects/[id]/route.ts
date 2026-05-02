import { NextRequest, NextResponse } from "next/server";
import {
  getProject, updateProject,
  listTasks, listMilestones, listAllocations,
  listTimeEntries, listRisks, listIssues,
  SEED_PROJECTS,
} from "@/lib/ppm-db";

export function generateStaticParams() {
  return SEED_PROJECTS.map(p => ({ id: p.project_id }));
}

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const [project, tasks, milestones, allocations, timeEntries, risks, issues] = await Promise.all([
      getProject(id),
      listTasks(id),
      listMilestones(id),
      listAllocations(id),
      listTimeEntries({ project_id: id }),
      listRisks(id),
      listIssues(id),
    ]);
    if (!project) return err("Project not found", 404);
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
