// ─── GET/POST /api/awq/erp/sales — Sales Orders ──────────────────────────────
//
// GET  → { success: true, data: SalesOrder[] }
// POST { action: "upsert", order: SalesOrder } → upsert one order
// POST { action: "delete", id: string }        → delete one order

import { NextRequest, NextResponse } from "next/server";
import {
  getSalesOrders,
  upsertSalesOrder,
  deleteSalesOrder,
  initERPDB,
  type SalesOrder,
} from "@/lib/erp-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initERPDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const bu = req.nextUrl.searchParams.get("bu") ?? undefined;
    return ok(await getSalesOrders(bu));
  } catch (e) {
    return err(String(e), 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const body = await req.json();
    const { action } = body;

    if (action === "upsert") {
      const order = body.order as SalesOrder;
      if (!order?.id) return err("order.id required");
      await upsertSalesOrder(order);
      return ok({ id: order.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteSalesOrder(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
