// PATCH /api/crm/activities/[id]  — atualiza atividade
// DELETE /api/crm/activities/[id] — remove atividade
import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, updateActivity, deleteActivity } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initCrmDB();
    const body = await req.json();
    const activity = await updateActivity(params.id, body);
    if (!activity) return err("Activity not found", 404);
    return ok(activity);
  } catch (e) { return err(String(e)); }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initCrmDB();
    const removed = await deleteActivity(params.id);
    if (!removed) return err("Activity not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (e) { return err(String(e)); }
}
