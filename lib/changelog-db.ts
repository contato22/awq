import { sql } from "@/lib/db";

export interface ChangelogEntry {
  id: string;
  data: string;
  modulo: string;
  titulo: string;
  descricao: string;
  tipo: "feature" | "fix" | "melhoria";
  itens: string[];
  created_at?: string;
}

let _ready = false;

export async function initChangelogDB(): Promise<void> {
  if (!sql || _ready) return;
  await sql`
    CREATE TABLE IF NOT EXISTS awq_changelog (
      id          TEXT PRIMARY KEY,
      data        TEXT NOT NULL,
      modulo      TEXT NOT NULL,
      titulo      TEXT NOT NULL,
      descricao   TEXT NOT NULL,
      tipo        TEXT NOT NULL CHECK (tipo IN ('feature','fix','melhoria')),
      itens       JSONB NOT NULL DEFAULT '[]',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_changelog_data ON awq_changelog(data DESC)`;
  _ready = true;
}

export async function getChangelogs(): Promise<ChangelogEntry[]> {
  if (!sql) return [];
  await initChangelogDB();
  const rows = await sql`SELECT * FROM awq_changelog ORDER BY data DESC, created_at DESC`;
  return rows.map((r) => ({
    ...r,
    itens: typeof r.itens === "string" ? JSON.parse(r.itens) : (r.itens ?? []),
  })) as ChangelogEntry[];
}

export async function upsertChangelog(entry: Omit<ChangelogEntry, "created_at">): Promise<void> {
  if (!sql) return;
  await initChangelogDB();
  await sql`
    INSERT INTO awq_changelog (id, data, modulo, titulo, descricao, tipo, itens)
    VALUES (${entry.id}, ${entry.data}, ${entry.modulo}, ${entry.titulo},
            ${entry.descricao}, ${entry.tipo}, ${JSON.stringify(entry.itens)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      data      = EXCLUDED.data,
      modulo    = EXCLUDED.modulo,
      titulo    = EXCLUDED.titulo,
      descricao = EXCLUDED.descricao,
      tipo      = EXCLUDED.tipo,
      itens     = EXCLUDED.itens
  `;
}

export async function deleteChangelog(id: string): Promise<void> {
  if (!sql) return;
  await initChangelogDB();
  await sql`DELETE FROM awq_changelog WHERE id = ${id}`;
}
