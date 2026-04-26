// ─── AR — Clientes & Contas a Receber ─────────────────────────────────────────
//
// Fonte canônica: Neon Postgres (Vercel). Sem DB → arrays vazios (fallback).
//
// Tabelas:
//   ar_customers        — cadastro completo de clientes
//   ar_receivables      — contas a receber individuais
//   ar_receipt_history  — histórico de movimentações
//
// initARDB() é idempotente — seguro chamar em todo cold start.

import { sql } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ARCustomerStatus = "active" | "inactive" | "blocked" | "pending_approval";
export type ARCustomerType   = "b2b" | "b2c" | "government" | "nonprofit";
export type PaymentTerms     = "immediate" | "7_days" | "14_days" | "21_days" | "30_days" | "45_days" | "60_days" | "90_days" | "custom";
export type PaymentMethod    = "pix" | "boleto" | "bank_transfer" | "credit_card" | "check";
export type RiskRating       = "low" | "medium" | "high";
export type ARStatus         = "pending" | "overdue" | "received" | "partially_received" | "cancelled";
export type CollectionStage  = "none" | "reminder_sent" | "first_notice" | "second_notice" | "legal";
export type ReceiptAction    = "created" | "billed" | "received" | "partially_received" | "overdue" | "cancelled";

export interface ARCustomer {
  id: string;
  // Identificação
  customer_code:         string;
  legal_name:            string;
  trade_name:            string;
  // Documentação
  document_type:         string;   // 'cpf' | 'cnpj'
  document_number:       string;
  state_registration:    string;
  municipal_registration: string;
  // Classificação
  customer_type:         ARCustomerType;
  industry:              string;
  segment:               string;
  // Contato principal
  primary_contact_name:  string;
  primary_contact_email: string;
  primary_contact_phone: string;
  // Contato de cobrança
  billing_contact_name:  string;
  billing_contact_email: string;
  billing_contact_phone: string;
  // Endereço principal
  address_street:        string;
  address_number:        string;
  address_complement:    string;
  address_neighborhood:  string;
  address_city:          string;
  address_state:         string;
  address_zip_code:      string;
  address_country:       string;
  // Endereço de cobrança
  billing_address_same_as_main: boolean;
  billing_address_street:       string;
  billing_address_number:       string;
  billing_address_complement:   string;
  billing_address_neighborhood: string;
  billing_address_city:         string;
  billing_address_state:        string;
  billing_address_zip_code:     string;
  // Termos comerciais
  default_payment_terms:  PaymentTerms;
  default_payment_method: PaymentMethod;
  price_table:            string;
  discount_percentage:    number;
  // Dados bancários
  banco:    string;
  agencia:  string;
  conta:    string;
  pix_key:  string;
  // Crédito
  credit_limit:          number;
  current_receivable:    number;
  credit_score:          number;
  credit_analysis_date:  string | null;
  risk_rating:           RiskRating;
  // Performance
  avg_days_to_pay:         number;
  on_time_payment_rate:    number;
  total_revenue_lifetime:  number;
  last_purchase_date:      string | null;
  // Status
  status:                  ARCustomerStatus;
  is_blocked:              boolean;
  block_reason:            string;
  relationship_start_date: string | null;
  relationship_end_date:   string | null;
  // Meta
  bu:         string;
  notes:      string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ARReceivable {
  id: string;
  // Referências
  customer_id: string | null;
  bu:          string;
  // Documento fiscal
  nf_number:    string;
  nf_series:    string;
  nf_date:      string | null;
  nf_key:       string;
  service_code: string;
  // Descrição
  description: string;
  // Valores
  gross_amount:    number;
  discount_amount: number;
  iss_amount:      number;
  pis_amount:      number;
  cofins_amount:   number;
  net_amount:      number;
  // Vencimento / parcela
  due_date:           string;
  installment_number: number;
  installment_total:  number;
  // Pagamento
  payment_method: PaymentMethod;
  // Boleto
  boleto_number:  string;
  boleto_barcode: string;
  boleto_url:     string;
  // Recebimento efetivo
  received_date:   string | null;
  received_amount: number | null;
  bank_fee:        number;
  net_received:    number | null;
  // Conciliação
  bank_transaction_id: string;
  reconciled:          boolean;
  reconciled_at:       string | null;
  // Status / cobrança
  status:                 ARStatus;
  days_overdue:           number;
  collection_stage:       CollectionStage;
  last_collection_action: string | null;
  next_collection_action: string | null;
  // Audit
  notes:      string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ARReceiptHistory {
  id:            string;
  receivable_id: string;
  action:        ReceiptAction;
  action_date:   string;
  action_by:     string;
  amount:        number | null;
  notes:         string;
  old_status:    string;
  new_status:    string;
}

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

export async function initARDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS ar_customers (
      id                           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      customer_code                TEXT UNIQUE NOT NULL,
      legal_name                   TEXT NOT NULL,
      trade_name                   TEXT DEFAULT '',
      document_type                TEXT NOT NULL DEFAULT 'cnpj',
      document_number              TEXT UNIQUE NOT NULL,
      state_registration           TEXT DEFAULT '',
      municipal_registration       TEXT DEFAULT '',
      customer_type                TEXT DEFAULT 'b2b',
      industry                     TEXT DEFAULT '',
      segment                      TEXT DEFAULT '',
      primary_contact_name         TEXT DEFAULT '',
      primary_contact_email        TEXT DEFAULT '',
      primary_contact_phone        TEXT DEFAULT '',
      billing_contact_name         TEXT DEFAULT '',
      billing_contact_email        TEXT DEFAULT '',
      billing_contact_phone        TEXT DEFAULT '',
      address_street               TEXT DEFAULT '',
      address_number               TEXT DEFAULT '',
      address_complement           TEXT DEFAULT '',
      address_neighborhood         TEXT DEFAULT '',
      address_city                 TEXT DEFAULT '',
      address_state                TEXT DEFAULT '',
      address_zip_code             TEXT DEFAULT '',
      address_country              TEXT DEFAULT 'BRA',
      billing_address_same_as_main BOOLEAN DEFAULT TRUE,
      billing_address_street       TEXT DEFAULT '',
      billing_address_number       TEXT DEFAULT '',
      billing_address_complement   TEXT DEFAULT '',
      billing_address_neighborhood TEXT DEFAULT '',
      billing_address_city         TEXT DEFAULT '',
      billing_address_state        TEXT DEFAULT '',
      billing_address_zip_code     TEXT DEFAULT '',
      default_payment_terms        TEXT DEFAULT '30_days',
      default_payment_method       TEXT DEFAULT 'pix',
      price_table                  TEXT DEFAULT '',
      discount_percentage          NUMERIC DEFAULT 0,
      banco                        TEXT DEFAULT '',
      agencia                      TEXT DEFAULT '',
      conta                        TEXT DEFAULT '',
      pix_key                      TEXT DEFAULT '',
      credit_limit                 NUMERIC DEFAULT 0,
      current_receivable           NUMERIC DEFAULT 0,
      credit_score                 INTEGER DEFAULT 500,
      credit_analysis_date         DATE,
      risk_rating                  TEXT DEFAULT 'medium',
      avg_days_to_pay              NUMERIC DEFAULT 0,
      on_time_payment_rate         NUMERIC DEFAULT 100,
      total_revenue_lifetime       NUMERIC DEFAULT 0,
      last_purchase_date           DATE,
      status                       TEXT DEFAULT 'active',
      is_blocked                   BOOLEAN DEFAULT FALSE,
      block_reason                 TEXT DEFAULT '',
      relationship_start_date      DATE,
      relationship_end_date        DATE,
      bu                           TEXT DEFAULT 'awq',
      notes                        TEXT DEFAULT '',
      created_at                   TIMESTAMPTZ DEFAULT NOW(),
      created_by                   TEXT DEFAULT '',
      updated_at                   TIMESTAMPTZ DEFAULT NOW(),
      updated_by                   TEXT DEFAULT ''
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_ar_customers_bu ON ar_customers(bu)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ar_customers_status ON ar_customers(status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ar_receivables (
      id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      customer_id            TEXT REFERENCES ar_customers(id),
      bu                     TEXT DEFAULT 'awq',
      nf_number              TEXT DEFAULT '',
      nf_series              TEXT DEFAULT '',
      nf_date                DATE,
      nf_key                 TEXT DEFAULT '',
      service_code           TEXT DEFAULT '',
      description            TEXT NOT NULL,
      gross_amount           NUMERIC NOT NULL,
      discount_amount        NUMERIC DEFAULT 0,
      iss_amount             NUMERIC DEFAULT 0,
      pis_amount             NUMERIC DEFAULT 0,
      cofins_amount          NUMERIC DEFAULT 0,
      net_amount             NUMERIC NOT NULL,
      due_date               DATE NOT NULL,
      installment_number     INTEGER DEFAULT 1,
      installment_total      INTEGER DEFAULT 1,
      payment_method         TEXT DEFAULT 'pix',
      boleto_number          TEXT DEFAULT '',
      boleto_barcode         TEXT DEFAULT '',
      boleto_url             TEXT DEFAULT '',
      received_date          DATE,
      received_amount        NUMERIC,
      bank_fee               NUMERIC DEFAULT 0,
      net_received           NUMERIC,
      bank_transaction_id    TEXT DEFAULT '',
      reconciled             BOOLEAN DEFAULT FALSE,
      reconciled_at          TIMESTAMPTZ,
      status                 TEXT DEFAULT 'pending',
      days_overdue           INTEGER DEFAULT 0,
      collection_stage       TEXT DEFAULT 'none',
      last_collection_action DATE,
      next_collection_action DATE,
      notes                  TEXT DEFAULT '',
      created_at             TIMESTAMPTZ DEFAULT NOW(),
      created_by             TEXT DEFAULT '',
      updated_at             TIMESTAMPTZ DEFAULT NOW(),
      updated_by             TEXT DEFAULT ''
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_ar_recv_customer ON ar_receivables(customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ar_recv_status   ON ar_receivables(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ar_recv_bu       ON ar_receivables(bu)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ar_recv_due      ON ar_receivables(due_date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ar_receipt_history (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      receivable_id TEXT NOT NULL REFERENCES ar_receivables(id) ON DELETE CASCADE,
      action        TEXT NOT NULL,
      action_date   TIMESTAMPTZ DEFAULT NOW(),
      action_by     TEXT DEFAULT '',
      amount        NUMERIC,
      notes         TEXT DEFAULT '',
      old_status    TEXT DEFAULT '',
      new_status    TEXT DEFAULT ''
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_ar_hist_recv ON ar_receipt_history(receivable_id)`;
}

// ─── Customers — CRUD ─────────────────────────────────────────────────────────

export async function listARCustomers(filters?: { bu?: string; status?: string }): Promise<ARCustomer[]> {
  if (!sql) return [];
  await initARDB();
  const rows = await sql<ARCustomer[]>`
    SELECT * FROM ar_customers
    WHERE TRUE
      ${filters?.bu     ? sql`AND bu = ${filters.bu}`         : sql``}
      ${filters?.status ? sql`AND status = ${filters.status}` : sql``}
    ORDER BY legal_name ASC
  `;
  return rows;
}

export async function getARCustomer(id: string): Promise<ARCustomer | undefined> {
  if (!sql) return undefined;
  await initARDB();
  const rows = await sql<ARCustomer[]>`SELECT * FROM ar_customers WHERE id = ${id} LIMIT 1`;
  return rows[0];
}

function nextCustomerCode(existing: ARCustomer[]): string {
  const nums = existing
    .map((c) => parseInt(c.customer_code.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `CLI-${String(next).padStart(4, "0")}`;
}

export async function createARCustomer(
  data: Omit<ARCustomer, "id" | "customer_code" | "created_at" | "updated_at">
): Promise<ARCustomer> {
  if (!sql) throw new Error("DB not available");
  await initARDB();

  const existing = await listARCustomers();
  const code     = nextCustomerCode(existing);

  const rows = await sql<ARCustomer[]>`
    INSERT INTO ar_customers (
      customer_code, legal_name, trade_name,
      document_type, document_number, state_registration, municipal_registration,
      customer_type, industry, segment,
      primary_contact_name, primary_contact_email, primary_contact_phone,
      billing_contact_name, billing_contact_email, billing_contact_phone,
      address_street, address_number, address_complement, address_neighborhood,
      address_city, address_state, address_zip_code, address_country,
      billing_address_same_as_main,
      billing_address_street, billing_address_number, billing_address_complement,
      billing_address_neighborhood, billing_address_city, billing_address_state,
      billing_address_zip_code,
      default_payment_terms, default_payment_method,
      price_table, discount_percentage,
      banco, agencia, conta, pix_key,
      credit_limit, current_receivable, credit_score, credit_analysis_date,
      risk_rating, avg_days_to_pay, on_time_payment_rate,
      total_revenue_lifetime, last_purchase_date,
      status, is_blocked, block_reason,
      relationship_start_date, relationship_end_date,
      bu, notes, created_by, updated_by
    ) VALUES (
      ${code}, ${data.legal_name}, ${data.trade_name ?? ""},
      ${data.document_type}, ${data.document_number},
      ${data.state_registration ?? ""}, ${data.municipal_registration ?? ""},
      ${data.customer_type ?? "b2b"}, ${data.industry ?? ""}, ${data.segment ?? ""},
      ${data.primary_contact_name ?? ""}, ${data.primary_contact_email ?? ""}, ${data.primary_contact_phone ?? ""},
      ${data.billing_contact_name ?? ""}, ${data.billing_contact_email ?? ""}, ${data.billing_contact_phone ?? ""},
      ${data.address_street ?? ""}, ${data.address_number ?? ""}, ${data.address_complement ?? ""},
      ${data.address_neighborhood ?? ""}, ${data.address_city ?? ""}, ${data.address_state ?? ""},
      ${data.address_zip_code ?? ""}, ${data.address_country ?? "BRA"},
      ${data.billing_address_same_as_main ?? true},
      ${data.billing_address_street ?? ""}, ${data.billing_address_number ?? ""},
      ${data.billing_address_complement ?? ""}, ${data.billing_address_neighborhood ?? ""},
      ${data.billing_address_city ?? ""}, ${data.billing_address_state ?? ""},
      ${data.billing_address_zip_code ?? ""},
      ${data.default_payment_terms ?? "30_days"}, ${data.default_payment_method ?? "pix"},
      ${data.price_table ?? ""}, ${data.discount_percentage ?? 0},
      ${data.banco ?? ""}, ${data.agencia ?? ""}, ${data.conta ?? ""}, ${data.pix_key ?? ""},
      ${data.credit_limit ?? 0}, ${data.current_receivable ?? 0},
      ${data.credit_score ?? 500}, ${data.credit_analysis_date ?? null},
      ${data.risk_rating ?? "medium"}, ${data.avg_days_to_pay ?? 0},
      ${data.on_time_payment_rate ?? 100}, ${data.total_revenue_lifetime ?? 0},
      ${data.last_purchase_date ?? null},
      ${data.status ?? "active"}, ${data.is_blocked ?? false}, ${data.block_reason ?? ""},
      ${data.relationship_start_date ?? null}, ${data.relationship_end_date ?? null},
      ${data.bu ?? "awq"}, ${data.notes ?? ""},
      ${data.created_by ?? ""}, ${data.updated_by ?? ""}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function updateARCustomer(
  id: string,
  patch: Partial<Omit<ARCustomer, "id" | "created_at">>
): Promise<ARCustomer | undefined> {
  if (!sql) return undefined;
  await initARDB();

  const fields = Object.entries(patch)
    .filter(([k]) => k !== "id" && k !== "created_at")
    .map(([k, v]) => `${k} = ${v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`}`)
    .join(", ");

  if (!fields) return getARCustomer(id);

  const rows = await sql<ARCustomer[]>`
    UPDATE ar_customers
    SET ${sql.unsafe(fields)}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}

export async function deleteARCustomer(id: string): Promise<void> {
  if (!sql) return;
  await initARDB();
  await sql`UPDATE ar_customers SET status = 'inactive', updated_at = NOW() WHERE id = ${id}`;
}

// ─── Receivables — CRUD ───────────────────────────────────────────────────────

export async function listARReceivables(filters?: {
  bu?: string; status?: string; customer_id?: string;
}): Promise<ARReceivable[]> {
  if (!sql) return [];
  await initARDB();
  const rows = await sql<ARReceivable[]>`
    SELECT * FROM ar_receivables
    WHERE TRUE
      ${filters?.bu          ? sql`AND bu = ${filters.bu}`                       : sql``}
      ${filters?.status      ? sql`AND status = ${filters.status}`               : sql``}
      ${filters?.customer_id ? sql`AND customer_id = ${filters.customer_id}`     : sql``}
    ORDER BY due_date ASC
  `;
  return rows;
}

export async function getARReceivable(id: string): Promise<ARReceivable | undefined> {
  if (!sql) return undefined;
  await initARDB();
  const rows = await sql<ARReceivable[]>`SELECT * FROM ar_receivables WHERE id = ${id} LIMIT 1`;
  return rows[0];
}

export async function createARReceivable(
  data: Omit<ARReceivable, "id" | "created_at" | "updated_at">
): Promise<ARReceivable> {
  if (!sql) throw new Error("DB not available");
  await initARDB();

  const rows = await sql<ARReceivable[]>`
    INSERT INTO ar_receivables (
      customer_id, bu,
      nf_number, nf_series, nf_date, nf_key, service_code,
      description, gross_amount, discount_amount,
      iss_amount, pis_amount, cofins_amount, net_amount,
      due_date, installment_number, installment_total,
      payment_method, boleto_number, boleto_barcode, boleto_url,
      received_date, received_amount, bank_fee, net_received,
      bank_transaction_id, reconciled, reconciled_at,
      status, days_overdue, collection_stage,
      last_collection_action, next_collection_action,
      notes, created_by, updated_by
    ) VALUES (
      ${data.customer_id ?? null}, ${data.bu ?? "awq"},
      ${data.nf_number ?? ""}, ${data.nf_series ?? ""},
      ${data.nf_date ?? null}, ${data.nf_key ?? ""}, ${data.service_code ?? ""},
      ${data.description}, ${data.gross_amount}, ${data.discount_amount ?? 0},
      ${data.iss_amount ?? 0}, ${data.pis_amount ?? 0}, ${data.cofins_amount ?? 0},
      ${data.net_amount},
      ${data.due_date}, ${data.installment_number ?? 1}, ${data.installment_total ?? 1},
      ${data.payment_method ?? "pix"},
      ${data.boleto_number ?? ""}, ${data.boleto_barcode ?? ""}, ${data.boleto_url ?? ""},
      ${data.received_date ?? null}, ${data.received_amount ?? null},
      ${data.bank_fee ?? 0}, ${data.net_received ?? null},
      ${data.bank_transaction_id ?? ""}, ${data.reconciled ?? false}, ${data.reconciled_at ?? null},
      ${data.status ?? "pending"}, ${data.days_overdue ?? 0},
      ${data.collection_stage ?? "none"},
      ${data.last_collection_action ?? null}, ${data.next_collection_action ?? null},
      ${data.notes ?? ""}, ${data.created_by ?? ""}, ${data.updated_by ?? ""}
    )
    RETURNING *
  `;

  const rec = rows[0];

  await sql`
    INSERT INTO ar_receipt_history (receivable_id, action, action_by, new_status)
    VALUES (${rec.id}, 'created', ${data.created_by ?? ""}, ${rec.status})
  `;

  return rec;
}

export async function updateARReceivable(
  id: string,
  patch: Partial<Omit<ARReceivable, "id" | "created_at">>,
  actor = ""
): Promise<ARReceivable | undefined> {
  if (!sql) return undefined;
  await initARDB();

  const prev = await getARReceivable(id);
  if (!prev) return undefined;

  const fields = Object.entries(patch)
    .filter(([k]) => k !== "id" && k !== "created_at")
    .map(([k, v]) => {
      if (v === null || v === undefined) return `${k} = NULL`;
      if (typeof v === "boolean") return `${k} = ${v}`;
      if (typeof v === "number") return `${k} = ${v}`;
      return `${k} = '${String(v).replace(/'/g, "''")}'`;
    })
    .join(", ");

  if (!fields) return prev;

  const rows = await sql<ARReceivable[]>`
    UPDATE ar_receivables
    SET ${sql.unsafe(fields)}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  const updated = rows[0];

  if (patch.status && patch.status !== prev.status) {
    await sql`
      INSERT INTO ar_receipt_history
        (receivable_id, action, action_by, amount, old_status, new_status)
      VALUES
        (${id}, ${patch.status}, ${actor},
         ${patch.received_amount ?? null}, ${prev.status}, ${patch.status})
    `;
  }

  return updated;
}

export async function deleteARReceivable(id: string): Promise<void> {
  if (!sql) return;
  await initARDB();
  await sql`UPDATE ar_receivables SET status = 'cancelled', updated_at = NOW() WHERE id = ${id}`;
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function listReceiptHistory(receivable_id: string): Promise<ARReceiptHistory[]> {
  if (!sql) return [];
  await initARDB();
  const rows = await sql<ARReceiptHistory[]>`
    SELECT * FROM ar_receipt_history
    WHERE receivable_id = ${receivable_id}
    ORDER BY action_date DESC
  `;
  return rows;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export const AR_STATUS_LABELS: Record<ARStatus, string> = {
  pending:            "Pendente",
  overdue:            "Vencido",
  received:           "Recebido",
  partially_received: "Recebido Parcial",
  cancelled:          "Cancelado",
};

export const COLLECTION_STAGE_LABELS: Record<CollectionStage, string> = {
  none:          "Sem cobrança",
  reminder_sent: "Lembrete enviado",
  first_notice:  "1ª notificação",
  second_notice: "2ª notificação",
  legal:         "Jurídico",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix:           "PIX",
  boleto:        "Boleto",
  bank_transfer: "TED / DOC",
  credit_card:   "Cartão de Crédito",
  check:         "Cheque",
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
