// ─── GET/POST /api/awq/dms/collaborators — DMS Document Collaborators ─────────
//
// GET ?document_id=                                          → list collaborators
// POST { action: "upsert", collaborator: DocumentCollaborator } → upsert one
// POST { action: "remove", id: string }                         → remove one

import { NextRequest, NextResponse } from "next/server";
import {
  getDocumentCollaborators,
  upsertDocumentCollaborator,
  removeDocumentCollaborator,
  initDMSDB,
  type DocumentCollaborator,
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
    return ok(await getDocumentCollaborators(documentId));
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
      const collaborator = body.collaborator as DocumentCollaborator;
      if (!collaborator?.id) return err("collaborator.id required");
      if (!collaborator?.document_id) return err("collaborator.document_id required");
      await upsertDocumentCollaborator(collaborator);
      return ok({ id: collaborator.id });
    }

    if (action === "remove") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await removeDocumentCollaborator(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
