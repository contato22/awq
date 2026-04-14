// ─── Advisor — Carteira de Clientes ──────────────────────────────────────────
//
// SOURCE: dados próprios da BU Advisor.
//
// ARCHITECTURE:
//   Cada cliente Advisor é uma empresa ou pessoa física que contratou
//   serviços de consultoria estratégica pelo Advisor / AWQ Group.
//
// FIELDS:
//   id             – slug único (usado em /advisor/customers/[id])
//   name           – nome do cliente
//   type           – "PF" = Pessoa Física | "PJ" = Pessoa Jurídica
//   sector         – setor de atuação
//   status         – onboarding | active | inactive | prospect
//   aum            – Assets Under Management (R$) — 0 se não aplicável
//   contractStart  – data de início do contrato (ISO 8601) | null se não iniciado
//   monthlyFee     – fee mensal de consultoria (R$) — 0 se não definido
//   note           – observação livre

export type AdvisorClientStatus = "onboarding" | "active" | "inactive" | "prospect";

export interface AdvisorClient {
  id:            string;
  name:          string;
  type:          "PF" | "PJ";
  sector:        string;
  status:        AdvisorClientStatus;
  aum:           number;
  contractStart: string | null;
  monthlyFee:    number;
  note:          string;
}

// ─── Carteira Advisor — Abr/2026 ─────────────────────────────────────────────

export const advisorClients: AdvisorClient[] = [
  {
    id:            "avva",
    name:          "AVVA",
    type:          "PJ",
    sector:        "—",
    status:        "onboarding",
    aum:           0,
    contractStart: null,
    monthlyFee:    0,
    note:          "Primeiro cliente Advisor. Dados contratuais em cadastramento.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAdvisorClient(id: string): AdvisorClient | undefined {
  return advisorClients.find((c) => c.id === id);
}

export const advisorClientCount = advisorClients.filter(
  (c) => c.status === "active" || c.status === "onboarding"
).length;
