// ─── Contraparte — tipos canônicos ────────────────────────────────────────────
// Cadastro mestre de clientes e fornecedores.
// Usado por AP/AR (FK), conciliação e KPIs de tesouraria.

export type ContraprteTipo    = "pj" | "pf" | "mei" | "estrangeiro";
export type ContraprtePapel   = "cliente" | "fornecedor" | "ambos";
export type ContraparteRegime = "simples" | "presumido" | "real" | "mei" | "isento" | "estrangeiro";
export type ContraparteStatus = "ativo" | "inativo" | "bloqueado" | "pending_approval";

export type CustomerType    = "b2b" | "b2c" | "government" | "nonprofit";
export type PaymentTerms    = "immediate" | "7_days" | "14_days" | "21_days" | "30_days" | "45_days" | "60_days" | "90_days" | "custom";
export type DefaultPaymentMethod = "pix" | "boleto" | "bank_transfer" | "credit_card" | "check";
export type RiskRating      = "low" | "medium" | "high";

export interface Contraparte {
  id:             string;
  tipo:           ContraprteTipo;
  papel:          ContraprtePapel;
  razaoSocial:    string;
  nomeFantasia?:  string;
  cnpjCpf:        string;          // digits only
  ie?:            string;          // Inscrição Estadual
  im?:            string;          // Inscrição Municipal
  regime:         ContraparteRegime;
  emailFinanceiro?: string;
  telefone?:      string;
  cep?:           string;
  logradouro?:    string;
  numero?:        string;
  complemento?:   string;
  bairro?:        string;
  cidade?:        string;
  uf?:            string;
  banco?:         string;
  agencia?:       string;
  conta?:         string;
  pix?:           string;
  bu:             string;
  status:         ContraparteStatus;
  observacoes?:   string;
  createdAt:      string;          // ISO-8601
  updatedAt:      string;
  deletedAt?:     string;          // soft delete

  // ── Classificação comercial ──────────────────────────────────────────────
  customerType?:  CustomerType;    // b2b | b2c | government | nonprofit
  industry?:      string;          // ex: "tecnologia", "saúde", "varejo"
  segment?:       string;          // ex: "enterprise", "smb", "startup"

  // ── Contato principal ─────────────────────────────────────────────────────
  primaryContactName?:   string;
  primaryContactEmail?:  string;
  primaryContactPhone?:  string;

  // ── Contato de cobrança ───────────────────────────────────────────────────
  billingContactName?:   string;
  billingContactEmail?:  string;
  billingContactPhone?:  string;

  // ── Endereço de cobrança (quando diferente do endereço principal) ─────────
  billingAddressSameAsMain?: boolean;
  billingAddressStreet?:     string;
  billingAddressNumber?:     string;
  billingAddressComplement?: string;
  billingAddressNeighborhood?: string;
  billingAddressCity?:       string;
  billingAddressState?:      string;
  billingAddressZip?:        string;

  // ── Termos comerciais ─────────────────────────────────────────────────────
  defaultPaymentTerms?:  PaymentTerms;
  defaultPaymentMethod?: DefaultPaymentMethod;
  priceTable?:           string;   // ex: "tabela_a", "tabela_premium"
  discountPercentage?:   number;   // % desconto padrão

  // ── Crédito ───────────────────────────────────────────────────────────────
  creditLimit?:         number;    // limite de crédito aprovado (R$)
  currentReceivable?:   number;    // total a receber atualmente (R$)
  creditScore?:         number;    // 0–1000
  creditAnalysisDate?:  string;    // ISO-8601
  riskRating?:          RiskRating;

  // ── Performance de pagamento ──────────────────────────────────────────────
  avgDaysToPay?:          number;  // média de dias para pagar
  onTimePaymentRate?:     number;  // % pagamentos no prazo (0–100)
  totalRevenueLifetime?:  number;  // receita total do cliente (R$)
  lastPurchaseDate?:      string;  // ISO-8601

  // ── Bloqueio ──────────────────────────────────────────────────────────────
  blockReason?:           string;
  relationshipStartDate?: string;  // ISO-8601
  relationshipEndDate?:   string;  // ISO-8601
}

// ─── Labels and configs ───────────────────────────────────────────────────────

export const TIPO_CONFIG: Record<ContraprteTipo, { label: string; color: string; bg: string }> = {
  pj:          { label: "PJ",          color: "text-blue-700",    bg: "bg-blue-50"    },
  pf:          { label: "PF",          color: "text-violet-700",  bg: "bg-violet-50"  },
  mei:         { label: "MEI",         color: "text-amber-700",   bg: "bg-amber-50"   },
  estrangeiro: { label: "Estrangeiro", color: "text-gray-700",    bg: "bg-gray-100"   },
};

export const PAPEL_CONFIG: Record<ContraprtePapel, { label: string; color: string; bg: string }> = {
  cliente:     { label: "Cliente",     color: "text-emerald-700", bg: "bg-emerald-50" },
  fornecedor:  { label: "Fornecedor",  color: "text-red-700",     bg: "bg-red-50"     },
  ambos:       { label: "Ambos",       color: "text-brand-700",   bg: "bg-brand-50"   },
};

export const REGIME_LABELS: Record<ContraparteRegime, string> = {
  simples:     "Simples Nacional",
  presumido:   "Lucro Presumido",
  real:        "Lucro Real",
  mei:         "MEI",
  isento:      "Isento / Imune",
  estrangeiro: "Estrangeiro",
};

export const STATUS_CONFIG: Record<ContraparteStatus, { label: string; color: string; bg: string }> = {
  ativo:            { label: "Ativo",              color: "text-emerald-700", bg: "bg-emerald-50" },
  inativo:          { label: "Inativo",            color: "text-gray-600",    bg: "bg-gray-100"   },
  bloqueado:        { label: "Bloqueado",          color: "text-red-700",     bg: "bg-red-50"     },
  pending_approval: { label: "Pendente Aprovação", color: "text-amber-700",   bg: "bg-amber-50"   },
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  b2b:        "B2B — Empresas",
  b2c:        "B2C — Pessoas Físicas",
  government: "Governo / Órgão Público",
  nonprofit:  "ONG / Sem Fins Lucrativos",
};

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  immediate: "À vista",
  "7_days":  "7 dias",
  "14_days": "14 dias",
  "21_days": "21 dias",
  "30_days": "30 dias",
  "45_days": "45 dias",
  "60_days": "60 dias",
  "90_days": "90 dias",
  custom:    "Personalizado",
};

export const PAYMENT_METHOD_LABELS: Record<DefaultPaymentMethod, string> = {
  pix:           "PIX",
  boleto:        "Boleto",
  bank_transfer: "Transferência Bancária (TED/DOC)",
  credit_card:   "Cartão de Crédito",
  check:         "Cheque",
};

export const RISK_RATING_CONFIG: Record<RiskRating, { label: string; color: string; bg: string }> = {
  low:    { label: "Baixo",  color: "text-emerald-700", bg: "bg-emerald-50" },
  medium: { label: "Médio",  color: "text-amber-700",   bg: "bg-amber-50"   },
  high:   { label: "Alto",   color: "text-red-700",     bg: "bg-red-50"     },
};

export const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];
