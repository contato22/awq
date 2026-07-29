// ─── AWQ M&A · Vesting (AWQ ↔ Enerdy / BU ENRD) ──────────────────────────────
// Acompanha o AVANÇO do vesting de equity da AWQ na Enerdy — não confundir com
// o "vesting do Miguel" (perímetro de compensação do O&M, em
// lib/enrd-posvenda-config.ts). Este é o vesting societário/M&A.
//
// Termos do vesting (data de início, duração, cliff, % alvo) são FATOS
// CONTRATUAIS — não são estimáveis como combustível/dedicação. Por padrão
// NADA é calculado até alguém confirmar os termos reais (configurado=false),
// para não fabricar um "% vestido" que pareça real sem ser. Modelo: vesting
// linear por tempo após o cliff (padrão de mercado); cliff = tranche zero até
// completar o período de carência.
//
// Persistência: mesmo padrão de enrd_posvenda_config (linha única id=1, JSONB,
// RLS desabilitado) — ver migração combinada em /api/enrd/setup/migrate.

import { erpAdmin, erpAnon } from "@/lib/supabase";

const CONFIG_TABLE = "awq_ma_vesting_config";

function db() {
  return erpAdmin ?? erpAnon;
}

export type VestingConfig = {
  dataInicio: string | null; // AAAA-MM-DD — início do período de vesting
  duracaoMeses: number | null; // duração total do vesting (meses)
  cliffMeses: number | null; // carência antes da 1ª tranche vestir (meses)
  pctAlvo: number | null; // % total de equity alvo do vesting (0..1)
  marco: string | null; // descrição livre do gatilho/marco (se houver, além do tempo)
  notas: string | null;
};

export const DEFAULT_VESTING_CONFIG: VestingConfig = {
  dataInicio: null,
  duracaoMeses: null,
  cliffMeses: null,
  pctAlvo: null,
  marco: null,
  notas: null,
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

// Termos mínimos confirmados para calcular qualquer coisa.
export function isConfigured(c: VestingConfig): boolean {
  return Boolean(c.dataInicio && c.duracaoMeses && c.duracaoMeses > 0);
}

export type VestingProgresso = {
  configurado: boolean;
  emCliff: boolean;
  mesesDecorridos: number;
  mesesRestantes: number;
  pctTempoDecorrido: number; // 0..1 — do cronograma total, sem aplicar cliff
  pctVestido: number; // 0..1 — aplicando cliff (tranche zero até cumprir carência)
  dataConclusao: string | null; // AAAA-MM-DD
  dataFimCliff: string | null;
};

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

// Vesting LINEAR por tempo após o cliff — modelo padrão de mercado. Se o deal
// real tiver marcos de performance além do tempo, isso fica em `marco` (texto
// livre) e o cálculo aqui é só a componente temporal.
export function computeVestingProgresso(c: VestingConfig, hoje: Date = new Date()): VestingProgresso {
  if (!isConfigured(c)) {
    return {
      configurado: false,
      emCliff: false,
      mesesDecorridos: 0,
      mesesRestantes: 0,
      pctTempoDecorrido: 0,
      pctVestido: 0,
      dataConclusao: null,
      dataFimCliff: null,
    };
  }
  const inicio = new Date(c.dataInicio! + "T00:00:00Z");
  const duracao = c.duracaoMeses!;
  const cliff = c.cliffMeses ?? 0;

  const mesesDecorridosFloat = (hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
  const mesesDecorridos = Math.max(0, mesesDecorridosFloat);
  const pctTempoDecorrido = Math.min(1, mesesDecorridos / duracao);
  const emCliff = mesesDecorridos < cliff;
  const pctVestido = emCliff ? 0 : Math.min(1, mesesDecorridos / duracao);

  return {
    configurado: true,
    emCliff,
    mesesDecorridos: Math.round(mesesDecorridos * 10) / 10,
    mesesRestantes: Math.max(0, Math.round((duracao - mesesDecorridos) * 10) / 10),
    pctTempoDecorrido,
    pctVestido,
    dataConclusao: addMonths(c.dataInicio!, duracao),
    dataFimCliff: cliff > 0 ? addMonths(c.dataInicio!, cliff) : null,
  };
}
