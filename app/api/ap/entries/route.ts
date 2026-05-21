import { NextResponse } from "next/server";
import { getAllAPEntries, createAPEntry } from "@/lib/ap-db";
import type { CreateAPEntryInput } from "@/lib/ap-shared";

export async function GET() {
  try {
    const entries = await getAllAPEntries();
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateAPEntryInput;

    if (!body.accountCode || !body.supplierName || !body.amount || !body.dueDate || !body.issueDate) {
      return NextResponse.json({ error: "Campos obrigatórios: accountCode, supplierName, amount, issueDate, dueDate" }, { status: 400 });
    }
    if (body.amount <= 0) {
      return NextResponse.json({ error: "Valor deve ser positivo" }, { status: 400 });
    }

    const entry = await createAPEntry(body);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
