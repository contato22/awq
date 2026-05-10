// ─── DMS (Document Management System) — Database Layer ────────────────────────
//
// Stores documents, version history, and collaborators for the DMS module.
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (dms_documents, dms_document_versions,
//                                          dms_document_collaborators)
//   DATABASE_URL unset → returns [] / null (client uses localStorage as fallback)

import { sql } from "./db";

export type DocumentStatus   = "Rascunho" | "Em Revisão" | "Aprovado" | "Obsoleto" | "Arquivado";
export type DocumentCategory = "Contrato" | "Política" | "Procedimento" | "Relatório" | "Proposta" | "Outros";

export interface DMSDocument {
  id:         string;
  title:      string;
  category:   DocumentCategory;
  owner:      string;
  status:     DocumentStatus;
  version:    string;       // "v1.0", "v2.3"
  size_kb:    number;
  mime_type:  string;       // "application/pdf" | "application/vnd.openxmlformats..."
  tags:       string[];
  bu:         string;
  folder:     string | null; // folder path e.g. "Contratos/2026"
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id:          string;
  document_id: string;
  version:     string;
  changed_by:  string;
  change_note: string;
  size_kb:     number;
  created_at:  string;
}

export interface DocumentCollaborator {
  id:          string;
  document_id: string;
  user_email:  string;
  user_name:   string;
  permission:  "viewer" | "editor" | "owner";
  added_at:    string;
}

let _ready = false;

export async function initDMSDB(): Promise<void> {
  if (!sql || _ready) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS dms_documents (
        id         TEXT PRIMARY KEY,
        title      TEXT NOT NULL,
        category   TEXT,
        owner      TEXT,
        status     TEXT,
        version    TEXT,
        size_kb    NUMERIC,
        mime_type  TEXT,
        tags       TEXT[] DEFAULT '{}',
        bu         TEXT NOT NULL DEFAULT 'awq',
        folder     TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS dms_document_versions (
        id          TEXT PRIMARY KEY,
        document_id TEXT REFERENCES dms_documents(id) ON DELETE CASCADE,
        version     TEXT,
        changed_by  TEXT,
        change_note TEXT,
        size_kb     NUMERIC,
        created_at  TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS dms_document_collaborators (
        id          TEXT PRIMARY KEY,
        document_id TEXT REFERENCES dms_documents(id) ON DELETE CASCADE,
        user_email  TEXT,
        user_name   TEXT,
        permission  TEXT,
        added_at    TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_dms_docs_bu      ON dms_documents(bu)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_dms_versions_doc ON dms_document_versions(document_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_dms_collab_doc   ON dms_document_collaborators(document_id)`;
    _ready = true;
  } catch { /* DB unavailable — client falls back to localStorage */ }
}

function rowToDocument(r: Record<string, unknown>): DMSDocument {
  return {
    id:         r.id         as string,
    title:      r.title      as string,
    category:   r.category   as DocumentCategory,
    owner:      r.owner      as string,
    status:     r.status     as DocumentStatus,
    version:    r.version    as string,
    size_kb:    Number(r.size_kb),
    mime_type:  r.mime_type  as string,
    tags:       Array.isArray(r.tags) ? r.tags as string[] : [],
    bu:         r.bu         as string,
    folder:     (r.folder    as string) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function rowToVersion(r: Record<string, unknown>): DocumentVersion {
  return {
    id:          r.id          as string,
    document_id: r.document_id as string,
    version:     r.version     as string,
    changed_by:  r.changed_by  as string,
    change_note: r.change_note as string,
    size_kb:     Number(r.size_kb),
    created_at:  r.created_at  as string,
  };
}

function rowToCollaborator(r: Record<string, unknown>): DocumentCollaborator {
  return {
    id:          r.id          as string,
    document_id: r.document_id as string,
    user_email:  r.user_email  as string,
    user_name:   r.user_name   as string,
    permission:  r.permission  as DocumentCollaborator["permission"],
    added_at:    r.added_at    as string,
  };
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function getDMSDocuments(bu?: string): Promise<DMSDocument[]> {
  await initDMSDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM dms_documents WHERE bu = ${bu} ORDER BY updated_at DESC, created_at DESC`
    : await sql`SELECT * FROM dms_documents ORDER BY updated_at DESC, created_at DESC`;
  return rows.map(rowToDocument);
}

export async function getDMSDocument(id: string): Promise<DMSDocument | null> {
  await initDMSDB();
  if (!sql) return null;
  const rows = await sql`SELECT * FROM dms_documents WHERE id = ${id} LIMIT 1`;
  return rows.length > 0 ? rowToDocument(rows[0]) : null;
}

export async function upsertDMSDocument(doc: DMSDocument): Promise<void> {
  await initDMSDB();
  if (!sql) return;
  await sql`
    INSERT INTO dms_documents
      (id, title, category, owner, status, version, size_kb, mime_type,
       tags, bu, folder, created_at, updated_at)
    VALUES
      (${doc.id}, ${doc.title}, ${doc.category}, ${doc.owner}, ${doc.status},
       ${doc.version}, ${doc.size_kb}, ${doc.mime_type},
       ${doc.tags}::text[], ${doc.bu}, ${doc.folder ?? null},
       ${doc.created_at}, ${doc.updated_at})
    ON CONFLICT (id) DO UPDATE SET
      title      = EXCLUDED.title,
      category   = EXCLUDED.category,
      owner      = EXCLUDED.owner,
      status     = EXCLUDED.status,
      version    = EXCLUDED.version,
      size_kb    = EXCLUDED.size_kb,
      mime_type  = EXCLUDED.mime_type,
      tags       = EXCLUDED.tags,
      bu         = EXCLUDED.bu,
      folder     = EXCLUDED.folder,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function deleteDMSDocument(id: string): Promise<void> {
  await initDMSDB();
  if (!sql) return;
  await sql`DELETE FROM dms_documents WHERE id = ${id}`;
}

// ─── Document Versions ────────────────────────────────────────────────────────

export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  await initDMSDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM dms_document_versions
    WHERE document_id = ${documentId}
    ORDER BY created_at DESC
  `;
  return rows.map(rowToVersion);
}

export async function addDocumentVersion(v: DocumentVersion): Promise<void> {
  await initDMSDB();
  if (!sql) return;
  await sql`
    INSERT INTO dms_document_versions
      (id, document_id, version, changed_by, change_note, size_kb, created_at)
    VALUES
      (${v.id}, ${v.document_id}, ${v.version}, ${v.changed_by},
       ${v.change_note}, ${v.size_kb}, ${v.created_at})
    ON CONFLICT (id) DO NOTHING
  `;
}

// ─── Document Collaborators ───────────────────────────────────────────────────

export async function getDocumentCollaborators(documentId: string): Promise<DocumentCollaborator[]> {
  await initDMSDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM dms_document_collaborators
    WHERE document_id = ${documentId}
    ORDER BY added_at ASC
  `;
  return rows.map(rowToCollaborator);
}

export async function upsertDocumentCollaborator(c: DocumentCollaborator): Promise<void> {
  await initDMSDB();
  if (!sql) return;
  await sql`
    INSERT INTO dms_document_collaborators
      (id, document_id, user_email, user_name, permission, added_at)
    VALUES
      (${c.id}, ${c.document_id}, ${c.user_email}, ${c.user_name},
       ${c.permission}, ${c.added_at})
    ON CONFLICT (id) DO UPDATE SET
      user_email  = EXCLUDED.user_email,
      user_name   = EXCLUDED.user_name,
      permission  = EXCLUDED.permission
  `;
}

export async function removeDocumentCollaborator(id: string): Promise<void> {
  await initDMSDB();
  if (!sql) return;
  await sql`DELETE FROM dms_document_collaborators WHERE id = ${id}`;
}
