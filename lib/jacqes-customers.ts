// ─── JACQES Clients — Single source of truth ─────────────────────────────────
// Source: Notion CRM — Jun/2026
// DO NOT duplicate this array in individual pages. Import from here.

export type AllocDecision = "expandir" | "manter" | "observar" | "revisar" | "reprecificar" | "cortar";
export type PaymentStatus = "Pago" | "Pendente";

export interface JacqesClient {
  nome:   string;
  fee:    number;         // FEE mensal recorrente (R$)
  status: PaymentStatus;  // status de pagamento — Jun/26
  alloc:  AllocDecision;  // decisão de capital allocation
}

export const JACQES_CLIENTS: JacqesClient[] = [
  { nome: "CEM",         fee: 3_200, status: "Pago",     alloc: "expandir" },
  { nome: "ANDRÉ VIEIRA", fee: 2_300, status: "Pago",    alloc: "expandir" },
  { nome: "CARDIO CAT",  fee: 1_790, status: "Pago",     alloc: "manter"   },
];
