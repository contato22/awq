import { sql } from "@/lib/db";

export type DmsDocument = {
  id: string; name: string; category: string; tags: string[];
  file_url: string | null; owner: string; status: string; version: number;
};
export type DmsDocumentVersion = {
  id: string; document_id: string; version: number;
  file_url: string | null; changed_by: string; notes: string;
  created_at: string;
};

export async function listDocuments(): Promise<DmsDocument[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,category,tags,file_url,owner,status,version FROM dms_documents WHERE status!='Arquivado' ORDER BY updated_at DESC`;
  return rows as unknown as DmsDocument[];
}
export async function createDocument(d: Omit<DmsDocument,"id">): Promise<DmsDocument> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO dms_documents ${sql(d)} RETURNING id,name,category,tags,file_url,owner,status,version`;
  return r as unknown as DmsDocument;
}
export async function updateDocument(id: string, d: Partial<Omit<DmsDocument,"id">>): Promise<DmsDocument|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE dms_documents SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,name,category,tags,file_url,owner,status,version`;
  return rows[0] as unknown as DmsDocument ?? null;
}
export async function deleteDocument(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM dms_documents WHERE id=${id}`;
}

export async function listVersions(document_id: string): Promise<DmsDocumentVersion[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,document_id,version,file_url,changed_by,notes,created_at::text AS created_at FROM dms_document_versions WHERE document_id=${document_id} ORDER BY version DESC`;
  return rows as unknown as DmsDocumentVersion[];
}
export async function createVersion(d: Omit<DmsDocumentVersion,"id"|"created_at">): Promise<DmsDocumentVersion> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO dms_document_versions ${sql(d)} RETURNING id,document_id,version,file_url,changed_by,notes,created_at::text AS created_at`;
  return r as unknown as DmsDocumentVersion;
}
