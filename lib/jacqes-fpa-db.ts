import { sql } from "@/lib/db";
import { JACQES_CLIENTS } from "@/lib/jacqes-customers";

export type JacqesClient = {
  id: string; nome: string; fee: number; status: string;
  alloc: string; email: string; phone: string;
  segmento: string; since: string; notes: string;
};
export type JacqesFpaPeriod = {
  id: string; periodo: string; receita_bruta: number; deducoes: number;
  cogs: number; pessoal: number; adm_marketing: number;
  outras_despesas: number; resultado_fin: number; notes: string;
};

async function ensureSeeded(): Promise<void> {
  if (!sql) return;
  const count = await sql`SELECT COUNT(*)::int AS n FROM jacqes_clients`;
  if (Number(count[0]?.n) > 0) return;
  for (const c of JACQES_CLIENTS) {
    await sql`INSERT INTO jacqes_clients (nome, fee, status, alloc) VALUES (${c.nome}, ${c.fee}, ${c.status}, ${c.alloc}) ON CONFLICT DO NOTHING`;
  }
}

export async function listClients(): Promise<JacqesClient[]> {
  if (!sql) return JACQES_CLIENTS.map((c, i) => ({ id: String(i), email: "", phone: "", segmento: "", since: "", notes: "", ...c }));
  await ensureSeeded();
  const rows = await sql`SELECT id,nome,fee,status,alloc,email,phone,segmento,since,notes FROM jacqes_clients ORDER BY nome`;
  return rows as unknown as JacqesClient[];
}
export async function createClient(d: Omit<JacqesClient,"id">): Promise<JacqesClient> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO jacqes_clients ${sql(d)} RETURNING id,nome,fee,status,alloc,email,phone,segmento,since,notes`;
  return r as unknown as JacqesClient;
}
export async function updateClient(id: string, d: Partial<Omit<JacqesClient,"id">>): Promise<JacqesClient|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE jacqes_clients SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,nome,fee,status,alloc,email,phone,segmento,since,notes`;
  return rows[0] as unknown as JacqesClient ?? null;
}
export async function deleteClient(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM jacqes_clients WHERE id=${id}`;
}

export async function listPeriods(): Promise<JacqesFpaPeriod[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,periodo,receita_bruta,deducoes,cogs,pessoal,adm_marketing,outras_despesas,resultado_fin,notes FROM jacqes_fpa_periods ORDER BY periodo DESC`;
  return rows as unknown as JacqesFpaPeriod[];
}
export async function upsertPeriod(d: Omit<JacqesFpaPeriod,"id">): Promise<JacqesFpaPeriod> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`
    INSERT INTO jacqes_fpa_periods ${sql(d)}
    ON CONFLICT (periodo) DO UPDATE SET
      receita_bruta=${d.receita_bruta}, deducoes=${d.deducoes}, cogs=${d.cogs},
      pessoal=${d.pessoal}, adm_marketing=${d.adm_marketing},
      outras_despesas=${d.outras_despesas}, resultado_fin=${d.resultado_fin},
      notes=${d.notes}, updated_at=NOW()
    RETURNING id,periodo,receita_bruta,deducoes,cogs,pessoal,adm_marketing,outras_despesas,resultado_fin,notes
  `;
  return r as unknown as JacqesFpaPeriod;
}
