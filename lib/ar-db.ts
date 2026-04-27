// ─── AR — Clientes & Contas a Receber ─────────────────────────────────────────
// Fonte canônica: Neon Postgres. Sem DB → arrays vazios.
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
  customer_code: string;
  legal_name: string;
  trade_name: string;
  document_type: string;
  document_number: string;
  state_registration: string;
  municipal_registration: string;
  customer_type: ARCustomerType;
  industry: string;
  segment: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_contact_phone: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip_code: string;
  address_country: string;
  billing_address_same_as_main: boolean;
  billing_address_street: string;
  billing_address_number: string;
  billing_address_complement: string;
  billing_address_neighborhood: string;
  billing_address_city: string;
  billing_address_state: string;
  billing_address_zip_code: string;
  default_payment_terms: PaymentTerms;
  default_payment_method: PaymentMethod;
  price_table: string;
  discount_percentage: number;
  banco: string;
  agencia: string;
  conta: string;
  pix_key: string;
  credit_limit: number;
  current_receivable: number;
  credit_score: number;
  credit_analysis_date: string | null;
  risk_rating: RiskRating;
  avg_days_to_pay: number;
  on_time_payment_rate: number;
  total_revenue_lifetime: number;
  last_purchase_date: string | null;
  status: ARCustomerStatus;
  is_blocked: boolean;
  block_reason: string;
  relationship_start_date: string | null;
  relationship_end_date: string | null;
  bu: string;
  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ARReceivable {
  id: string;
  customer_id: string | null;
  bu: string;
  nf_number: string;
  nf_series: string;
  nf_date: string | null;
  nf_key: string;
  service_code: string;
  description: string;
  gross_amount: number;
  discount_amount: number;
  iss_amount: number;
  pis_amount: number;
  cofins_amount: number;
  net_amount: number;
  due_date: string;
  installment_number: number;
  installment_total: number;
  payment_method: PaymentMethod;
  boleto_number: string;
  boleto_barcode: string;
  boleto_url: string;
  received_date: string | null;
  received_amount: number | null;
  bank_fee: number;
  net_received: number | null;
  bank_transaction_id: string;
  reconciled: boolean;
  reconciled_at: string | null;
  status: ARStatus;
  days_overdue: number;
  collection_stage: CollectionStage;
  last_collection_action: string | null;
  next_collection_action: string | null;
  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ARReceiptHistory {
  id: string;
  receivable_id: string;
  action: ReceiptAction;
  action_date: string;
  action_by: string;
  amount: number | null;
  notes: string;
  old_status: string;
  new_status: string;
}

// ─── Coercions ────────────────────────────────────────────────────────────────

function coerceARCustomer(r: Record<string, unknown>): ARCustomer {
  return {
    id:                           String(r.id ?? ""),
    customer_code:                String(r.customer_code ?? ""),
    legal_name:                   String(r.legal_name ?? ""),
    trade_name:                   String(r.trade_name ?? ""),
    document_type:                String(r.document_type ?? "cnpj"),
    document_number:              String(r.document_number ?? ""),
    state_registration:           String(r.state_registration ?? ""),
    municipal_registration:       String(r.municipal_registration ?? ""),
    customer_type:                (String(r.customer_type ?? "b2b")) as ARCustomerType,
    industry:                     String(r.industry ?? ""),
    segment:                      String(r.segment ?? ""),
    primary_contact_name:         String(r.primary_contact_name ?? ""),
    primary_contact_email:        String(r.primary_contact_email ?? ""),
    primary_contact_phone:        String(r.primary_contact_phone ?? ""),
    billing_contact_name:         String(r.billing_contact_name ?? ""),
    billing_contact_email:        String(r.billing_contact_email ?? ""),
    billing_contact_phone:        String(r.billing_contact_phone ?? ""),
    address_street:               String(r.address_street ?? ""),
    address_number:               String(r.address_number ?? ""),
    address_complement:           String(r.address_complement ?? ""),
    address_neighborhood:         String(r.address_neighborhood ?? ""),
    address_city:                 String(r.address_city ?? ""),
    address_state:                String(r.address_state ?? ""),
    address_zip_code:             String(r.address_zip_code ?? ""),
    address_country:              String(r.address_country ?? "BRA"),
    billing_address_same_as_main: Boolean(r.billing_address_same_as_main ?? true),
    billing_address_street:       String(r.billing_address_street ?? ""),
    billing_address_number:       String(r.billing_address_number ?? ""),
    billing_address_complement:   String(r.billing_address_complement ?? ""),
    billing_address_neighborhood: String(r.billing_address_neighborhood ?? ""),
    billing_address_city:         String(r.billing_address_city ?? ""),
    billing_address_state:        String(r.billing_address_state ?? ""),
    billing_address_zip_code:     String(r.billing_address_zip_code ?? ""),
    default_payment_terms:        (String(r.default_payment_terms ?? "30_days")) as PaymentTerms,
    default_payment_method:       (String(r.default_payment_method ?? "pix")) as PaymentMethod,
    price_table:                  String(r.price_table ?? ""),
    discount_percentage:          Number(r.discount_percentage ?? 0),
    banco:                        String(r.banco ?? ""),
    agencia:                      String(r.agencia ?? ""),
    conta:                        String(r.conta ?? ""),
    pix_key:                      String(r.pix_key ?? ""),
    credit_limit:                 Number(r.credit_limit ?? 0),
    current_receivable:           Number(r.current_receivable ?? 0),
    credit_score:                 Number(r.credit_score ?? 500),
    credit_analysis_date:         r.credit_analysis_date ? String(r.credit_analysis_date) : null,
    risk_rating:                  (String(r.risk_rating ?? "medium")) as RiskRating,
    avg_days_to_pay:              Number(r.avg_days_to_pay ?? 0),
    on_time_payment_rate:         Number(r.on_time_payment_rate ?? 100),
    total_revenue_lifetime:       Number(r.total_revenue_lifetime ?? 0),
    last_purchase_date:           r.last_purchase_date ? String(r.last_purchase_date) : null,
    status:                       (String(r.status ?? "active")) as ARCustomerStatus,
    is_blocked:                   Boolean(r.is_blocked ?? false),
    block_reason:                 String(r.block_reason ?? ""),
    relationship_start_date:      r.relationship_start_date ? String(r.relationship_start_date) : null,
    relationship_end_date:        r.relationship_end_date   ? String(r.relationship_end_date)   : null,
    bu:                           String(r.bu ?? "awq"),
    notes:                        String(r.notes ?? ""),
    created_at:                   String(r.created_at ?? ""),
    created_by:                   String(r.created_by ?? ""),
    updated_at:                   String(r.updated_at ?? ""),
    updated_by:                   String(r.updated_by ?? ""),
  };
}

function coerceARReceivable(r: Record<string, unknown>): ARReceivable {
  return {
    id:                     String(r.id ?? ""),
    customer_id:            r.customer_id ? String(r.customer_id) : null,
    bu:                     String(r.bu ?? "awq"),
    nf_number:              String(r.nf_number ?? ""),
    nf_series:              String(r.nf_series ?? ""),
    nf_date:                r.nf_date    ? String(r.nf_date)    : null,
    nf_key:                 String(r.nf_key ?? ""),
    service_code:           String(r.service_code ?? ""),
    description:            String(r.description ?? ""),
    gross_amount:           Number(r.gross_amount ?? 0),
    discount_amount:        Number(r.discount_amount ?? 0),
    iss_amount:             Number(r.iss_amount ?? 0),
    pis_amount:             Number(r.pis_amount ?? 0),
    cofins_amount:          Number(r.cofins_amount ?? 0),
    net_amount:             Number(r.net_amount ?? 0),
    due_date:               String(r.due_date ?? ""),
    installment_number:     Number(r.installment_number ?? 1),
    installment_total:      Number(r.installment_total ?? 1),
    payment_method:         (String(r.payment_method ?? "pix")) as PaymentMethod,
    boleto_number:          String(r.boleto_number ?? ""),
    boleto_barcode:         String(r.boleto_barcode ?? ""),
    boleto_url:             String(r.boleto_url ?? ""),
    received_date:          r.received_date   ? String(r.received_date)   : null,
    received_amount:        r.received_amount != null ? Number(r.received_amount) : null,
    bank_fee:               Number(r.bank_fee ?? 0),
    net_received:           r.net_received != null ? Number(r.net_received) : null,
    bank_transaction_id:    String(r.bank_transaction_id ?? ""),
    reconciled:             Boolean(r.reconciled ?? false),
    reconciled_at:          r.reconciled_at ? String(r.reconciled_at) : null,
    status:                 (String(r.status ?? "pending")) as ARStatus,
    days_overdue:           Number(r.days_overdue ?? 0),
    collection_stage:       (String(r.collection_stage ?? "none")) as CollectionStage,
    last_collection_action: r.last_collection_action ? String(r.last_collection_action) : null,
    next_collection_action: r.next_collection_action ? String(r.next_collection_action) : null,
    notes:                  String(r.notes ?? ""),
    created_at:             String(r.created_at ?? ""),
    created_by:             String(r.created_by ?? ""),
    updated_at:             String(r.updated_at ?? ""),
    updated_by:             String(r.updated_by ?? ""),
  };
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

  await sql`CREATE INDEX IF NOT EXISTS idx_ar_customers_bu     ON ar_customers(bu)`;
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
  const rows = await sql`SELECT * FROM ar_customers ORDER BY legal_name ASC`;
  const all  = (rows as Record<string, unknown>[]).map(coerceARCustomer);
  return all.filter((c) => {
    if (filters?.bu     && c.bu     !== filters.bu)     return false;
    if (filters?.status && c.status !== filters.status) return false;
    return true;
  });
}

export async function getARCustomer(id: string): Promise<ARCustomer | undefined> {
  if (!sql) return undefined;
  await initARDB();
  const rows = await sql`SELECT * FROM ar_customers WHERE id = ${id} LIMIT 1`;
  const r = (rows as Record<string, unknown>[])[0];
  return r ? coerceARCustomer(r) : undefined;
}

export async function createARCustomer(
  data: Omit<ARCustomer, "id" | "customer_code" | "created_at" | "updated_at">
): Promise<ARCustomer> {
  if (!sql) throw new Error("DB not available");
  await initARDB();

  const rows = await sql`SELECT MAX(customer_code) AS max_code FROM ar_customers`;
  const last = String((rows as Record<string, unknown>[])[0]?.max_code ?? "CLI-0000");
  const num  = parseInt(last.replace(/\D/g, ""), 10) || 0;
  const code = `CLI-${String(num + 1).padStart(4, "0")}`;

  const inserted = await sql`
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
      ${code},                              ${data.legal_name},
      ${data.trade_name ?? ""},             ${data.document_type},
      ${data.document_number},              ${data.state_registration ?? ""},
      ${data.municipal_registration ?? ""}, ${data.customer_type ?? "b2b"},
      ${data.industry ?? ""},               ${data.segment ?? ""},
      ${data.primary_contact_name ?? ""},   ${data.primary_contact_email ?? ""},
      ${data.primary_contact_phone ?? ""},  ${data.billing_contact_name ?? ""},
      ${data.billing_contact_email ?? ""},  ${data.billing_contact_phone ?? ""},
      ${data.address_street ?? ""},         ${data.address_number ?? ""},
      ${data.address_complement ?? ""},     ${data.address_neighborhood ?? ""},
      ${data.address_city ?? ""},           ${data.address_state ?? ""},
      ${data.address_zip_code ?? ""},       ${data.address_country ?? "BRA"},
      ${data.billing_address_same_as_main ?? true},
      ${data.billing_address_street ?? ""},       ${data.billing_address_number ?? ""},
      ${data.billing_address_complement ?? ""},   ${data.billing_address_neighborhood ?? ""},
      ${data.billing_address_city ?? ""},         ${data.billing_address_state ?? ""},
      ${data.billing_address_zip_code ?? ""},
      ${data.default_payment_terms ?? "30_days"}, ${data.default_payment_method ?? "pix"},
      ${data.price_table ?? ""},            ${data.discount_percentage ?? 0},
      ${data.banco ?? ""},                  ${data.agencia ?? ""},
      ${data.conta ?? ""},                  ${data.pix_key ?? ""},
      ${data.credit_limit ?? 0},            ${data.current_receivable ?? 0},
      ${data.credit_score ?? 500},          ${data.credit_analysis_date ?? null},
      ${data.risk_rating ?? "medium"},      ${data.avg_days_to_pay ?? 0},
      ${data.on_time_payment_rate ?? 100},  ${data.total_revenue_lifetime ?? 0},
      ${data.last_purchase_date ?? null},
      ${data.status ?? "active"},           ${data.is_blocked ?? false},
      ${data.block_reason ?? ""},           ${data.relationship_start_date ?? null},
      ${data.relationship_end_date ?? null},
      ${data.bu ?? "awq"},                  ${data.notes ?? ""},
      ${data.created_by ?? ""},             ${data.created_by ?? ""}
    )
    RETURNING *
  `;
  return coerceARCustomer((inserted as Record<string, unknown>[])[0]);
}

export async function updateARCustomer(
  id: string,
  patch: Partial<Omit<ARCustomer, "id" | "customer_code" | "created_at">>
): Promise<ARCustomer | undefined> {
  if (!sql) return undefined;
  await initARDB();
  const existing = await getARCustomer(id);
  if (!existing) return undefined;
  const m = { ...existing, ...patch };

  const rows = await sql`
    UPDATE ar_customers SET
      legal_name                   = ${m.legal_name},
      trade_name                   = ${m.trade_name},
      document_type                = ${m.document_type},
      document_number              = ${m.document_number},
      state_registration           = ${m.state_registration},
      municipal_registration       = ${m.municipal_registration},
      customer_type                = ${m.customer_type},
      industry                     = ${m.industry},
      segment                      = ${m.segment},
      primary_contact_name         = ${m.primary_contact_name},
      primary_contact_email        = ${m.primary_contact_email},
      primary_contact_phone        = ${m.primary_contact_phone},
      billing_contact_name         = ${m.billing_contact_name},
      billing_contact_email        = ${m.billing_contact_email},
      billing_contact_phone        = ${m.billing_contact_phone},
      address_street               = ${m.address_street},
      address_number               = ${m.address_number},
      address_complement           = ${m.address_complement},
      address_neighborhood         = ${m.address_neighborhood},
      address_city                 = ${m.address_city},
      address_state                = ${m.address_state},
      address_zip_code             = ${m.address_zip_code},
      address_country              = ${m.address_country},
      billing_address_same_as_main = ${m.billing_address_same_as_main},
      billing_address_street       = ${m.billing_address_street},
      billing_address_number       = ${m.billing_address_number},
      billing_address_complement   = ${m.billing_address_complement},
      billing_address_neighborhood = ${m.billing_address_neighborhood},
      billing_address_city         = ${m.billing_address_city},
      billing_address_state        = ${m.billing_address_state},
      billing_address_zip_code     = ${m.billing_address_zip_code},
      default_payment_terms        = ${m.default_payment_terms},
      default_payment_method       = ${m.default_payment_method},
      price_table                  = ${m.price_table},
      discount_percentage          = ${m.discount_percentage},
      banco                        = ${m.banco},
      agencia                      = ${m.agencia},
      conta                        = ${m.conta},
      pix_key                      = ${m.pix_key},
      credit_limit                 = ${m.credit_limit},
      current_receivable           = ${m.current_receivable},
      credit_score                 = ${m.credit_score},
      credit_analysis_date         = ${m.credit_analysis_date ?? null},
      risk_rating                  = ${m.risk_rating},
      avg_days_to_pay              = ${m.avg_days_to_pay},
      on_time_payment_rate         = ${m.on_time_payment_rate},
      total_revenue_lifetime       = ${m.total_revenue_lifetime},
      last_purchase_date           = ${m.last_purchase_date ?? null},
      status                       = ${m.status},
      is_blocked                   = ${m.is_blocked},
      block_reason                 = ${m.block_reason},
      relationship_start_date      = ${m.relationship_start_date ?? null},
      relationship_end_date        = ${m.relationship_end_date ?? null},
      bu                           = ${m.bu},
      notes                        = ${m.notes},
      updated_by                   = ${m.updated_by},
      updated_at                   = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  const r = (rows as Record<string, unknown>[])[0];
  return r ? coerceARCustomer(r) : undefined;
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
  const rows = await sql`SELECT * FROM ar_receivables ORDER BY due_date ASC`;
  const all  = (rows as Record<string, unknown>[]).map(coerceARReceivable);
  return all.filter((r) => {
    if (filters?.bu          && r.bu          !== filters.bu)          return false;
    if (filters?.status      && r.status      !== filters.status)      return false;
    if (filters?.customer_id && r.customer_id !== filters.customer_id) return false;
    return true;
  });
}

export async function getARReceivable(id: string): Promise<ARReceivable | undefined> {
  if (!sql) return undefined;
  await initARDB();
  const rows = await sql`SELECT * FROM ar_receivables WHERE id = ${id} LIMIT 1`;
  const r = (rows as Record<string, unknown>[])[0];
  return r ? coerceARReceivable(r) : undefined;
}

export async function createARReceivable(
  data: Omit<ARReceivable, "id" | "created_at" | "updated_at">
): Promise<ARReceivable> {
  if (!sql) throw new Error("DB not available");
  await initARDB();

  const inserted = await sql`
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
      ${data.customer_id ?? null},      ${data.bu ?? "awq"},
      ${data.nf_number ?? ""},          ${data.nf_series ?? ""},
      ${data.nf_date ?? null},          ${data.nf_key ?? ""},
      ${data.service_code ?? ""},       ${data.description},
      ${data.gross_amount},             ${data.discount_amount ?? 0},
      ${data.iss_amount ?? 0},          ${data.pis_amount ?? 0},
      ${data.cofins_amount ?? 0},       ${data.net_amount},
      ${data.due_date},                 ${data.installment_number ?? 1},
      ${data.installment_total ?? 1},   ${data.payment_method ?? "pix"},
      ${data.boleto_number ?? ""},      ${data.boleto_barcode ?? ""},
      ${data.boleto_url ?? ""},         ${data.received_date ?? null},
      ${data.received_amount ?? null},  ${data.bank_fee ?? 0},
      ${data.net_received ?? null},     ${data.bank_transaction_id ?? ""},
      ${data.reconciled ?? false},      ${data.reconciled_at ?? null},
      ${data.status ?? "pending"},      ${data.days_overdue ?? 0},
      ${data.collection_stage ?? "none"},
      ${data.last_collection_action ?? null},
      ${data.next_collection_action ?? null},
      ${data.notes ?? ""},              ${data.created_by ?? ""},
      ${data.created_by ?? ""}
    )
    RETURNING *
  `;

  const rec = coerceARReceivable((inserted as Record<string, unknown>[])[0]);

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
  const existing = await getARReceivable(id);
  if (!existing) return undefined;
  const m = { ...existing, ...patch };

  const rows = await sql`
    UPDATE ar_receivables SET
      customer_id            = ${m.customer_id ?? null},
      bu                     = ${m.bu},
      nf_number              = ${m.nf_number},
      nf_series              = ${m.nf_series},
      nf_date                = ${m.nf_date ?? null},
      nf_key                 = ${m.nf_key},
      service_code           = ${m.service_code},
      description            = ${m.description},
      gross_amount           = ${m.gross_amount},
      discount_amount        = ${m.discount_amount},
      iss_amount             = ${m.iss_amount},
      pis_amount             = ${m.pis_amount},
      cofins_amount          = ${m.cofins_amount},
      net_amount             = ${m.net_amount},
      due_date               = ${m.due_date},
      installment_number     = ${m.installment_number},
      installment_total      = ${m.installment_total},
      payment_method         = ${m.payment_method},
      boleto_number          = ${m.boleto_number},
      boleto_barcode         = ${m.boleto_barcode},
      boleto_url             = ${m.boleto_url},
      received_date          = ${m.received_date ?? null},
      received_amount        = ${m.received_amount ?? null},
      bank_fee               = ${m.bank_fee},
      net_received           = ${m.net_received ?? null},
      bank_transaction_id    = ${m.bank_transaction_id},
      reconciled             = ${m.reconciled},
      reconciled_at          = ${m.reconciled_at ?? null},
      status                 = ${m.status},
      days_overdue           = ${m.days_overdue},
      collection_stage       = ${m.collection_stage},
      last_collection_action = ${m.last_collection_action ?? null},
      next_collection_action = ${m.next_collection_action ?? null},
      notes                  = ${m.notes},
      updated_by             = ${actor || m.updated_by},
      updated_at             = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  const updated = coerceARReceivable((rows as Record<string, unknown>[])[0]);

  if (patch.status && patch.status !== existing.status) {
    await sql`
      INSERT INTO ar_receipt_history
        (receivable_id, action, action_by, amount, old_status, new_status)
      VALUES
        (${id}, ${patch.status}, ${actor},
         ${patch.received_amount ?? null}, ${existing.status}, ${patch.status})
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
  const rows = await sql`
    SELECT * FROM ar_receipt_history
    WHERE receivable_id = ${receivable_id}
    ORDER BY action_date DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id:            String(r.id ?? ""),
    receivable_id: String(r.receivable_id ?? ""),
    action:        (String(r.action ?? "created")) as ReceiptAction,
    action_date:   String(r.action_date ?? ""),
    action_by:     String(r.action_by ?? ""),
    amount:        r.amount != null ? Number(r.amount) : null,
    notes:         String(r.notes ?? ""),
    old_status:    String(r.old_status ?? ""),
    new_status:    String(r.new_status ?? ""),
  }));
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
  none:          "—",
  reminder_sent: "Lembrete",
  first_notice:  "1ª Notif.",
  second_notice: "2ª Notif.",
  legal:         "Jurídico",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix:           "PIX",
  boleto:        "Boleto",
  bank_transfer: "TED / DOC",
  credit_card:   "Cartão",
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
