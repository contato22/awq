// GET  /api/ap-ar?bu=<bu|all>  — lista itens (filtrado por BU ou todos)
// POST /api/ap-ar               — cria novo item

import { NextRequest, NextResponse } from "next/server";
import { apiGuard }                  from "@/lib/api-guard";
import { initAPARDB, listAPARItems, createAPARItem } from "@/lib/ap-ar-db";
import type { APARBU, APARType, APARStatus }         from "@/lib/ap-ar-db";

export const runtime = "nodejs";

const VALID_BUS:    APARBU[]     = ["awq", "jacqes", "caza", "venture", "advisor"];
const VALID_TYPES:  APARType[]   = ["ap", "ar"];
const VALID_STATUS: APARStatus[] = ["pending", "overdue", "settled"];

function today() { return new Date().toISOString().slice(0, 10); }
function computeStatus(dueDate: string, current: APARStatus): APARStatus {
  if (current === "settled") return "settled";
  if (dueDate && dueDate < today()) return "overdue";
  return "pending";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "financeiro", "AP & AR — lista");
  if (denied) return denied;

  await initAPARDB();

  const bu = new URL(req.url).searchParams.get("bu");
  const buScope = (bu && bu !== "all" && VALID_BUS.includes(bu as APARBU))
    ? (bu as APARBU)
    : null;

  const items = await listAPARItems(buScope);
  // refresh overdue status on read
  const refreshed = items.map((item) =>
    item.status !== "settled"
      ? { ...item, status: computeStatus(item.due_date, item.status) }
      : item
  );
  return NextResponse.json(refreshed);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "financeiro", "AP & AR — criar item");
  if (denied) return denied;

  await initAPARDB();

  try {
    const body = await req.json();

    if (!body.description?.trim())
      return NextResponse.json({ error: "description é obrigatório" }, { status: 400 });
    if (!body.due_date)
      return NextResponse.json({ error: "due_date é obrigatório" }, { status: 400 });
    if (!VALID_TYPES.includes(body.type))
      return NextResponse.json({ error: "type deve ser 'ap' ou 'ar'" }, { status: 400 });
    if (!VALID_BUS.includes(body.bu))
      return NextResponse.json({ error: "bu inválido" }, { status: 400 });

    const amount = parseFloat(body.amount) || 0;
    if (amount <= 0)
      return NextResponse.json({ error: "amount deve ser maior que zero" }, { status: 400 });

    const status = computeStatus(body.due_date, "pending");

    const item = await createAPARItem({
      type:        body.type        as APARType,
      bu:          body.bu          as APARBU,
      description: body.description.trim(),
      entity:      body.entity?.trim() ?? "",
      amount,
      due_date:    body.due_date,
      status,
      category:    body.category?.trim() ?? "",
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
