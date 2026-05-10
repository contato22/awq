// ─── GET/POST /api/awq/dms/versions — DMS Document Versions ───────────────────
//
// GET ?document_id= → list all versions for a document
// POST { action: "add", version: DocumentVersion } → add one version entry

import { NextRequest, NextResponse } from "next/server";
import {
  getDocumentVersions,
  addDocumentVersion,
  initDMSDB,
  type DocumentVersion,
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
    const documentId = req.nextUrl.searchParams.get("document_id");
    if (!documentId) return err("document_id required");
    return ok(await getDocumentVersions(documentId));
  } catch (e) {
    return err(String(e), 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const body = await req.json();
    const { action } = body;

    if (action === "add") {
      const version = body.version as DocumentVersion;
      if (!version?.id) return err("version.id required");
      if (!version?.document_id) return err("version.document_id required");
      await addDocumentVersion(version);
      return ok({ id: version.id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
