import { NextResponse } from "next/server";
import { updateAPEntry, deleteAPEntry } from "@/lib/ap-db";
import type { UpdateAPEntryInput } from "@/lib/ap-shared";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as UpdateAPEntryInput;
    await updateAPEntry(params.id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "AP entry not found") {
      return NextResponse.json({ error: "AP entry not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteAPEntry(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
