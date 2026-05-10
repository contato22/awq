// ─── GET/POST /api/awq/erp/purchases — Purchase Orders ───────────────────────
//
// GET  → { success: true, data: PurchaseOrder[] }
// POST { action: "upsert", order: PurchaseOrder } → upsert one order
// POST { action: "delete", id: string }           → delete one order

import { NextRequest, NextResponse } from "next/server";
import {
  getPurchaseOrders,
  upsertPurchaseOrder,
  deletePurchaseOrder,
  initERPDB,
  type PurchaseOrder,
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
    return ok(await getPurchaseOrders(bu));
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
      const order = body.order as PurchaseOrder;
      if (!order?.id) return err("order.id required");
      await upsertPurchaseOrder(order);
      return ok({ id: order.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deletePurchaseOrder(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
