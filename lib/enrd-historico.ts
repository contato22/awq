// ─── ENRD · Histórico desde o início da BU (dez/2025) ────────────────────────
// Duas PERÍMETROS distintos, nunca misturados (mesma regra de negócio de todo
// o resto do BI): INTEGRAÇÃO (Felipe — vendas de instalações novas, kWp) e
// PÓS-VENDA/O&M (Miguel — serviços recorrentes: limpeza, manutenção, disjuntor).
//
//   INTEGRAÇÃO — crm_opportunities (bu=ENRD), que vêm da tabela `negocios` do
//   projetos.enerdy (tem kwp/kit_fornecedor — é venda de sistema novo, não
//   O&M). Fechamentos (closed_won) bucketizados por actual_close_date.
//
//   PÓS-VENDA/O&M — DUAS visões complementares, NUNCA somadas uma na outra:
//     (1) "vendido no CRM" — pos_venda_servicos (ao vivo, getLiveProjetosFull)
//         com valor_fechado>0 ou status concluido/fechado. É o que está
//         LANÇADO no sistema — quase sempre subnotificado (poucas semanas de
//         histórico no CRM novo).
//     (2) "executado desde o início" — o backfill do CSV histórico (Notion,
//         em enrd_posvenda_os, FILTRADO pelo mesmo classificarDono() que o
//         resto do BI usa — 3 das 99 OS importadas eram de MONTAGEM
//         ("Instalação de placa"/"Retirar placa"/"Reinstalar"), não O&M, e
//         ficam fora daqui) × Cora real quando existe pro mês (âncora — a
//         mesma reconciliação do relatório/BI diário). Nunca soma CSV+Cora no
//         mesmo mês.

import { erpAdmin, erpAnon } from "@/lib/supabase";
import { getOS } from "@/lib/enrd-posvenda-db";
import { getReconciliacaoMes } from "@/lib/enrd-reconciliacao";
import { classificarDono } from "@/lib/enrd-posvenda-costing";
import { getLiveProjetosFull, type ServicoOS } from "@/lib/enerdy-projetos";

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
  nMontagemExcluida: number; // quantas OS do backfill eram montagem OU híbrida, não O&M puro (excluídas)
};

export type HistoricoIntegracao = {
  vendidoPorMes: { mes: string; nDeals: number; valor: number }[];
  totalVendido: number;
  nVendasFechadas: number;
  funilAberto: { stage: string; nDeals: number; valor: number }[];
  totalFunilAberto: number;
  taxaConversao: number; // fechados / (fechados + perdidos)
};

export type HistoricoPosVendaVendido = {
  totalVendido: number;
  nServicos: number;
  porStatus: { status: string; n: number; valor: number }[];
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

// Fato transacional real: status precisa indicar CONCLUSÃO (concluido/fechado).
// "valor_fechado" preenchido sozinho NÃO basta — auditoria encontrou serviços
// em "em_negociacao" (cliente ainda não confirmou; ex.: "sem retorno do
// cliente") já com valor pré-lançado no CRM, o que inflava "vendido" com
// pipeline ainda não fechado. Exclui também "entrar_contato" (fila de
// follow-up) e qualquer outro status intermediário.
function ehRealPosVenda(valor: number, status: string | null): boolean {
  const st = (status ?? "").toLowerCase();
  return valor > 0 && (st.includes("conclu") || st === "fechado");
}

// ── Pós-venda/O&M executado: backfill CSV (filtrado por perímetro) × Cora ────
export async function getHistoricoOM(desde: string = "2025-09"): Promise<HistoricoOM> {
  const os = await getOS(); // [] se enrd_posvenda_os ainda não existir — nunca lança
  const porMes = new Map<string, { nOS: number; valor: number }>();
  let nMontagemExcluida = 0;
  for (const o of os) {
    if (!o.data) continue;
    const mes = o.data.slice(0, 7);
    if (mes < desde) continue;
    // Perímetro: só O&M puro (Miguel). "Instalação de placa"/"Reinstalar"/etc.
    // são montagem (Felipe) — mesmo quando vieram junto no backfill do CSV.
    // "Híbrido" (ambíguo — bate as duas regex) também fica de fora: não é
    // "apenas Pós-venda/O&M" se a descrição também soa a instalação.
    if (classificarDono(o.tipoServico) !== "pos_venda") {
      nMontagemExcluida++;
      continue;
    }
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
  return { meses, totalValor, totalOS, desde, nMontagemExcluida };
}

// ── Pós-venda "vendido no CRM" (ao vivo, pos_venda_servicos) ─────────────────
export async function getHistoricoPosVendaVendido(): Promise<HistoricoPosVendaVendido> {
  let servicos: ServicoOS[] = [];
  try {
    const full = await getLiveProjetosFull();
    servicos = full?.servicos ?? [];
  } catch {
    servicos = [];
  }
  // Perímetro: só O&M puro (exclui híbrido e montagem).
  const pos = servicos.filter((s) => classificarDono(s.tipoServico) === "pos_venda");
  const reais = pos.filter((s) => ehRealPosVenda(s.valor, s.status));

  const porStatusMap = new Map<string, { n: number; valor: number }>();
  for (const s of reais) {
    const st = s.status || "(sem status)";
    const cur = porStatusMap.get(st) ?? { n: 0, valor: 0 };
    cur.n += 1;
    cur.valor += s.valor;
    porStatusMap.set(st, cur);
  }

  return {
    totalVendido: reais.reduce((sum, s) => sum + s.valor, 0),
    nServicos: reais.length,
    porStatus: [...porStatusMap.entries()].map(([status, v]) => ({ status, ...v })).sort((a, b) => b.valor - a.valor),
  };
}

// ── Integração (Felipe): vendas de instalações novas — fechamentos + funil ───
export async function getHistoricoIntegracao(desde: string = "2025-12-01"): Promise<HistoricoIntegracao> {
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
