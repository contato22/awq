// ─── Wealth Management Indicator Definitions ─────────────────────────────────
//
// Glossary of standard financial / wealth-management sizing metrics, used by
// app/awq/bi/page.tsx to present a framework for measuring size, growth and
// health of the BUs.
//
// ⚠ No client-patrimony data has been ingested for any BU yet — these are
// definitions only. Do NOT populate per-BU values here without a verified
// empirical source (see lib/awq-group-data.ts header for the no-fabrication rule).

export interface WealthMetricDefinition {
  key:         string;
  label:       string;
  fullName:    string;
  description: string;
}

export const WEALTH_METRIC_DEFINITIONS: WealthMetricDefinition[] = [
  {
    key:         "aum",
    label:       "AuM",
    fullName:    "Assets Under Management (Ativos sob Gestão)",
    description: "Valor total de mercado dos investimentos que a instituição administra em nome de clientes, com poder de decisão sobre onde investir.",
  },
  {
    key:         "aua",
    label:       "AuA",
    fullName:    "Assets Under Administration (Ativos sob Administração)",
    description: "Ativos em que a instituição realiza apenas custódia, cálculo de cotas e controle burocrático, sem decisão ativa de investimento.",
  },
  {
    key:         "wum",
    label:       "WuM",
    fullName:    "Wealth Under Management (Fortuna sob Gestão)",
    description: "Patrimônio líquido total dos clientes de alta renda (Private Banking) sob gestão da instituição.",
  },
  {
    key:         "nnm",
    label:       "NNM",
    fullName:    "Net New Money (Captação Líquida)",
    description: "Saldo entre entradas de novos recursos e saídas/resgates de capital em um período — mede o crescimento orgânico do negócio.",
  },
  {
    key:         "racoPremium",
    label:       "Prêmio RAROC",
    fullName:    "Prêmio por Mecanismo derivado de RAROC",
    description: "Remuneração extra (taxas de performance ou estruturação) distribuída ao longo da estrutura de investimentos, justificada pelo risco assumido — derivada do RAROC (Risk-Adjusted Return on Capital).",
  },
];
