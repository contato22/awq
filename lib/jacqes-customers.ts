// ─── JACQES Clients — Single source of truth ─────────────────────────────────
// Source: Notion CRM — Abr/2026
// DO NOT duplicate this array in individual pages. Import from here.

export type AllocDecision = "expandir" | "manter" | "observar" | "revisar" | "reprecificar" | "cortar";
export type PaymentStatus = "Pago" | "Pendente";

export interface JacqesClient {
  nome:   string;
  fee:    number;         // FEE mensal recorrente (R$)
  status: PaymentStatus;  // status de pagamento — Abr/26
  alloc:  AllocDecision;  // decisão de capital allocation
}

export const JACQES_CLIENTS: JacqesClient[] = [
  { nome: "CEM",             fee: 3_200, status: "Pago",     alloc: "expandir" },
  { nome: "CAROL BERTOLINI", fee: 1_790, status: "Pendente", alloc: "observar" },
  { nome: "ANDRÉ VIEIRA",    fee: 1_500, status: "Pendente", alloc: "observar" },
  { nome: "TATI SIMÕES",     fee: 1_790, status: "Pago",     alloc: "manter"   },
];
