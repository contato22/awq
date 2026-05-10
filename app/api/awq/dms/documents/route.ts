// ─── GET/POST /api/awq/dms/documents — DMS Documents ──────────────────────────
//
// GET               → list all documents (optionally filtered by ?bu=)
// GET ?id=          → single document
// POST { action: "upsert", document: DMSDocument } → upsert one document
// POST { action: "delete", id: string }            → delete one document

import { NextRequest, NextResponse } from "next/server";
import {
  getDMSDocuments,
  getDMSDocument,
  upsertDMSDocument,
  deleteDMSDocument,
  initDMSDB,
  type DMSDocument,
} from "@/lib/dms-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initDMSDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const doc = await getDMSDocument(id);
      return ok(doc);
    }
    const bu = req.nextUrl.searchParams.get("bu") ?? undefined;
    return ok(await getDMSDocuments(bu));
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
      const document = body.document as DMSDocument;
      if (!document?.id) return err("document.id required");
      await upsertDMSDocument(document);
      return ok({ id: document.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteDMSDocument(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
