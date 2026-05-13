import { NextRequest, NextResponse } from "next/server";
import { listDocuments, createDocument, updateDocument, deleteDocument } from "@/lib/dms-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listDocuments() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createDocument(await req.json()) }, { status: 201 });
}
export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const row = await updateDocument(id, rest);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteDocument(id);
  return NextResponse.json({ ok: true });
}
