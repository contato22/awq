// ─── Advisor — Consultoria Financeira · AWQ Group ─────────────────────────────
// Dedicated data file for the Advisor BU.
// Extracted from inline data in advisor pages to centralize and govern.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdvisorKPI {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  unit: "currency" | "number" | "percent";
  prefix?: string;
  suffix?: string;
  icon: string;
  color: string;
}

export interface AdvisorClient {
  id: string;
  name: string;
  type: "Family Office" | "PF High Net Worth" | "Institucional" | "Empresarial";
  aum: number;
  retorno: number;
  risco: "Conservador" | "Moderado" | "Arrojado";
  status: "Ativo" | "Em revisão" | "Inativo";
  since: string;
  nps: number;
  fee: number;
}

export interface AdvisorFeeIncome {
  month: string;
  taxaGestao: number;
  taxaPerformance: number;
  taxaConsultoria: number;
  total: number;
}

export interface AdvisorDRERow {
  label: string;
  value: number;
  indent: number;
  bold: boolean;
}

export interface AdvisorStrategy {
  strategy: string;
  aum: number;
  clientes: number;
  retorno: number;
  fee: number;
}

export interface AdvisorAlert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  timestamp: string;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export const advisorKpis: AdvisorKPI[] = [
  {
    id: "clientes",
    label: "Clientes Ativos",
    value: 7,
    previousValue: 6,
    unit: "number",
    icon: "Users",
    color: "violet",
  },
  {
    id: "aum",
    label: "AUM Total",
    value: 142_800_000,
    previousValue: 120_700_000,
    unit: "currency",
    icon: "Briefcase",
    color: "violet",
  },
  {
    id: "retorno",
    label: "Retorno Médio",
    value: 14.8,
    previousValue: 12.4,
    unit: "percent",
    suffix: "%",
    icon: "TrendingUp",
    color: "emerald",
  },
  {
    id: "nps",
    label: "NPS Médio",
    value: 83,
    previousValue: 77,
    unit: "number",
    icon: "Activity",
    color: "amber",
  },
];

// ─── Clients ──────────────────────────────────────────────────────────────────

export const advisorClients: AdvisorClient[] = [
  { id: "AC001", name: "Família Rodrigues",  type: "Family Office",     aum: 32_400_000, retorno: 18.4, risco: "Moderado",    status: "Ativo",      since: "2021-03", nps: 94, fee: 1.8 },
  { id: "AC002", name: "Dr. Maurício Lima",  type: "PF High Net Worth", aum: 18_600_000, retorno: 14.8, risco: "Moderado",    status: "Ativo",      since: "2022-07", nps: 88, fee: 1.5 },
  { id: "AC003", name: "Fundo ABC Capital",  type: "Institucional",     aum: 28_000_000, retorno: 12.1, risco: "Conservador", status: "Ativo",      since: "2020-11", nps: 79, fee: 0.9 },
  { id: "AC004", name: "Oliveira & Filhos",  type: "Family Office",     aum: 15_200_000, retorno: 16.3, risco: "Arrojado",    status: "Ativo",      since: "2023-01", nps: 91, fee: 2.0 },
  { id: "AC005", name: "Maria Clara Sousa",  type: "PF High Net Worth", aum:  8_900_000, retorno: 11.6, risco: "Conservador", status: "Ativo",      since: "2022-04", nps: 82, fee: 1.2 },
  { id: "AC006", name: "Corporação Delta",   type: "Empresarial",       aum: 22_400_000, retorno: 10.2, risco: "Conservador", status: "Ativo",      since: "2021-09", nps: 76, fee: 0.8 },
  { id: "AC007", name: "André Teixeira",     type: "PF High Net Worth", aum:  6_200_000, retorno: 19.8, risco: "Arrojado",    status: "Em revisão", since: "2024-02", nps: 68, fee: 1.8 },
  { id: "AC008", name: "Holding Ferreira",   type: "Family Office",     aum: 11_100_000, retorno: 15.4, risco: "Moderado",    status: "Ativo",      since: "2023-06", nps: 87, fee: 1.6 },
];

// ─── Fee Income (Monthly · Jan–Mar 2026) ──────────────────────────────────────

export const advisorFeeIncome: AdvisorFeeIncome[] = [
  { month: "Jan/26", taxaGestao: 312_000, taxaPerformance: 128_000, taxaConsultoria: 88_000, total: 528_000 },
  { month: "Fev/26", taxaGestao: 318_000, taxaPerformance:  98_000, taxaConsultoria: 92_000, total: 508_000 },
  { month: "Mar/26", taxaGestao: 326_000, taxaPerformance: 112_000, taxaConsultoria: 98_000, total: 536_000 },
];

// ─── DRE Simplificado · YTD 2026 ─────────────────────────────────────────────

export const advisorDRE: AdvisorDRERow[] = [
  { label: "Receita de Taxas de Gestão",     value:   956_000, indent: 1, bold: false },
  { label: "Receita de Performance Fee",      value:   338_000, indent: 1, bold: false },
  { label: "Receita de Consultoria",          value:   278_000, indent: 1, bold: false },
  { label: "= Receita Total",                 value: 1_572_000, indent: 0, bold: true  },
  { label: "(-) Custos Operacionais",         value:  -471_600, indent: 1, bold: false },
  { label: "(-) Desp. Compliance & Jurídico", value:   -94_320, indent: 1, bold: false },
  { label: "(-) Desp. Tecnologia",            value:   -62_880, indent: 1, bold: false },
  { label: "(-) Desp. Pessoal",               value:  -220_080, indent: 1, bold: false },
  { label: "= EBITDA",                        value:   723_120, indent: 0, bold: true  },
  { label: "(-) Depreciação",                 value:   -15_720, indent: 1, bold: false },
  { label: "(-) IR e CSLL",                   value:  -228_480, indent: 1, bold: false },
  { label: "= Lucro Líquido",                 value:   478_920, indent: 0, bold: true  },
];

// ─── AUM por Estratégia ───────────────────────────────────────────────────────

export const advisorStrategies: AdvisorStrategy[] = [
  { strategy: "Renda Variável",    aum: 57_120_000, clientes: 8,  retorno: 18.4, fee: 1.8 },
  { strategy: "Renda Fixa",        aum: 42_840_000, clientes: 12, retorno:  9.6, fee: 0.9 },
  { strategy: "Multi-Market",      aum: 28_560_000, clientes: 6,  retorno: 14.2, fee: 1.5 },
  { strategy: "Real Estate (FII)", aum: 14_280_000, clientes: 4,  retorno: 11.8, fee: 1.2 },
];

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const advisorAlerts: AdvisorAlert[] = [
  {
    id: "ADV1",
    type: "warning",
    title: "Cliente em Revisão — André Teixeira",
    message: "André Teixeira (AUM R$6.2M, NPS 68) em revisão contratual — risco de saída.",
    timestamp: "2026-03-28T10:00:00Z",
  },
  {
    id: "ADV2",
    type: "success",
    title: "Retorno Acima do Benchmark",
    message: "Retorno médio da carteira +14.8% vs Ibovespa +9.2% — spread de +5.6pp.",
    timestamp: "2026-03-30T14:00:00Z",
  },
  {
    id: "ADV3",
    type: "info",
    title: "AUM Milestone",
    message: "AUM total ultrapassou R$140M pela primeira vez. Crescimento de 18.3% YoY.",
    timestamp: "2026-03-25T09:00:00Z",
  },
];

// ─── UI Config (display helpers — used by pages for styling) ──────────────────

export const advisorTypeConfig: Record<string, { color: string; bg: string }> = {
  "Family Office":     { color: "text-violet-700", bg: "bg-violet-50"  },
  "PF High Net Worth": { color: "text-brand-600",  bg: "bg-brand-50"   },
  "Institucional":     { color: "text-emerald-600", bg: "bg-emerald-50" },
  "Empresarial":       { color: "text-amber-700",  bg: "bg-amber-50"   },
};

export const advisorRiscoConfig: Record<string, string> = {
  "Conservador": "text-emerald-600",
  "Moderado":    "text-amber-700",
  "Arrojado":    "text-red-600",
};

export const advisorStatusConfig: Record<string, string> = {
  "Ativo":      "badge badge-green",
  "Em revisão": "badge badge-yellow",
  "Inativo":    "badge badge-red",
};
