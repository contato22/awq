import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask, deleteTask } from "@/lib/dms-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listTasks() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createTask(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
