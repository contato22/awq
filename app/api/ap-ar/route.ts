export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { listAwqApArItems, createAwqApArItem, updateAwqApArItem, deleteAwqApArItem } from "@/lib/awq-ap-ar-db";

function toClient(r: Awaited<ReturnType<typeof listAwqApArItems>>[number]) {
  return {
    id: r.id,
    type: r.item_type,
    bu: r.bu,
    description: r.description,
    entity: r.entity,
    amount: r.amount,
    dueDate: r.due_date,
    status: r.status,
    category: r.category,
    createdAt: r.created_at,
  };
}

export async function GET() {
  try {
    const rows = await listAwqApArItems();
    return NextResponse.json({ data: rows.map(toClient) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = await createAwqApArItem({
      item_type: body.type ?? "ap",
      bu: body.bu ?? "awq",
      description: body.description ?? "",
      entity: body.entity ?? "",
      amount: Number(body.amount ?? 0),
      due_date: body.dueDate ?? null,
      status: body.status ?? "pending",
      category: body.category ?? "",
    });
    return NextResponse.json({ data: toClient(row) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;
    const row = await updateAwqApArItem(id, {
      item_type: rest.type,
      bu: rest.bu,
      description: rest.description,
      entity: rest.entity,
      amount: rest.amount !== undefined ? Number(rest.amount) : undefined,
      due_date: rest.dueDate,
      status: rest.status,
      category: rest.category,
    });
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ data: toClient(row) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteAwqApArItem(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
