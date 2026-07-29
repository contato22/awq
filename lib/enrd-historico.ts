// ─── ENRD · Histórico desde o início da BU (dez/2025) ────────────────────────
// Combina DUAS linhas do tempo, cada uma com sua própria fonte de verdade:
//
//   VENDAS (comercial) — fechamentos (closed_won) do CRM (crm_opportunities,
//   bu=ENRD), bucketizados por actual_close_date. Funil aberto é um SNAPSHOT
//   (não tem data de origem confiável pra bucketizar por mês).
//
//   PÓS-VENDA/O&M — o backfill do CSV histórico (Notion, importado em
//   enrd_posvenda_os) cobre set/2025 em diante; onde já existe dado REAL da
//   Cora (recebidoCora, via lib/enrd-reconciliacao.ts) para o mesmo mês, a
//   Cora é a fonte de verdade — o CSV é só CRM (não bate caixa). Nunca soma os
//   dois pro mesmo mês (dado duplicaria); usa Cora quando disponível, CSV como
//   fallback só pros meses sem dado bancário ainda.

import { erpAdmin, erpAnon } from "@/lib/supabase";
import { getOS } from "@/lib/enrd-posvenda-db";
import { getReconciliacaoMes } from "@/lib/enrd-reconciliacao";

function db() {
  return erpAdmin ?? erpAnon;
}

export type MesOM = {
  mes: string; // AAAA-MM
  nOS: number;
  valor: number;
  fonte: "cora_real" | "csv_historico" | "sem_dado";
};

export type HistoricoOM = {
  meses: MesOM[];
  totalValor: number;
  totalOS: number;
  desde: string;
};

export type HistoricoVendas = {
  vendidoPorMes: { mes: string; nDeals: number; valor: number }[];
  totalVendido: number;
  nVendasFechadas: number;
  funilAberto: { stage: string; nDeals: number; valor: number }[];
  totalFunilAberto: number;
  taxaConversao: number; // fechados / (fechados + perdidos)
};

function monthsSince(desde: string): string[] {
  const [y0, m0] = desde.split("-").map(Number);
  const now = new Date();
  const out: string[] = [];
  let y = y0, m = m0;
  while (y < now.getUTCFullYear() || (y === now.getUTCFullYear() && m <= now.getUTCMonth() + 1)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

// ── Pós-venda/O&M: backfill CSV × Cora real, mês a mês ───────────────────────
export async function getHistoricoOM(desde: string = "2025-09"): Promise<HistoricoOM> {
  const os = await getOS(); // [] se enrd_posvenda_os ainda não existir — nunca lança
  const porMes = new Map<string, { nOS: number; valor: number }>();
  for (const o of os) {
    if (!o.data) continue;
    const mes = o.data.slice(0, 7);
    if (mes < desde) continue;
    const cur = porMes.get(mes) ?? { nOS: 0, valor: 0 };
    cur.nOS += 1;
    cur.valor += o.valor;
    porMes.set(mes, cur);
  }

  const meses: MesOM[] = [];
  for (const mes of monthsSince(desde)) {
    let recon;
    try {
      recon = await getReconciliacaoMes(mes);
    } catch {
      recon = null;
    }
    const temCoraReal = recon && recon.coraDisponivel && recon.nCoraTx > 0;
    const backfill = porMes.get(mes);
    if (temCoraReal) {
      meses.push({ mes, nOS: backfill?.nOS ?? 0, valor: recon!.recebidoCora, fonte: "cora_real" });
    } else if (backfill) {
      meses.push({ mes, nOS: backfill.nOS, valor: backfill.valor, fonte: "csv_historico" });
    } else {
      meses.push({ mes, nOS: 0, valor: 0, fonte: "sem_dado" });
    }
  }

  const totalValor = meses.reduce((s, m) => s + m.valor, 0);
  const totalOS = meses.reduce((s, m) => s + m.nOS, 0);
  return { meses, totalValor, totalOS, desde };
}

// ── Vendas (comercial): fechamentos + funil aberto ───────────────────────────
export async function getHistoricoVendas(desde: string = "2025-12-01"): Promise<HistoricoVendas> {
  const client = db();
  if (!client) {
    return { vendidoPorMes: [], totalVendido: 0, nVendasFechadas: 0, funilAberto: [], totalFunilAberto: 0, taxaConversao: 0 };
  }
  const { data, error } = await client
    .from("crm_opportunities")
    .select("stage,deal_value,actual_close_date")
    .eq("bu", "ENRD");
  if (error || !data) {
    return { vendidoPorMes: [], totalVendido: 0, nVendasFechadas: 0, funilAberto: [], totalFunilAberto: 0, taxaConversao: 0 };
  }

  type Row = { stage: string; deal_value: number | null; actual_close_date: string | null };
  const rows = data as Row[];

  const won = rows.filter((r) => r.stage === "closed_won" && r.actual_close_date && r.actual_close_date >= desde.slice(0, 7));
  const porMes = new Map<string, { nDeals: number; valor: number }>();
  for (const r of won) {
    const mes = r.actual_close_date!.slice(0, 7);
    const cur = porMes.get(mes) ?? { nDeals: 0, valor: 0 };
    cur.nDeals += 1;
    cur.valor += r.deal_value ?? 0;
    porMes.set(mes, cur);
  }
  const vendidoPorMes = [...porMes.entries()].map(([mes, v]) => ({ mes, ...v })).sort((a, b) => a.mes.localeCompare(b.mes));
  const totalVendido = vendidoPorMes.reduce((s, m) => s + m.valor, 0);

  const abertos = ["qualification", "proposal", "negotiation"];
  const funilPorStage = new Map<string, { nDeals: number; valor: number }>();
  for (const r of rows) {
    if (!abertos.includes(r.stage)) continue;
    const cur = funilPorStage.get(r.stage) ?? { nDeals: 0, valor: 0 };
    cur.nDeals += 1;
    cur.valor += r.deal_value ?? 0;
    funilPorStage.set(r.stage, cur);
  }
  const funilAberto = [...funilPorStage.entries()].map(([stage, v]) => ({ stage, ...v }));
  const totalFunilAberto = funilAberto.reduce((s, f) => s + f.valor, 0);

  const nWon = rows.filter((r) => r.stage === "closed_won").length;
  const nLost = rows.filter((r) => r.stage === "closed_lost").length;
  const taxaConversao = nWon + nLost > 0 ? nWon / (nWon + nLost) : 0;

  return {
    vendidoPorMes,
    totalVendido,
    nVendasFechadas: rows.filter((r) => r.stage === "closed_won").length,
    funilAberto,
    totalFunilAberto,
    taxaConversao,
  };
}
