// ─── AWQ M&A · Vesting (AWQ ↔ Enerdy / BU ENRD) ──────────────────────────────
// Acompanha o AVANÇO do vesting de equity da AWQ na Enerdy — não confundir com
// o "vesting do Miguel" (perímetro de compensação do O&M, em
// lib/enrd-posvenda-config.ts). Este é o vesting societário/M&A.
//
// TERMOS CONFIRMADOS (29/07/2026): atingir R$360.000,00 acumulados de receita
// da BU O&M/pós-venda em 3 anos, com cliff de 12 meses. Ou seja, é vesting por
// META DE VALOR (não % de equity linear no tempo) — o "% vestido" é
// valorAcumulado ÷ valorAlvo, travado em 0 durante o cliff. valorAcumulado vem
// do MESMO dado real que já ancora o resto do BI (recebidoCora da
// reconciliação — ver lib/enrd-reconciliacao.ts), não é um número digitado.
//
// Data de início do vesting NÃO foi informada — default = hoje, sinalizado
// como assumido na UI/notas. Ajustar assim que o Miguel confirmar a data real
// (ex.: data de fechamento do deal, se for anterior a hoje).
//
// Persistência: mesmo padrão de enrd_posvenda_config (linha única id=1, JSONB,
// RLS desabilitado) — ver migração combinada em /api/enrd/setup/migrate.

import { erpAdmin, erpAnon } from "@/lib/supabase";
import { getHistoricoOM } from "@/lib/enrd-historico";

const CONFIG_TABLE = "awq_ma_vesting_config";

function db() {
  return erpAdmin ?? erpAnon;
}

export type VestingConfig = {
  dataInicio: string | null; // AAAA-MM-DD — início do período de vesting
  duracaoMeses: number | null; // prazo total p/ atingir a meta (meses)
  cliffMeses: number | null; // carência antes de qualquer vesting contar (meses)
  pctAlvo: number | null; // % de equity ao atingir 100% da meta (0..1) — se o deal for híbrido valor+equity
  valorAlvo: number | null; // meta de RECEITA ACUMULADA da BU (R$) que dispara o vesting
  marco: string | null; // descrição livre do gatilho/marco
  notas: string | null;
};

export const DEFAULT_VESTING_CONFIG: VestingConfig = {
  dataInicio: new Date().toISOString().slice(0, 10), // ASSUMIDO — ajustar se o vesting já começou antes de hoje
  duracaoMeses: 36,
  cliffMeses: 12,
  pctAlvo: null,
  valorAlvo: 360_000,
  marco: "Atingir R$360.000,00 acumulados de receita da BU O&M/pós-venda em 3 anos.",
  notas:
    "Termos confirmados em 29/07/2026 (valor-alvo, prazo, cliff). Data de início NÃO foi confirmada — assumida como a data de hoje; ajuste se o vesting já tiver começado antes.",
};

export async function getVestingConfig(): Promise<VestingConfig> {
  try {
    const client = db();
    if (!client) return DEFAULT_VESTING_CONFIG;
    const { data, error } = await client.from(CONFIG_TABLE).select("config").eq("id", 1).maybeSingle();
    if (error || !data?.config) return DEFAULT_VESTING_CONFIG;
    return { ...DEFAULT_VESTING_CONFIG, ...(data.config as Partial<VestingConfig>) };
  } catch {
    return DEFAULT_VESTING_CONFIG;
  }
}

export async function saveVestingConfig(config: VestingConfig, by?: string | null): Promise<void> {
  const client = db();
  if (!client) throw new Error("Banco indisponível.");
  const { error } = await client
    .from(CONFIG_TABLE)
    .upsert({ id: 1, config, updated_at: new Date().toISOString(), updated_by: by ?? null }, { onConflict: "id" });
  if (error) throw new Error(`saveVestingConfig: ${error.message}`);
}

// Termos mínimos confirmados para calcular qualquer coisa: data de início +
// (prazo de tempo OU meta de valor — precisa de pelo menos um dos dois).
export function isConfigured(c: VestingConfig): boolean {
  return Boolean(c.dataInicio && ((c.duracaoMeses && c.duracaoMeses > 0) || (c.valorAlvo && c.valorAlvo > 0)));
}

export type VestingProgresso = {
  configurado: boolean;
  emCliff: boolean;
  mesesDecorridos: number;
  mesesRestantes: number;
  dataConclusao: string | null; // prazo-limite p/ bater a meta (referência, não trava o cálculo)
  dataFimCliff: string | null;
  // Progresso por VALOR (fonte de verdade quando valorAlvo está setado)
  valorAcumulado: number;
  valorAlvo: number | null;
  pctVestido: number; // 0..1 — valorAcumulado/valorAlvo (0 durante cliff); cai p/ tempo-linear se não há valorAlvo
  prazoEstourado: boolean; // passou de dataConclusao e ainda não bateu 100%
};

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

function monthsBetween(inicio: Date, hoje: Date): number {
  const ms = hoje.getTime() - inicio.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.4375));
}

// Soma a receita REAL do perímetro O&M/pós-venda desde o início do vesting até
// hoje — reusa getHistoricoOM (mesma fonte que ancora /enrd/historico e o BI):
// Cora real (recebidoCora) nos meses em que já existe conta bancária
// classificada; CSV histórico (Notion, filtrado por classificarDono===
// pos_venda) nos meses anteriores a maio/2026, quando a Cora da ENERDY ainda
// não tinha transações. Não é um número separado — bug corrigido em
// 29/07/2026: a versão anterior somava só recebidoCora e ficava muda pros
// meses pré-Cora (Cora só existe desde mai/2026; o histórico do O&M começa em
// set/2025), subestimando o acumulado em ~R$72k.
export async function getValorAcumuladoDesde(dataInicio: string): Promise<number> {
  const desde = dataInicio.slice(0, 7); // AAAA-MM
  try {
    const hist = await getHistoricoOM(desde);
    return hist.totalValor;
  } catch {
    return 0;
  }
}

// Progresso "estático" (sem tocar no banco) — usado só pro componente de
// tempo (cliff/prazo). O valorAcumulado real vem de getVestingProgressoReal.
export function computeVestingProgresso(c: VestingConfig, hoje: Date = new Date()): VestingProgresso {
  if (!isConfigured(c)) {
    return {
      configurado: false,
      emCliff: false,
      mesesDecorridos: 0,
      mesesRestantes: 0,
      dataConclusao: null,
      dataFimCliff: null,
      valorAcumulado: 0,
      valorAlvo: c.valorAlvo,
      pctVestido: 0,
      prazoEstourado: false,
    };
  }
  const inicio = new Date(c.dataInicio! + "T00:00:00Z");
  const duracao = c.duracaoMeses ?? 36;
  const cliff = c.cliffMeses ?? 0;
  const mesesDecorridos = monthsBetween(inicio, hoje);
  const emCliff = mesesDecorridos < cliff;
  const dataConclusao = c.duracaoMeses ? addMonths(c.dataInicio!, duracao) : null;
  const prazoEstourado = dataConclusao ? hoje.getTime() > new Date(dataConclusao + "T00:00:00Z").getTime() : false;

  return {
    configurado: true,
    emCliff,
    mesesDecorridos: Math.round(mesesDecorridos * 10) / 10,
    mesesRestantes: dataConclusao ? Math.max(0, Math.round((duracao - mesesDecorridos) * 10) / 10) : 0,
    dataConclusao,
    dataFimCliff: cliff > 0 ? addMonths(c.dataInicio!, cliff) : null,
    valorAcumulado: 0, // preenchido por getVestingProgressoReal
    valorAlvo: c.valorAlvo,
    pctVestido: emCliff || !c.duracaoMeses ? 0 : Math.min(1, mesesDecorridos / duracao),
    prazoEstourado,
  };
}

// Progresso REAL — busca o valor acumulado de verdade (Cora) e recalcula
// pctVestido por META DE VALOR quando valorAlvo está definido (é o caso do
// deal atual). Cai pro tempo-linear só se não houver meta de valor.
export async function getVestingProgressoReal(c: VestingConfig, hoje: Date = new Date()): Promise<VestingProgresso> {
  const base = computeVestingProgresso(c, hoje);
  if (!base.configurado) return base;

  if (c.valorAlvo && c.valorAlvo > 0) {
    const valorAcumulado = await getValorAcumuladoDesde(c.dataInicio!);
    const pctVestido = base.emCliff ? 0 : Math.min(1, valorAcumulado / c.valorAlvo);
    return { ...base, valorAcumulado, pctVestido };
  }
  return base;
}
