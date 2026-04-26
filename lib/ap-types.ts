// ─── AP — tipos canônicos ─────────────────────────────────────────────────────
// Contas a Pagar — Neon Postgres (tabelas accounts_payable, ap_payment_history, ap_approvals).

import type { Supplier } from "./supplier-types";

export type APDocumentType  = "nota_fiscal" | "invoice" | "receipt" | "contract" | "other";
export type APStatus        = "pending" | "scheduled" | "paid" | "overdue" | "cancelled";
export type APPaymentMethod = "bank_transfer" | "pix" | "boleto" | "check";
export type APAction        = "created" | "approved" | "rejected" | "scheduled" | "paid" | "cancelled" | "updated";

export interface AccountsPayable {
  ap_id:                    number;
  supplier_id:              number;
  bu:                       string;         // awq | jacqes | caza | venture | advisor
  project_id?:              number;
  purchase_order_id?:       number;

  // Documento fiscal
  document_type?:           APDocumentType;
  document_number?:         string;
  document_series?:         string;
  document_date?:           string;         // YYYY-MM-DD
  nf_key?:                  string;         // Chave NF-e — 44 chars

  // Valores
  gross_amount:             number;         // Valor bruto
  discount_amount:          number;         // Descontos
  irrf_withheld:            number;         // IRRF retido
  iss_withheld:             number;         // ISS retido
  inss_withheld:            number;         // INSS retido
  pis_cofins_csll_withheld: number;         // PIS/COFINS/CSLL retido
  net_amount:               number;         // = gross - discount - retenções

  // Parcelas
  due_date:                 string;         // YYYY-MM-DD
  installment_number?:      number;         // ex: 1
  installment_total?:       number;         // ex: 3

  // Pagamento
  payment_method?:          APPaymentMethod;
  payment_date?:            string;         // YYYY-MM-DD
  paid_amount?:             number;
  payment_reference?:       string;         // DOC/TED/PIX e2e ID
  payment_bank_code?:       string;
  payment_bank_branch?:     string;
  payment_bank_account?:    string;

  // Status e aprovação
  status:                   APStatus;
  requires_approval:        boolean;
  approved_by?:             string;
  approved_at?:             string;
  approval_level?:          number;

  // Classificação
  cost_center?:             string;

  description?:             string;
  notes?:                   string;
  attachments?:             unknown[];

  // Audit
  created_at:               string;
  created_by?:              string;
  updated_at:               string;
  updated_by?:              string;

  // Join (populado em queries com LEFT JOIN)
  supplier?: Pick<Supplier, "supplier_id" | "supplier_code" | "legal_name" | "trade_name" | "document_number" | "default_payment_method">;
}

export interface APPaymentHistory {
  history_id:  number;
  ap_id:       number;
  action:      APAction;
  action_date: string;
  action_by?:  string;
  amount?:     number;
  notes?:      string;
  old_status?: APStatus;
  new_status?: APStatus;
}

export interface APApproval {
  approval_id:       number;
  ap_id:             number;
  approval_level:    number;
  approver_email:    string;
  status:            "pending" | "approved" | "rejected";
  approved_at?:      string;
  rejection_reason?: string;
  created_at:        string;
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const AP_STATUS_CONFIG: Record<APStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pendente",  color: "text-amber-700",   bg: "bg-amber-50"   },
  scheduled: { label: "Agendado",  color: "text-blue-700",    bg: "bg-blue-50"    },
  paid:      { label: "Pago",      color: "text-emerald-700", bg: "bg-emerald-50" },
  overdue:   { label: "Vencido",   color: "text-red-700",     bg: "bg-red-50"     },
  cancelled: { label: "Cancelado", color: "text-gray-600",    bg: "bg-gray-100"   },
};

export const AP_DOCUMENT_TYPE_LABELS: Record<APDocumentType, string> = {
  nota_fiscal: "Nota Fiscal",
  invoice:     "Invoice",
  receipt:     "Recibo",
  contract:    "Contrato",
  other:       "Outro",
};

export const AP_PAYMENT_METHOD_LABELS: Record<APPaymentMethod, string> = {
  bank_transfer: "TED/DOC",
  pix:           "PIX",
  boleto:        "Boleto",
  check:         "Cheque",
};

export const AP_ACTION_LABELS: Record<APAction, string> = {
  created:   "Criado",
  approved:  "Aprovado",
  rejected:  "Rejeitado",
  scheduled: "Agendado",
  paid:      "Pago",
  cancelled: "Cancelado",
  updated:   "Atualizado",
};
