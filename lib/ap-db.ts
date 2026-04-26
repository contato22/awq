// ─── Accounts Payable — Neon Postgres DB layer ────────────────────────────────
// CREATE TABLEs + CRUD para accounts_payable, ap_payment_history, ap_approvals.

import { sql } from "./db";
import type {
  AccountsPayable, APPaymentHistory, APApproval,
  APStatus, APAction,
} from "./ap-types";

// ── Schema bootstrap ──────────────────────────────────────────────────────────

export async function initAPDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts_payable (
      ap_id                     SERIAL PRIMARY KEY,
      supplier_id               INTEGER NOT NULL REFERENCES suppliers(supplier_id),
      bu                        VARCHAR(20) NOT NULL DEFAULT 'awq',
      project_id                INTEGER,
      purchase_order_id         INTEGER,

      document_type             VARCHAR(30),
      document_number           VARCHAR(100),
      document_series           VARCHAR(10),
      document_date             DATE,
      nf_key                    VARCHAR(44),

      gross_amount              NUMERIC(15,2) NOT NULL,
      discount_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
      irrf_withheld             NUMERIC(15,2) NOT NULL DEFAULT 0,
      iss_withheld              NUMERIC(15,2) NOT NULL DEFAULT 0,
      inss_withheld             NUMERIC(15,2) NOT NULL DEFAULT 0,
      pis_cofins_csll_withheld  NUMERIC(15,2) NOT NULL DEFAULT 0,
      net_amount                NUMERIC(15,2) NOT NULL,

      due_date                  DATE NOT NULL,
      installment_number        INTEGER,
      installment_total         INTEGER,

      payment_method            VARCHAR(30),
      payment_date              DATE,
      paid_amount               NUMERIC(15,2),
      payment_reference         VARCHAR(200),
      payment_bank_code         VARCHAR(10),
      payment_bank_branch       VARCHAR(10),
      payment_bank_account      VARCHAR(20),

      status                    VARCHAR(30) NOT NULL DEFAULT 'pending',
      requires_approval         BOOLEAN NOT NULL DEFAULT TRUE,
      approved_by               VARCHAR(200),
      approved_at               TIMESTAMPTZ,
      approval_level            INTEGER,

      cost_center               VARCHAR(50),
      description               TEXT,
      notes                     TEXT,
      attachments               JSONB,

      created_at                TIMESTAMPTZ DEFAULT NOW(),
      created_by                VARCHAR(200),
      updated_at                TIMESTAMPTZ DEFAULT NOW(),
      updated_by                VARCHAR(200)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_ap_supplier  ON accounts_payable(supplier_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ap_bu        ON accounts_payable(bu)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ap_due_date  ON accounts_payable(due_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ap_status    ON accounts_payable(status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ap_payment_history (
      history_id   SERIAL PRIMARY KEY,
      ap_id        INTEGER NOT NULL REFERENCES accounts_payable(ap_id) ON DELETE CASCADE,
      action       VARCHAR(50) NOT NULL,
      action_date  TIMESTAMPTZ DEFAULT NOW(),
      action_by    VARCHAR(200),
      amount       NUMERIC(15,2),
      notes        TEXT,
      old_status   VARCHAR(30),
      new_status   VARCHAR(30)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_ap_hist_ap_id ON ap_payment_history(ap_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ap_approvals (
      approval_id       SERIAL PRIMARY KEY,
      ap_id             INTEGER NOT NULL REFERENCES accounts_payable(ap_id) ON DELETE CASCADE,
      approval_level    INTEGER NOT NULL DEFAULT 1,
      approver_email    VARCHAR(200) NOT NULL,
      status            VARCHAR(20) NOT NULL DEFAULT 'pending',
      approved_at       TIMESTAMPTZ,
      rejection_reason  TEXT,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_ap_appr_ap_id ON ap_approvals(ap_id)`;
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowToAP(r: Record<string, unknown>): AccountsPayable {
  const str  = (v: unknown) => (v != null ? String(v) : undefined);
  const num  = (v: unknown, def = 0) => (v != null ? Number(v) : def);
  const bool = (v: unknown, def = false) => (v != null ? Boolean(v) : def);
  const date = (v: unknown) => (v ? String(v).slice(0, 10) : undefined);

  return {
    ap_id:                    Number(r.ap_id),
    supplier_id:              Number(r.supplier_id),
    bu:                       String(r.bu ?? "awq"),
    project_id:               r.project_id != null ? Number(r.project_id) : undefined,
    purchase_order_id:        r.purchase_order_id != null ? Number(r.purchase_order_id) : undefined,
    document_type:            r.document_type ? (r.document_type as AccountsPayable["document_type"]) : undefined,
    document_number:          str(r.document_number),
    document_series:          str(r.document_series),
    document_date:            date(r.document_date),
    nf_key:                   str(r.nf_key),
    gross_amount:             num(r.gross_amount),
    discount_amount:          num(r.discount_amount),
    irrf_withheld:            num(r.irrf_withheld),
    iss_withheld:             num(r.iss_withheld),
    inss_withheld:            num(r.inss_withheld),
    pis_cofins_csll_withheld: num(r.pis_cofins_csll_withheld),
    net_amount:               num(r.net_amount),
    due_date:                 String(r.due_date ?? "").slice(0, 10),
    installment_number:       r.installment_number != null ? Number(r.installment_number) : undefined,
    installment_total:        r.installment_total != null ? Number(r.installment_total) : undefined,
    payment_method:           r.payment_method ? (r.payment_method as AccountsPayable["payment_method"]) : undefined,
    payment_date:             date(r.payment_date),
    paid_amount:              r.paid_amount != null ? Number(r.paid_amount) : undefined,
    payment_reference:        str(r.payment_reference),
    payment_bank_code:        str(r.payment_bank_code),
    payment_bank_branch:      str(r.payment_bank_branch),
    payment_bank_account:     str(r.payment_bank_account),
    status:                   (r.status as APStatus) ?? "pending",
    requires_approval:        bool(r.requires_approval, true),
    approved_by:              str(r.approved_by),
    approved_at:              str(r.approved_at),
    approval_level:           r.approval_level != null ? Number(r.approval_level) : undefined,
    cost_center:              str(r.cost_center),
    description:              str(r.description),
    notes:                    str(r.notes),
    attachments:              r.attachments ? (r.attachments as unknown[]) : undefined,
    created_at:               String(r.created_at ?? new Date().toISOString()),
    created_by:               str(r.created_by),
    updated_at:               String(r.updated_at ?? new Date().toISOString()),
    updated_by:               str(r.updated_by),
    // supplier join fields (populated if aliased columns present)
    supplier: r.s_supplier_id != null
      ? {
          supplier_id:          Number(r.s_supplier_id),
          supplier_code:        String(r.s_supplier_code ?? ""),
          legal_name:           String(r.s_legal_name ?? ""),
          trade_name:           str(r.s_trade_name),
          document_number:      String(r.s_document_number ?? ""),
          default_payment_method: r.s_default_payment_method
            ? (r.s_default_payment_method as AccountsPayable["supplier"] extends undefined ? never : NonNullable<AccountsPayable["supplier"]>["default_payment_method"])
            : undefined,
        }
      : undefined,
  };
}

function rowToHistory(r: Record<string, unknown>): APPaymentHistory {
  return {
    history_id:  Number(r.history_id),
    ap_id:       Number(r.ap_id),
    action:      (r.action as APAction) ?? "updated",
    action_date: String(r.action_date ?? new Date().toISOString()),
    action_by:   r.action_by ? String(r.action_by) : undefined,
    amount:      r.amount != null ? Number(r.amount) : undefined,
    notes:       r.notes ? String(r.notes) : undefined,
    old_status:  r.old_status ? (r.old_status as APStatus) : undefined,
    new_status:  r.new_status ? (r.new_status as APStatus) : undefined,
  };
}

function rowToApproval(r: Record<string, unknown>): APApproval {
  return {
    approval_id:       Number(r.approval_id),
    ap_id:             Number(r.ap_id),
    approval_level:    Number(r.approval_level ?? 1),
    approver_email:    String(r.approver_email ?? ""),
    status:            (r.status as APApproval["status"]) ?? "pending",
    approved_at:       r.approved_at ? String(r.approved_at) : undefined,
    rejection_reason:  r.rejection_reason ? String(r.rejection_reason) : undefined,
    created_at:        String(r.created_at ?? new Date().toISOString()),
  };
}

// ── AP CRUD ───────────────────────────────────────────────────────────────────

export interface APListOptions {
  bu?:         string;
  status?:     APStatus;
  supplier_id?: number;
  from?:       string;   // YYYY-MM-DD
  to?:         string;
}

export async function listAP(opts: APListOptions = {}): Promise<AccountsPayable[]> {
  if (!sql) return [];

  const rows = await sql`
    SELECT
      ap.*,
      s.supplier_id   AS s_supplier_id,
      s.supplier_code AS s_supplier_code,
      s.legal_name    AS s_legal_name,
      s.trade_name    AS s_trade_name,
      s.document_number AS s_document_number,
      s.default_payment_method AS s_default_payment_method
    FROM accounts_payable ap
    LEFT JOIN suppliers s ON s.supplier_id = ap.supplier_id
    WHERE (${opts.bu ?? null} IS NULL OR ap.bu = ${opts.bu ?? null})
      AND (${opts.status ?? null} IS NULL OR ap.status = ${opts.status ?? null})
      AND (${opts.supplier_id ?? null} IS NULL OR ap.supplier_id = ${opts.supplier_id ?? null})
      AND (${opts.from ?? null} IS NULL OR ap.due_date >= ${opts.from ?? null}::date)
      AND (${opts.to ?? null} IS NULL OR ap.due_date <= ${opts.to ?? null}::date)
    ORDER BY ap.due_date ASC, ap.ap_id DESC
  `;

  return rows.map(rowToAP);
}

export async function getAP(id: number): Promise<AccountsPayable | null> {
  if (!sql) return null;
  const rows = await sql`
    SELECT
      ap.*,
      s.supplier_id   AS s_supplier_id,
      s.supplier_code AS s_supplier_code,
      s.legal_name    AS s_legal_name,
      s.trade_name    AS s_trade_name,
      s.document_number AS s_document_number,
      s.default_payment_method AS s_default_payment_method
    FROM accounts_payable ap
    LEFT JOIN suppliers s ON s.supplier_id = ap.supplier_id
    WHERE ap.ap_id = ${id}
  `;
  return rows.length ? rowToAP(rows[0]) : null;
}

export type APInput = Omit<AccountsPayable, "ap_id" | "created_at" | "updated_at" | "supplier">;

export async function createAP(data: APInput, by?: string): Promise<AccountsPayable> {
  if (!sql) throw new Error("DB not available");

  const d = data;
  const rows = await sql`
    INSERT INTO accounts_payable (
      supplier_id, bu, project_id, purchase_order_id,
      document_type, document_number, document_series, document_date, nf_key,
      gross_amount, discount_amount, irrf_withheld, iss_withheld, inss_withheld, pis_cofins_csll_withheld, net_amount,
      due_date, installment_number, installment_total,
      payment_method, payment_date, paid_amount, payment_reference,
      payment_bank_code, payment_bank_branch, payment_bank_account,
      status, requires_approval, approved_by, approved_at, approval_level,
      cost_center, description, notes,
      created_by, updated_by
    ) VALUES (
      ${d.supplier_id}, ${d.bu ?? "awq"}, ${d.project_id ?? null}, ${d.purchase_order_id ?? null},
      ${d.document_type ?? null}, ${d.document_number ?? null}, ${d.document_series ?? null},
      ${d.document_date ?? null}, ${d.nf_key ?? null},
      ${d.gross_amount}, ${d.discount_amount ?? 0}, ${d.irrf_withheld ?? 0},
      ${d.iss_withheld ?? 0}, ${d.inss_withheld ?? 0}, ${d.pis_cofins_csll_withheld ?? 0}, ${d.net_amount},
      ${d.due_date}, ${d.installment_number ?? null}, ${d.installment_total ?? null},
      ${d.payment_method ?? null}, ${d.payment_date ?? null}, ${d.paid_amount ?? null}, ${d.payment_reference ?? null},
      ${d.payment_bank_code ?? null}, ${d.payment_bank_branch ?? null}, ${d.payment_bank_account ?? null},
      ${d.status ?? "pending"}, ${d.requires_approval ?? true},
      ${d.approved_by ?? null}, ${d.approved_at ?? null}, ${d.approval_level ?? null},
      ${d.cost_center ?? null}, ${d.description ?? null}, ${d.notes ?? null},
      ${by ?? null}, ${by ?? null}
    )
    RETURNING *
  `;
  const ap = rows[0];

  // log history
  await sql`
    INSERT INTO ap_payment_history (ap_id, action, action_by, amount, new_status)
    VALUES (${ap.ap_id}, 'created', ${by ?? null}, ${d.gross_amount}, ${d.status ?? "pending"})
  `;

  return rowToAP(ap);
}

export async function updateAP(id: number, patch: Partial<APInput>, by?: string): Promise<AccountsPayable> {
  if (!sql) throw new Error("DB not available");
  const current = await getAP(id);
  if (!current) throw new Error(`AP ${id} not found`);
  const m = { ...current, ...patch };

  const rows = await sql`
    UPDATE accounts_payable SET
      supplier_id = ${m.supplier_id}, bu = ${m.bu ?? "awq"},
      project_id = ${m.project_id ?? null}, purchase_order_id = ${m.purchase_order_id ?? null},
      document_type = ${m.document_type ?? null}, document_number = ${m.document_number ?? null},
      document_series = ${m.document_series ?? null}, document_date = ${m.document_date ?? null},
      nf_key = ${m.nf_key ?? null},
      gross_amount = ${m.gross_amount}, discount_amount = ${m.discount_amount ?? 0},
      irrf_withheld = ${m.irrf_withheld ?? 0}, iss_withheld = ${m.iss_withheld ?? 0},
      inss_withheld = ${m.inss_withheld ?? 0}, pis_cofins_csll_withheld = ${m.pis_cofins_csll_withheld ?? 0},
      net_amount = ${m.net_amount},
      due_date = ${m.due_date}, installment_number = ${m.installment_number ?? null},
      installment_total = ${m.installment_total ?? null},
      payment_method = ${m.payment_method ?? null}, payment_date = ${m.payment_date ?? null},
      paid_amount = ${m.paid_amount ?? null}, payment_reference = ${m.payment_reference ?? null},
      payment_bank_code = ${m.payment_bank_code ?? null}, payment_bank_branch = ${m.payment_bank_branch ?? null},
      payment_bank_account = ${m.payment_bank_account ?? null},
      status = ${m.status}, requires_approval = ${m.requires_approval ?? true},
      approved_by = ${m.approved_by ?? null}, approved_at = ${m.approved_at ?? null},
      approval_level = ${m.approval_level ?? null},
      cost_center = ${m.cost_center ?? null}, description = ${m.description ?? null},
      notes = ${m.notes ?? null},
      updated_by = ${by ?? null}, updated_at = NOW()
    WHERE ap_id = ${id}
    RETURNING *
  `;

  if (current.status !== m.status) {
    await sql`
      INSERT INTO ap_payment_history (ap_id, action, action_by, old_status, new_status)
      VALUES (${id}, 'updated', ${by ?? null}, ${current.status}, ${m.status})
    `;
  }

  return rowToAP(rows[0]);
}

// ── Mark as paid ──────────────────────────────────────────────────────────────

export interface PayAPInput {
  payment_date:      string;
  paid_amount:       number;
  payment_method?:   string;
  payment_reference?: string;
  payment_bank_code?:    string;
  payment_bank_branch?:  string;
  payment_bank_account?: string;
  notes?: string;
}

export async function payAP(id: number, data: PayAPInput, by?: string): Promise<AccountsPayable> {
  if (!sql) throw new Error("DB not available");
  const current = await getAP(id);
  if (!current) throw new Error(`AP ${id} not found`);

  const rows = await sql`
    UPDATE accounts_payable SET
      status             = 'paid',
      payment_date       = ${data.payment_date},
      paid_amount        = ${data.paid_amount},
      payment_method     = ${data.payment_method ?? current.payment_method ?? null},
      payment_reference  = ${data.payment_reference ?? null},
      payment_bank_code  = ${data.payment_bank_code ?? null},
      payment_bank_branch = ${data.payment_bank_branch ?? null},
      payment_bank_account = ${data.payment_bank_account ?? null},
      updated_by         = ${by ?? null},
      updated_at         = NOW()
    WHERE ap_id = ${id}
    RETURNING *
  `;

  await sql`
    INSERT INTO ap_payment_history (ap_id, action, action_by, amount, notes, old_status, new_status)
    VALUES (${id}, 'paid', ${by ?? null}, ${data.paid_amount}, ${data.notes ?? null}, ${current.status}, 'paid')
  `;

  // update supplier current_debt
  await sql`
    UPDATE suppliers
    SET current_debt = GREATEST(0, current_debt - ${data.paid_amount}),
        updated_at = NOW()
    WHERE supplier_id = ${current.supplier_id}
  `;

  return rowToAP(rows[0]);
}

// ── Approve / Reject ──────────────────────────────────────────────────────────

export async function approveAP(id: number, approver: string, level = 1): Promise<AccountsPayable> {
  if (!sql) throw new Error("DB not available");

  await sql`
    UPDATE ap_approvals
    SET status = 'approved', approved_at = NOW()
    WHERE ap_id = ${id} AND approver_email = ${approver} AND approval_level = ${level}
  `;

  const rows = await sql`
    UPDATE accounts_payable SET
      approved_by = ${approver}, approved_at = NOW(), updated_at = NOW()
    WHERE ap_id = ${id}
    RETURNING *
  `;

  await sql`
    INSERT INTO ap_payment_history (ap_id, action, action_by, old_status, new_status)
    VALUES (${id}, 'approved', ${approver}, ${rows[0].status}, ${rows[0].status})
  `;

  return rowToAP(rows[0]);
}

export async function rejectAP(id: number, approver: string, reason: string, level = 1): Promise<AccountsPayable> {
  if (!sql) throw new Error("DB not available");

  await sql`
    UPDATE ap_approvals
    SET status = 'rejected', approved_at = NOW(), rejection_reason = ${reason}
    WHERE ap_id = ${id} AND approver_email = ${approver} AND approval_level = ${level}
  `;

  const rows = await sql`
    UPDATE accounts_payable SET
      status = 'cancelled', updated_at = NOW()
    WHERE ap_id = ${id}
    RETURNING *
  `;

  await sql`
    INSERT INTO ap_payment_history (ap_id, action, action_by, notes, old_status, new_status)
    VALUES (${id}, 'rejected', ${approver}, ${reason}, 'pending', 'cancelled')
  `;

  return rowToAP(rows[0]);
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getAPHistory(apId: number): Promise<APPaymentHistory[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM ap_payment_history WHERE ap_id = ${apId} ORDER BY action_date DESC
  `;
  return rows.map(rowToHistory);
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export async function getAPApprovals(apId: number): Promise<APApproval[]> {
  if (!sql) return [];
  const rows = await sql`SELECT * FROM ap_approvals WHERE ap_id = ${apId} ORDER BY approval_level`;
  return rows.map(rowToApproval);
}

export async function createAPApproval(apId: number, approverEmail: string, level = 1): Promise<APApproval> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ap_approvals (ap_id, approval_level, approver_email)
    VALUES (${apId}, ${level}, ${approverEmail})
    RETURNING *
  `;
  return rowToApproval(rows[0]);
}

// ── Auto-refresh overdue status ───────────────────────────────────────────────

export async function refreshOverdueAP(): Promise<void> {
  if (!sql) return;
  await sql`
    UPDATE accounts_payable
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE
  `;
}
