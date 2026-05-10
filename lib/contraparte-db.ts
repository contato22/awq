// ─── Contrapartes — Supabase Database Layer ───────────────────────────────────
//
// Replaces the IndexedDB implementation in lib/idb.ts + lib/contrapartes-repo.ts.
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (awq_contrapartes)
//   DATABASE_URL unset → returns [] / no-op (client falls back to IndexedDB)

import { sql } from "./db";
import type { Contraparte } from "./contraparte-types";

let _ready = false;

export async function initContraparteDB(): Promise<void> {
  if (!sql || _ready) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS awq_contrapartes (
        id               TEXT PRIMARY KEY,
        tipo             TEXT NOT NULL,
        papel            TEXT NOT NULL,
        razao_social     TEXT NOT NULL,
        nome_fantasia    TEXT,
        cnpj_cpf         TEXT NOT NULL,
        ie               TEXT,
        im               TEXT,
        regime           TEXT NOT NULL,
        email_financeiro TEXT,
        telefone         TEXT,
        cep              TEXT,
        logradouro       TEXT,
        numero           TEXT,
        complemento      TEXT,
        bairro           TEXT,
        cidade           TEXT,
        uf               TEXT,
        banco            TEXT,
        agencia          TEXT,
        conta            TEXT,
        pix              TEXT,
        bu               TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'ativo',
        observacoes      TEXT,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL,
        deleted_at       TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_contraparte_papel  ON awq_contrapartes(papel)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contraparte_bu     ON awq_contrapartes(bu)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contraparte_status ON awq_contrapartes(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contraparte_cnpj   ON awq_contrapartes(cnpj_cpf)`;
    _ready = true;
  } catch { /* DB unavailable */ }
}

function rowToContraparte(r: Record<string, unknown>): Contraparte {
  return {
    id:              r.id as string,
    tipo:            r.tipo as Contraparte["tipo"],
    papel:           r.papel as Contraparte["papel"],
    razaoSocial:     r.razao_social as string,
    nomeFantasia:    (r.nome_fantasia as string) ?? undefined,
    cnpjCpf:         r.cnpj_cpf as string,
    ie:              (r.ie as string)    ?? undefined,
    im:              (r.im as string)    ?? undefined,
    regime:          r.regime as Contraparte["regime"],
    emailFinanceiro: (r.email_financeiro as string) ?? undefined,
    telefone:        (r.telefone as string) ?? undefined,
    cep:             (r.cep as string)   ?? undefined,
    logradouro:      (r.logradouro as string) ?? undefined,
    numero:          (r.numero as string) ?? undefined,
    complemento:     (r.complemento as string) ?? undefined,
    bairro:          (r.bairro as string) ?? undefined,
    cidade:          (r.cidade as string) ?? undefined,
    uf:              (r.uf as string)    ?? undefined,
    banco:           (r.banco as string) ?? undefined,
    agencia:         (r.agencia as string) ?? undefined,
    conta:           (r.conta as string) ?? undefined,
    pix:             (r.pix as string)   ?? undefined,
    bu:              r.bu as string,
    status:          r.status as Contraparte["status"],
    observacoes:     (r.observacoes as string) ?? undefined,
    createdAt:       r.created_at as string,
    updatedAt:       r.updated_at as string,
    deletedAt:       (r.deleted_at as string) ?? undefined,
  };
}

export async function listContrapartesDB(filters?: {
  papel?: string;
  bu?: string;
  status?: string;
  q?: string;
}): Promise<Contraparte[]> {
  await initContraparteDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM awq_contrapartes
    WHERE deleted_at IS NULL
      AND (${filters?.papel  ?? null}::text IS NULL OR papel  = ${filters?.papel  ?? null})
      AND (${filters?.bu     ?? null}::text IS NULL OR bu     = ${filters?.bu     ?? null})
      AND (${filters?.status ?? null}::text IS NULL OR status = ${filters?.status ?? null})
    ORDER BY razao_social ASC
  `;
  const results = rows.map(rowToContraparte);
  if (!filters?.q) return results;
  const q = filters.q.toLowerCase();
  return results.filter((c) =>
    [c.razaoSocial, c.nomeFantasia, c.cnpjCpf, c.emailFinanceiro]
      .filter(Boolean).join(" ").toLowerCase().includes(q)
  );
}

export async function getContraparteDB(id: string): Promise<Contraparte | null> {
  await initContraparteDB();
  if (!sql) return null;
  const rows = await sql`SELECT * FROM awq_contrapartes WHERE id = ${id} LIMIT 1`;
  return rows.length ? rowToContraparte(rows[0]) : null;
}

export async function upsertContraparteDB(c: Contraparte): Promise<void> {
  await initContraparteDB();
  if (!sql) return;
  await sql`
    INSERT INTO awq_contrapartes
      (id, tipo, papel, razao_social, nome_fantasia, cnpj_cpf, ie, im, regime,
       email_financeiro, telefone, cep, logradouro, numero, complemento, bairro,
       cidade, uf, banco, agencia, conta, pix, bu, status, observacoes,
       created_at, updated_at, deleted_at)
    VALUES
      (${c.id}, ${c.tipo}, ${c.papel}, ${c.razaoSocial}, ${c.nomeFantasia ?? null},
       ${c.cnpjCpf}, ${c.ie ?? null}, ${c.im ?? null}, ${c.regime},
       ${c.emailFinanceiro ?? null}, ${c.telefone ?? null}, ${c.cep ?? null},
       ${c.logradouro ?? null}, ${c.numero ?? null}, ${c.complemento ?? null},
       ${c.bairro ?? null}, ${c.cidade ?? null}, ${c.uf ?? null},
       ${c.banco ?? null}, ${c.agencia ?? null}, ${c.conta ?? null}, ${c.pix ?? null},
       ${c.bu}, ${c.status}, ${c.observacoes ?? null},
       ${c.createdAt}, ${c.updatedAt}, ${c.deletedAt ?? null})
    ON CONFLICT (id) DO UPDATE SET
      tipo             = EXCLUDED.tipo,
      papel            = EXCLUDED.papel,
      razao_social     = EXCLUDED.razao_social,
      nome_fantasia    = EXCLUDED.nome_fantasia,
      cnpj_cpf         = EXCLUDED.cnpj_cpf,
      ie               = EXCLUDED.ie,
      im               = EXCLUDED.im,
      regime           = EXCLUDED.regime,
      email_financeiro = EXCLUDED.email_financeiro,
      telefone         = EXCLUDED.telefone,
      cep              = EXCLUDED.cep,
      logradouro       = EXCLUDED.logradouro,
      numero           = EXCLUDED.numero,
      complemento      = EXCLUDED.complemento,
      bairro           = EXCLUDED.bairro,
      cidade           = EXCLUDED.cidade,
      uf               = EXCLUDED.uf,
      banco            = EXCLUDED.banco,
      agencia          = EXCLUDED.agencia,
      conta            = EXCLUDED.conta,
      pix              = EXCLUDED.pix,
      bu               = EXCLUDED.bu,
      status           = EXCLUDED.status,
      observacoes      = EXCLUDED.observacoes,
      updated_at       = EXCLUDED.updated_at,
      deleted_at       = EXCLUDED.deleted_at
  `;
}

export async function softDeleteContraparteDB(id: string): Promise<void> {
  await initContraparteDB();
  if (!sql) return;
  const now = new Date().toISOString();
  await sql`
    UPDATE awq_contrapartes
    SET deleted_at = ${now}, status = 'inativo', updated_at = ${now}
    WHERE id = ${id}
  `;
}
