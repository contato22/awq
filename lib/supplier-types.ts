// ─── Supplier — tipos canônicos (AP) ──────────────────────────────────────────
// Cadastro mestre de fornecedores — Contas a Pagar.
// Persistido em Neon Postgres (tabela suppliers).

export type SupplierDocType     = "cpf" | "cnpj";
export type SupplierType        = "service_provider" | "product_supplier" | "freelancer" | "consultant";
export type SupplierStatus      = "active" | "inactive" | "blocked" | "pending_approval";
export type BankAccountType     = "checking" | "savings";
export type PixKeyType          = "cpf" | "cnpj" | "email" | "phone" | "random";
export type PaymentTerms        = "immediate" | "7_days" | "14_days" | "21_days" | "28_days" | "30_days" | "45_days" | "60_days" | "90_days";
export type PaymentMethod       = "bank_transfer" | "pix" | "boleto" | "check" | "credit_card";
export type RiskRating          = "low" | "medium" | "high";

export interface Supplier {
  supplier_id:              number;
  supplier_code:            string;         // FOR-0001
  legal_name:               string;         // Razão Social
  trade_name?:              string;         // Nome Fantasia

  // Documentação
  document_type:            SupplierDocType;
  document_number:          string;         // CPF ou CNPJ (somente dígitos)
  state_registration?:      string;         // IE
  municipal_registration?:  string;         // IM

  // Classificação
  supplier_type?:           SupplierType;
  industry?:                string;
  category?:                string;

  // Contato principal
  primary_contact_name?:    string;
  primary_contact_email?:   string;
  primary_contact_phone?:   string;

  // Contato secundário
  secondary_contact_name?:  string;
  secondary_contact_email?: string;
  secondary_contact_phone?: string;

  // Endereço
  address_street?:          string;
  address_number?:          string;
  address_complement?:      string;
  address_neighborhood?:    string;
  address_city?:            string;
  address_state?:           string;
  address_zip_code?:        string;
  address_country:          string;         // BRA

  // Dados Bancários
  bank_code?:               string;
  bank_name?:               string;
  bank_branch?:             string;
  bank_account?:            string;
  bank_account_type?:       BankAccountType;
  bank_account_holder?:     string;
  pix_key_type?:            PixKeyType;
  pix_key?:                 string;

  // Termos de Pagamento padrão
  default_payment_terms?:   PaymentTerms;
  default_payment_method?:  PaymentMethod;

  // Crédito e Risco
  credit_limit?:            number;
  current_debt:             number;
  risk_rating?:             RiskRating;
  is_blocked:               boolean;
  block_reason?:            string;

  // Compliance fiscal
  requires_nf:              boolean;
  withhold_irrf:            boolean;
  withhold_iss:             boolean;
  withhold_inss:            boolean;
  withhold_pis_cofins_csll: boolean;

  // Performance
  avg_delivery_days?:       number;
  quality_rating?:          number;        // 0–10
  on_time_delivery_rate?:   number;        // %

  // Status e vigência
  status:                   SupplierStatus;
  relationship_start_date?: string;        // YYYY-MM-DD
  relationship_end_date?:   string;

  notes?:                   string;

  // Audit
  created_at:               string;
  created_by?:              string;
  updated_at:               string;
  updated_by?:              string;
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  service_provider: "Prestador de Serviços",
  product_supplier: "Fornecedor de Produtos",
  freelancer:       "Freelancer",
  consultant:       "Consultor",
};

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  immediate: "À Vista",
  "7_days":  "7 dias",
  "14_days": "14 dias",
  "21_days": "21 dias",
  "28_days": "28 dias",
  "30_days": "30 dias",
  "45_days": "45 dias",
  "60_days": "60 dias",
  "90_days": "90 dias",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "TED/DOC",
  pix:           "PIX",
  boleto:        "Boleto",
  check:         "Cheque",
  credit_card:   "Cartão de Crédito",
};

export const RISK_RATING_CONFIG: Record<RiskRating, { label: string; color: string; bg: string }> = {
  low:    { label: "Baixo",  color: "text-emerald-700", bg: "bg-emerald-50" },
  medium: { label: "Médio",  color: "text-amber-700",   bg: "bg-amber-50"   },
  high:   { label: "Alto",   color: "text-red-700",     bg: "bg-red-50"     },
};

export const SUPPLIER_STATUS_CONFIG: Record<SupplierStatus, { label: string; color: string; bg: string }> = {
  active:           { label: "Ativo",              color: "text-emerald-700", bg: "bg-emerald-50" },
  inactive:         { label: "Inativo",             color: "text-gray-600",    bg: "bg-gray-100"   },
  blocked:          { label: "Bloqueado",           color: "text-red-700",     bg: "bg-red-50"     },
  pending_approval: { label: "Pend. Aprovação",     color: "text-amber-700",   bg: "bg-amber-50"   },
};

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  cpf:    "CPF",
  cnpj:   "CNPJ",
  email:  "E-mail",
  phone:  "Telefone",
  random: "Chave Aleatória",
};

export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  checking: "Conta Corrente",
  savings:  "Conta Poupança",
};

export const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];
