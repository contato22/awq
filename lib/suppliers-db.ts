// ─── Suppliers — Neon Postgres DB layer ───────────────────────────────────────
// CREATE TABLE + CRUD para fornecedores (Contas a Pagar).

import { sql } from "./db";
import type { Supplier } from "./supplier-types";

export type SupplierInput = Omit<Supplier, "supplier_id" | "created_at" | "updated_at">;

// ── Schema bootstrap ──────────────────────────────────────────────────────────

export async function initSuppliersDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS suppliers (
      supplier_id               SERIAL PRIMARY KEY,
      supplier_code             VARCHAR(20) UNIQUE NOT NULL,
      legal_name                VARCHAR(300) NOT NULL,
      trade_name                VARCHAR(300),
      document_type             VARCHAR(10) NOT NULL,
      document_number           VARCHAR(20) UNIQUE NOT NULL,
      state_registration        VARCHAR(30),
      municipal_registration    VARCHAR(30),
      supplier_type             VARCHAR(50),
      industry                  VARCHAR(100),
      category                  VARCHAR(100),
      primary_contact_name      VARCHAR(200),
      primary_contact_email     VARCHAR(200),
      primary_contact_phone     VARCHAR(30),
      secondary_contact_name    VARCHAR(200),
      secondary_contact_email   VARCHAR(200),
      secondary_contact_phone   VARCHAR(30),
      address_street            VARCHAR(300),
      address_number            VARCHAR(20),
      address_complement        VARCHAR(100),
      address_neighborhood      VARCHAR(100),
      address_city              VARCHAR(100),
      address_state             VARCHAR(2),
      address_zip_code          VARCHAR(10),
      address_country           VARCHAR(3) DEFAULT 'BRA',
      bank_code                 VARCHAR(10),
      bank_name                 VARCHAR(100),
      bank_branch               VARCHAR(10),
      bank_account              VARCHAR(20),
      bank_account_type         VARCHAR(20),
      bank_account_holder       VARCHAR(200),
      pix_key_type              VARCHAR(20),
      pix_key                   VARCHAR(200),
      default_payment_terms     VARCHAR(20),
      default_payment_method    VARCHAR(30),
      credit_limit              NUMERIC(15,2),
      current_debt              NUMERIC(15,2) DEFAULT 0,
      risk_rating               VARCHAR(20),
      is_blocked                BOOLEAN DEFAULT FALSE,
      block_reason              TEXT,
      requires_nf               BOOLEAN DEFAULT TRUE,
      withhold_irrf             BOOLEAN DEFAULT FALSE,
      withhold_iss              BOOLEAN DEFAULT FALSE,
      withhold_inss             BOOLEAN DEFAULT FALSE,
      withhold_pis_cofins_csll  BOOLEAN DEFAULT FALSE,
      avg_delivery_days         NUMERIC(5,2),
      quality_rating            NUMERIC(3,2),
      on_time_delivery_rate     NUMERIC(5,2),
      status                    VARCHAR(20) DEFAULT 'active',
      relationship_start_date   DATE,
      relationship_end_date     DATE,
      notes                     TEXT,
      created_at                TIMESTAMPTZ DEFAULT NOW(),
      created_by                VARCHAR(200),
      updated_at                TIMESTAMPTZ DEFAULT NOW(),
      updated_by                VARCHAR(200)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_suppliers_doc    ON suppliers(document_number)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_suppliers_name   ON suppliers(legal_name)`;
}

// ── Row mapper ────────────────────────────────────────────────────────────────

function row(r: Record<string, unknown>): Supplier {
  const str  = (v: unknown) => (v != null ? String(v) : undefined);
  const num  = (v: unknown) => (v != null ? Number(v) : undefined);
  const bool = (v: unknown, def = false) => (v != null ? Boolean(v) : def);

  return {
    supplier_id:              Number(r.supplier_id),
    supplier_code:            String(r.supplier_code ?? ""),
    legal_name:               String(r.legal_name ?? ""),
    trade_name:               str(r.trade_name),
    document_type:            (r.document_type as Supplier["document_type"]) ?? "cnpj",
    document_number:          String(r.document_number ?? ""),
    state_registration:       str(r.state_registration),
    municipal_registration:   str(r.municipal_registration),
    supplier_type:            r.supplier_type ? (r.supplier_type as Supplier["supplier_type"]) : undefined,
    industry:                 str(r.industry),
    category:                 str(r.category),
    primary_contact_name:     str(r.primary_contact_name),
    primary_contact_email:    str(r.primary_contact_email),
    primary_contact_phone:    str(r.primary_contact_phone),
    secondary_contact_name:   str(r.secondary_contact_name),
    secondary_contact_email:  str(r.secondary_contact_email),
    secondary_contact_phone:  str(r.secondary_contact_phone),
    address_street:           str(r.address_street),
    address_number:           str(r.address_number),
    address_complement:       str(r.address_complement),
    address_neighborhood:     str(r.address_neighborhood),
    address_city:             str(r.address_city),
    address_state:            str(r.address_state),
    address_zip_code:         str(r.address_zip_code),
    address_country:          String(r.address_country ?? "BRA"),
    bank_code:                str(r.bank_code),
    bank_name:                str(r.bank_name),
    bank_branch:              str(r.bank_branch),
    bank_account:             str(r.bank_account),
    bank_account_type:        r.bank_account_type ? (r.bank_account_type as Supplier["bank_account_type"]) : undefined,
    bank_account_holder:      str(r.bank_account_holder),
    pix_key_type:             r.pix_key_type ? (r.pix_key_type as Supplier["pix_key_type"]) : undefined,
    pix_key:                  str(r.pix_key),
    default_payment_terms:    r.default_payment_terms ? (r.default_payment_terms as Supplier["default_payment_terms"]) : undefined,
    default_payment_method:   r.default_payment_method ? (r.default_payment_method as Supplier["default_payment_method"]) : undefined,
    credit_limit:             num(r.credit_limit),
    current_debt:             Number(r.current_debt ?? 0),
    risk_rating:              r.risk_rating ? (r.risk_rating as Supplier["risk_rating"]) : undefined,
    is_blocked:               bool(r.is_blocked),
    block_reason:             str(r.block_reason),
    requires_nf:              bool(r.requires_nf, true),
    withhold_irrf:            bool(r.withhold_irrf),
    withhold_iss:             bool(r.withhold_iss),
    withhold_inss:            bool(r.withhold_inss),
    withhold_pis_cofins_csll: bool(r.withhold_pis_cofins_csll),
    avg_delivery_days:        num(r.avg_delivery_days),
    quality_rating:           num(r.quality_rating),
    on_time_delivery_rate:    num(r.on_time_delivery_rate),
    status:                   (r.status as Supplier["status"]) ?? "active",
    relationship_start_date:  r.relationship_start_date ? String(r.relationship_start_date).slice(0, 10) : undefined,
    relationship_end_date:    r.relationship_end_date ? String(r.relationship_end_date).slice(0, 10) : undefined,
    notes:                    str(r.notes),
    created_at:               String(r.created_at ?? new Date().toISOString()),
    created_by:               str(r.created_by),
    updated_at:               String(r.updated_at ?? new Date().toISOString()),
    updated_by:               str(r.updated_by),
  };
}

// ── Next auto-code ────────────────────────────────────────────────────────────

export async function nextSupplierCode(): Promise<string> {
  if (!sql) return "FOR-0001";
  const rows = await sql`SELECT supplier_code FROM suppliers ORDER BY supplier_id DESC LIMIT 1`;
  if (!rows.length) return "FOR-0001";
  const last  = String(rows[0].supplier_code ?? "FOR-0000");
  const match = last.match(/FOR-(\d+)$/);
  const next  = match ? parseInt(match[1], 10) + 1 : 1;
  return `FOR-${String(next).padStart(4, "0")}`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listSuppliers(opts?: { status?: string; search?: string }): Promise<Supplier[]> {
  if (!sql) return [];
  const s = opts?.status ?? null;
  const q = opts?.search ? `%${opts.search}%` : null;

  const rows = q
    ? await sql`
        SELECT * FROM suppliers
        WHERE (legal_name ILIKE ${q} OR trade_name ILIKE ${q}
            OR document_number ILIKE ${q} OR supplier_code ILIKE ${q})
          AND (${s} IS NULL OR status = ${s})
        ORDER BY legal_name`
    : await sql`
        SELECT * FROM suppliers
        WHERE (${s} IS NULL OR status = ${s})
        ORDER BY legal_name`;

  return rows.map(row);
}

export async function getSupplier(id: number): Promise<Supplier | null> {
  if (!sql) return null;
  const rows = await sql`SELECT * FROM suppliers WHERE supplier_id = ${id}`;
  return rows.length ? row(rows[0]) : null;
}

export async function createSupplier(data: SupplierInput): Promise<Supplier> {
  if (!sql) throw new Error("DB not available");

  const d = data;
  const rows = await sql`
    INSERT INTO suppliers (
      supplier_code, legal_name, trade_name, document_type, document_number,
      state_registration, municipal_registration, supplier_type, industry, category,
      primary_contact_name, primary_contact_email, primary_contact_phone,
      secondary_contact_name, secondary_contact_email, secondary_contact_phone,
      address_street, address_number, address_complement, address_neighborhood,
      address_city, address_state, address_zip_code, address_country,
      bank_code, bank_name, bank_branch, bank_account, bank_account_type, bank_account_holder,
      pix_key_type, pix_key, default_payment_terms, default_payment_method,
      credit_limit, current_debt, risk_rating, is_blocked, block_reason,
      requires_nf, withhold_irrf, withhold_iss, withhold_inss, withhold_pis_cofins_csll,
      avg_delivery_days, quality_rating, on_time_delivery_rate,
      status, relationship_start_date, relationship_end_date, notes,
      created_by, updated_by
    ) VALUES (
      ${d.supplier_code}, ${d.legal_name}, ${d.trade_name ?? null},
      ${d.document_type}, ${d.document_number},
      ${d.state_registration ?? null}, ${d.municipal_registration ?? null},
      ${d.supplier_type ?? null}, ${d.industry ?? null}, ${d.category ?? null},
      ${d.primary_contact_name ?? null}, ${d.primary_contact_email ?? null}, ${d.primary_contact_phone ?? null},
      ${d.secondary_contact_name ?? null}, ${d.secondary_contact_email ?? null}, ${d.secondary_contact_phone ?? null},
      ${d.address_street ?? null}, ${d.address_number ?? null}, ${d.address_complement ?? null}, ${d.address_neighborhood ?? null},
      ${d.address_city ?? null}, ${d.address_state ?? null}, ${d.address_zip_code ?? null}, ${d.address_country ?? "BRA"},
      ${d.bank_code ?? null}, ${d.bank_name ?? null}, ${d.bank_branch ?? null}, ${d.bank_account ?? null},
      ${d.bank_account_type ?? null}, ${d.bank_account_holder ?? null},
      ${d.pix_key_type ?? null}, ${d.pix_key ?? null},
      ${d.default_payment_terms ?? null}, ${d.default_payment_method ?? null},
      ${d.credit_limit ?? null}, ${d.current_debt ?? 0},
      ${d.risk_rating ?? null}, ${d.is_blocked ?? false}, ${d.block_reason ?? null},
      ${d.requires_nf ?? true}, ${d.withhold_irrf ?? false}, ${d.withhold_iss ?? false},
      ${d.withhold_inss ?? false}, ${d.withhold_pis_cofins_csll ?? false},
      ${d.avg_delivery_days ?? null}, ${d.quality_rating ?? null}, ${d.on_time_delivery_rate ?? null},
      ${d.status ?? "active"},
      ${d.relationship_start_date ?? null}, ${d.relationship_end_date ?? null},
      ${d.notes ?? null}, ${d.created_by ?? null}, ${d.updated_by ?? null}
    )
    RETURNING *
  `;
  return row(rows[0]);
}

export async function updateSupplier(id: number, patch: Partial<SupplierInput>): Promise<Supplier> {
  if (!sql) throw new Error("DB not available");
  const current = await getSupplier(id);
  if (!current) throw new Error(`Supplier ${id} not found`);
  const m = { ...current, ...patch };

  const rows = await sql`
    UPDATE suppliers SET
      legal_name = ${m.legal_name}, trade_name = ${m.trade_name ?? null},
      document_type = ${m.document_type}, document_number = ${m.document_number},
      state_registration = ${m.state_registration ?? null}, municipal_registration = ${m.municipal_registration ?? null},
      supplier_type = ${m.supplier_type ?? null}, industry = ${m.industry ?? null}, category = ${m.category ?? null},
      primary_contact_name = ${m.primary_contact_name ?? null}, primary_contact_email = ${m.primary_contact_email ?? null},
      primary_contact_phone = ${m.primary_contact_phone ?? null},
      secondary_contact_name = ${m.secondary_contact_name ?? null}, secondary_contact_email = ${m.secondary_contact_email ?? null},
      secondary_contact_phone = ${m.secondary_contact_phone ?? null},
      address_street = ${m.address_street ?? null}, address_number = ${m.address_number ?? null},
      address_complement = ${m.address_complement ?? null}, address_neighborhood = ${m.address_neighborhood ?? null},
      address_city = ${m.address_city ?? null}, address_state = ${m.address_state ?? null},
      address_zip_code = ${m.address_zip_code ?? null}, address_country = ${m.address_country ?? "BRA"},
      bank_code = ${m.bank_code ?? null}, bank_name = ${m.bank_name ?? null},
      bank_branch = ${m.bank_branch ?? null}, bank_account = ${m.bank_account ?? null},
      bank_account_type = ${m.bank_account_type ?? null}, bank_account_holder = ${m.bank_account_holder ?? null},
      pix_key_type = ${m.pix_key_type ?? null}, pix_key = ${m.pix_key ?? null},
      default_payment_terms = ${m.default_payment_terms ?? null}, default_payment_method = ${m.default_payment_method ?? null},
      credit_limit = ${m.credit_limit ?? null}, current_debt = ${m.current_debt ?? 0},
      risk_rating = ${m.risk_rating ?? null}, is_blocked = ${m.is_blocked ?? false},
      block_reason = ${m.block_reason ?? null},
      requires_nf = ${m.requires_nf ?? true}, withhold_irrf = ${m.withhold_irrf ?? false},
      withhold_iss = ${m.withhold_iss ?? false}, withhold_inss = ${m.withhold_inss ?? false},
      withhold_pis_cofins_csll = ${m.withhold_pis_cofins_csll ?? false},
      avg_delivery_days = ${m.avg_delivery_days ?? null}, quality_rating = ${m.quality_rating ?? null},
      on_time_delivery_rate = ${m.on_time_delivery_rate ?? null},
      status = ${m.status ?? "active"}, relationship_start_date = ${m.relationship_start_date ?? null},
      relationship_end_date = ${m.relationship_end_date ?? null}, notes = ${m.notes ?? null},
      updated_by = ${m.updated_by ?? null}, updated_at = NOW()
    WHERE supplier_id = ${id}
    RETURNING *
  `;
  return row(rows[0]);
}

export async function softDeleteSupplier(id: number, by?: string): Promise<void> {
  if (!sql) throw new Error("DB not available");
  await sql`
    UPDATE suppliers
    SET status = 'inactive', updated_at = NOW(), updated_by = ${by ?? null}
    WHERE supplier_id = ${id}
  `;
}
