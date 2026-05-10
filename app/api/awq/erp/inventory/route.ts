// ─── GET/POST /api/awq/erp/inventory — Inventory Items & Movements ───────────
//
// GET  → { success: true, items: InventoryItem[], movements: InventoryMovement[] }
// POST { action: "upsert_item",   item: InventoryItem }       → upsert item
// POST { action: "delete_item",   id: string }                → delete item + movements
// POST { action: "add_movement",  movement: InventoryMovement } → add movement

import { NextRequest, NextResponse } from "next/server";
import {
  getInventoryItems,
  getInventoryMovements,
  upsertInventoryItem,
  deleteInventoryItem,
  addInventoryMovement,
  initERPDB,
  type InventoryItem,
  type InventoryMovement,
} from "@/lib/erp-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initERPDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, ...data as object }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const bu     = req.nextUrl.searchParams.get("bu")     ?? undefined;
    const itemId = req.nextUrl.searchParams.get("itemId") ?? undefined;
    const [items, movements] = await Promise.all([
      getInventoryItems(bu),
      getInventoryMovements(itemId),
    ]);
    return NextResponse.json({ success: true, items, movements });
  } catch (e) {
    return err(String(e), 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const body = await req.json();
    const { action } = body;

    if (action === "upsert_item") {
      const item = body.item as InventoryItem;
      if (!item?.id) return err("item.id required");
      await upsertInventoryItem(item);
      return ok({ id: item.id });
    }

    if (action === "delete_item") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteInventoryItem(id);
      return ok({ id });
    }

    if (action === "add_movement") {
      const movement = body.movement as InventoryMovement;
      if (!movement?.id) return err("movement.id required");
      await addInventoryMovement(movement);
      return ok({ id: movement.id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
