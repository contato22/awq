// ─── GET/POST /api/awq/ap-ar — Manual AP/AR items ────────────────────────────
//
// Stores the simplified manual contas-a-pagar/receber created in /awq/ap-ar.
// GET  → list all items
// POST { action: "upsert", item }      → upsert one item
// POST { action: "upsert_many", items } → bulk upsert (initial sync from localStorage)
// POST { action: "delete", id }        → delete one item

import { NextRequest, NextResponse } from "next/server";
import {
  getAllAPARItems,
  upsertAPARItem,
  upsertManyAPARItems,
  deleteAPARItem,
  initAWQAPARDB,
  type APARManualItem,
} from "@/lib/awq-apar-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initAWQAPARDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(): Promise<NextResponse> {
  try {
    await ensureDB();
    return ok(await getAllAPARItems());
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
      const item = body.item as APARManualItem;
      if (!item?.id) return err("item.id required");
      await upsertAPARItem(item);
      return ok({ id: item.id });
    }

    if (action === "upsert_many") {
      const items = body.items as APARManualItem[];
      if (!Array.isArray(items)) return err("items must be an array");
      await upsertManyAPARItems(items);
      return ok({ count: items.length });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteAPARItem(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
