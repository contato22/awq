// ─── ERP — Supabase Database Layer ────────────────────────────────────────────
//
// Covers: Purchase Orders, Sales Orders, Inventory, Contracts,
//         Fixed Assets, and Expense Reports.
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (erp_* tables)
//   DATABASE_URL unset → returns [] / no-op (client falls back to localStorage)

import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseOrderStatus = "Rascunho" | "Aprovado" | "Recebido" | "Cancelado";
export interface PurchaseOrder {
  id: string;
  numero: string;
  supplier: string;
  date: string;
  total_value: number;
  status: PurchaseOrderStatus;
  bu: string;
  items?: PurchaseOrderItem[];
  created_at: string;
}
export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export type SalesOrderStatus = "Novo" | "Em Processamento" | "Faturado" | "Entregue" | "Cancelado";
export interface SalesOrder {
  id: string;
  numero: string;
  customer: string;
  date: string;
  value: number;
  status: SalesOrderStatus;
  bu: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  description: string;
  category: string;
  unit: string;
  qty_stock: number;
  location: string;
  bu: string;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  type: "entrada" | "saida" | "ajuste";
  quantity: number;
  date: string;
  reason: string;
  bu: string;
  created_at: string;
}

export type ContractStatus = "Rascunho" | "Ativo" | "Em Renovação" | "Encerrado" | "Cancelado";
export interface ERPContract {
  id: string;
  numero: string;
  counterparty: string;
  object: string;
  total_value: number;
  start_date: string;
  end_date: string;
  status: ContractStatus;
  bu: string;
  created_at: string;
}

export type AssetStatus = "Ativo" | "Em Manutenção" | "Baixado";
export interface FixedAsset {
  id: string;
  code: string;
  description: string;
  category: string;
  location: string;
  acquisition_value: number;
  acquisition_date: string;
  useful_life_months: number;
  residual_value: number;
  accumulated_depreciation: number;
  is_active: boolean;
  status: AssetStatus;
  bu: string;
  created_at: string;
}

export type ExpenseStatus = "Rascunho" | "Submetido" | "Aprovado" | "Rejeitado" | "Pago";
export type ExpenseCategory = "Viagem" | "Refeição" | "Hospedagem" | "Transporte" | "Outros";
export interface ExpenseReport {
  id: string;
  date: string;
  employee: string;
  category: ExpenseCategory;
  description: string;
  value: number;
  status: ExpenseStatus;
  bu: string;
  created_at: string;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _ready = false;

export async function initERPDB(): Promise<void> {
  if (!sql || _ready) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS erp_purchase_orders (
        id          TEXT PRIMARY KEY,
        numero      TEXT NOT NULL,
        supplier    TEXT,
        date        TEXT,
        total_value NUMERIC,
        status      TEXT,
        bu          TEXT NOT NULL DEFAULT 'awq',
        created_at  TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS erp_purchase_order_items (
        id                TEXT PRIMARY KEY,
        purchase_order_id TEXT REFERENCES erp_purchase_orders(id),
        description       TEXT,
        quantity          NUMERIC,
        unit_price        NUMERIC,
        total             NUMERIC
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS erp_sales_orders (
        id         TEXT PRIMARY KEY,
        numero     TEXT NOT NULL,
        customer   TEXT,
        date       TEXT,
        value      NUMERIC,
        status     TEXT,
        bu         TEXT NOT NULL DEFAULT 'awq',
        created_at TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS erp_inventory_items (
        id          TEXT PRIMARY KEY,
        code        TEXT UNIQUE,
        description TEXT,
        category    TEXT,
        unit        TEXT,
        qty_stock   NUMERIC DEFAULT 0,
        location    TEXT,
        bu          TEXT NOT NULL DEFAULT 'awq',
        created_at  TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS erp_inventory_movements (
        id         TEXT PRIMARY KEY,
        item_id    TEXT REFERENCES erp_inventory_items(id),
        type       TEXT,
        quantity   NUMERIC,
        date       TEXT,
        reason     TEXT,
        bu         TEXT NOT NULL DEFAULT 'awq',
        created_at TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS erp_contracts (
        id           TEXT PRIMARY KEY,
        numero       TEXT NOT NULL,
        counterparty TEXT,
        object       TEXT,
        total_value  NUMERIC,
        start_date   TEXT,
        end_date     TEXT,
        status       TEXT,
        bu           TEXT NOT NULL DEFAULT 'awq',
        created_at   TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS erp_fixed_assets (
        id                       TEXT PRIMARY KEY,
        code                     TEXT UNIQUE,
        description              TEXT,
        category                 TEXT,
        location                 TEXT,
        acquisition_value        NUMERIC,
        acquisition_date         TEXT,
        useful_life_months       INTEGER DEFAULT 60,
        residual_value           NUMERIC DEFAULT 0,
        accumulated_depreciation NUMERIC DEFAULT 0,
        is_active                BOOLEAN DEFAULT true,
        status                   TEXT,
        bu                       TEXT NOT NULL DEFAULT 'awq',
        created_at               TEXT
      )
    `;
    // Add depreciation columns to existing tables (idempotent)
    for (const col of [
      "useful_life_months INTEGER DEFAULT 60",
      "residual_value NUMERIC DEFAULT 0",
      "accumulated_depreciation NUMERIC DEFAULT 0",
      "is_active BOOLEAN DEFAULT true",
    ]) {
      try {
        await (sql as unknown as { unsafe(q: string): Promise<unknown> }).unsafe(
          `ALTER TABLE erp_fixed_assets ADD COLUMN IF NOT EXISTS ${col}`
        );
      } catch { /* column already exists */ }
    }
    await sql`
      CREATE TABLE IF NOT EXISTS erp_expense_reports (
        id          TEXT PRIMARY KEY,
        date        TEXT,
        employee    TEXT,
        category    TEXT,
        description TEXT,
        value       NUMERIC,
        status      TEXT,
        bu          TEXT NOT NULL DEFAULT 'awq',
        created_at  TEXT
      )
    `;
    _ready = true;
  } catch { /* DB unavailable — client falls back to localStorage */ }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToPurchaseOrder(r: Record<string, unknown>): PurchaseOrder {
  return {
    id:          r.id as string,
    numero:      r.numero as string,
    supplier:    r.supplier as string,
    date:        r.date as string,
    total_value: Number(r.total_value),
    status:      r.status as PurchaseOrderStatus,
    bu:          r.bu as string,
    created_at:  r.created_at as string,
  };
}

function rowToPurchaseOrderItem(r: Record<string, unknown>): PurchaseOrderItem {
  return {
    id:                r.id as string,
    purchase_order_id: r.purchase_order_id as string,
    description:       r.description as string,
    quantity:          Number(r.quantity),
    unit_price:        Number(r.unit_price),
    total:             Number(r.total),
  };
}

function rowToSalesOrder(r: Record<string, unknown>): SalesOrder {
  return {
    id:         r.id as string,
    numero:     r.numero as string,
    customer:   r.customer as string,
    date:       r.date as string,
    value:      Number(r.value),
    status:     r.status as SalesOrderStatus,
    bu:         r.bu as string,
    created_at: r.created_at as string,
  };
}

function rowToInventoryItem(r: Record<string, unknown>): InventoryItem {
  return {
    id:          r.id as string,
    code:        r.code as string,
    description: r.description as string,
    category:    r.category as string,
    unit:        r.unit as string,
    qty_stock:   Number(r.qty_stock),
    location:    r.location as string,
    bu:          r.bu as string,
    created_at:  r.created_at as string,
  };
}

function rowToInventoryMovement(r: Record<string, unknown>): InventoryMovement {
  return {
    id:         r.id as string,
    item_id:    r.item_id as string,
    type:       r.type as InventoryMovement["type"],
    quantity:   Number(r.quantity),
    date:       r.date as string,
    reason:     r.reason as string,
    bu:         r.bu as string,
    created_at: r.created_at as string,
  };
}

function rowToERPContract(r: Record<string, unknown>): ERPContract {
  return {
    id:           r.id as string,
    numero:       r.numero as string,
    counterparty: r.counterparty as string,
    object:       r.object as string,
    total_value:  Number(r.total_value),
    start_date:   r.start_date as string,
    end_date:     r.end_date as string,
    status:       r.status as ContractStatus,
    bu:           r.bu as string,
    created_at:   r.created_at as string,
  };
}

function rowToFixedAsset(r: Record<string, unknown>): FixedAsset {
  return {
    id:                       r.id as string,
    code:                     r.code as string,
    description:              r.description as string,
    category:                 r.category as string,
    location:                 r.location as string,
    acquisition_value:        Number(r.acquisition_value),
    acquisition_date:         r.acquisition_date as string,
    useful_life_months:       Number(r.useful_life_months ?? 60),
    residual_value:           Number(r.residual_value ?? 0),
    accumulated_depreciation: Number(r.accumulated_depreciation ?? 0),
    is_active:                r.is_active !== false,
    status:                   r.status as AssetStatus,
    bu:                       r.bu as string,
    created_at:               r.created_at as string,
  };
}

function rowToExpenseReport(r: Record<string, unknown>): ExpenseReport {
  return {
    id:          r.id as string,
    date:        r.date as string,
    employee:    r.employee as string,
    category:    r.category as ExpenseCategory,
    description: r.description as string,
    value:       Number(r.value),
    status:      r.status as ExpenseStatus,
    bu:          r.bu as string,
    created_at:  r.created_at as string,
  };
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function getPurchaseOrders(bu?: string): Promise<PurchaseOrder[]> {
  await initERPDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM erp_purchase_orders
    WHERE (${bu ?? null}::text IS NULL OR bu = ${bu ?? null})
    ORDER BY date DESC, created_at DESC
  `;
  const orders = rows.map(rowToPurchaseOrder);
  // Attach items
  for (const order of orders) {
    const itemRows = await sql`
      SELECT * FROM erp_purchase_order_items WHERE purchase_order_id = ${order.id}
    `;
    order.items = itemRows.map(rowToPurchaseOrderItem);
  }
  return orders;
}

export async function upsertPurchaseOrder(order: PurchaseOrder): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`
    INSERT INTO erp_purchase_orders
      (id, numero, supplier, date, total_value, status, bu, created_at)
    VALUES
      (${order.id}, ${order.numero}, ${order.supplier}, ${order.date},
       ${order.total_value}, ${order.status}, ${order.bu}, ${order.created_at})
    ON CONFLICT (id) DO UPDATE SET
      numero      = EXCLUDED.numero,
      supplier    = EXCLUDED.supplier,
      date        = EXCLUDED.date,
      total_value = EXCLUDED.total_value,
      status      = EXCLUDED.status,
      bu          = EXCLUDED.bu
  `;
  if (order.items?.length) {
    await sql`DELETE FROM erp_purchase_order_items WHERE purchase_order_id = ${order.id}`;
    for (const item of order.items) {
      await sql`
        INSERT INTO erp_purchase_order_items
          (id, purchase_order_id, description, quantity, unit_price, total)
        VALUES
          (${item.id}, ${order.id}, ${item.description},
           ${item.quantity}, ${item.unit_price}, ${item.total})
        ON CONFLICT (id) DO UPDATE SET
          description = EXCLUDED.description,
          quantity    = EXCLUDED.quantity,
          unit_price  = EXCLUDED.unit_price,
          total       = EXCLUDED.total
      `;
    }
  }
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`DELETE FROM erp_purchase_order_items WHERE purchase_order_id = ${id}`;
  await sql`DELETE FROM erp_purchase_orders WHERE id = ${id}`;
}

// ─── Sales Orders ─────────────────────────────────────────────────────────────

export async function getSalesOrders(bu?: string): Promise<SalesOrder[]> {
  await initERPDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM erp_sales_orders
    WHERE (${bu ?? null}::text IS NULL OR bu = ${bu ?? null})
    ORDER BY date DESC, created_at DESC
  `;
  return rows.map(rowToSalesOrder);
}

export async function upsertSalesOrder(order: SalesOrder): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`
    INSERT INTO erp_sales_orders
      (id, numero, customer, date, value, status, bu, created_at)
    VALUES
      (${order.id}, ${order.numero}, ${order.customer}, ${order.date},
       ${order.value}, ${order.status}, ${order.bu}, ${order.created_at})
    ON CONFLICT (id) DO UPDATE SET
      numero   = EXCLUDED.numero,
      customer = EXCLUDED.customer,
      date     = EXCLUDED.date,
      value    = EXCLUDED.value,
      status   = EXCLUDED.status,
      bu       = EXCLUDED.bu
  `;
}

export async function deleteSalesOrder(id: string): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`DELETE FROM erp_sales_orders WHERE id = ${id}`;
}

// ─── Inventory Items ──────────────────────────────────────────────────────────

export async function getInventoryItems(bu?: string): Promise<InventoryItem[]> {
  await initERPDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM erp_inventory_items
    WHERE (${bu ?? null}::text IS NULL OR bu = ${bu ?? null})
    ORDER BY code ASC, created_at DESC
  `;
  return rows.map(rowToInventoryItem);
}

export async function upsertInventoryItem(item: InventoryItem): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`
    INSERT INTO erp_inventory_items
      (id, code, description, category, unit, qty_stock, location, bu, created_at)
    VALUES
      (${item.id}, ${item.code}, ${item.description}, ${item.category},
       ${item.unit}, ${item.qty_stock}, ${item.location}, ${item.bu}, ${item.created_at})
    ON CONFLICT (id) DO UPDATE SET
      code        = EXCLUDED.code,
      description = EXCLUDED.description,
      category    = EXCLUDED.category,
      unit        = EXCLUDED.unit,
      qty_stock   = EXCLUDED.qty_stock,
      location    = EXCLUDED.location,
      bu          = EXCLUDED.bu
  `;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`DELETE FROM erp_inventory_movements WHERE item_id = ${id}`;
  await sql`DELETE FROM erp_inventory_items WHERE id = ${id}`;
}

// ─── Inventory Movements ──────────────────────────────────────────────────────

export async function getInventoryMovements(itemId?: string): Promise<InventoryMovement[]> {
  await initERPDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM erp_inventory_movements
    WHERE (${itemId ?? null}::text IS NULL OR item_id = ${itemId ?? null})
    ORDER BY date DESC, created_at DESC
  `;
  return rows.map(rowToInventoryMovement);
}

export async function addInventoryMovement(mov: InventoryMovement): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`
    INSERT INTO erp_inventory_movements
      (id, item_id, type, quantity, date, reason, bu, created_at)
    VALUES
      (${mov.id}, ${mov.item_id}, ${mov.type}, ${mov.quantity},
       ${mov.date}, ${mov.reason}, ${mov.bu}, ${mov.created_at})
    ON CONFLICT (id) DO NOTHING
  `;
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export async function getERPContracts(bu?: string): Promise<ERPContract[]> {
  await initERPDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM erp_contracts
    WHERE (${bu ?? null}::text IS NULL OR bu = ${bu ?? null})
    ORDER BY start_date DESC, created_at DESC
  `;
  return rows.map(rowToERPContract);
}

export async function upsertERPContract(c: ERPContract): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`
    INSERT INTO erp_contracts
      (id, numero, counterparty, object, total_value, start_date, end_date, status, bu, created_at)
    VALUES
      (${c.id}, ${c.numero}, ${c.counterparty}, ${c.object}, ${c.total_value},
       ${c.start_date}, ${c.end_date}, ${c.status}, ${c.bu}, ${c.created_at})
    ON CONFLICT (id) DO UPDATE SET
      numero       = EXCLUDED.numero,
      counterparty = EXCLUDED.counterparty,
      object       = EXCLUDED.object,
      total_value  = EXCLUDED.total_value,
      start_date   = EXCLUDED.start_date,
      end_date     = EXCLUDED.end_date,
      status       = EXCLUDED.status,
      bu           = EXCLUDED.bu
  `;
}

export async function deleteERPContract(id: string): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`DELETE FROM erp_contracts WHERE id = ${id}`;
}

// ─── Fixed Assets ─────────────────────────────────────────────────────────────

export async function getFixedAssets(bu?: string): Promise<FixedAsset[]> {
  await initERPDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM erp_fixed_assets
    WHERE (${bu ?? null}::text IS NULL OR bu = ${bu ?? null})
    ORDER BY code ASC, created_at DESC
  `;
  return rows.map(rowToFixedAsset);
}

export async function upsertFixedAsset(a: FixedAsset): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`
    INSERT INTO erp_fixed_assets
      (id, code, description, category, location, acquisition_value, acquisition_date,
       useful_life_months, residual_value, accumulated_depreciation, is_active, status, bu, created_at)
    VALUES
      (${a.id}, ${a.code}, ${a.description}, ${a.category}, ${a.location},
       ${a.acquisition_value}, ${a.acquisition_date},
       ${a.useful_life_months}, ${a.residual_value}, ${a.accumulated_depreciation}, ${a.is_active},
       ${a.status}, ${a.bu}, ${a.created_at})
    ON CONFLICT (id) DO UPDATE SET
      code                     = EXCLUDED.code,
      description              = EXCLUDED.description,
      category                 = EXCLUDED.category,
      location                 = EXCLUDED.location,
      acquisition_value        = EXCLUDED.acquisition_value,
      acquisition_date         = EXCLUDED.acquisition_date,
      useful_life_months       = EXCLUDED.useful_life_months,
      residual_value           = EXCLUDED.residual_value,
      accumulated_depreciation = EXCLUDED.accumulated_depreciation,
      is_active                = EXCLUDED.is_active,
      status                   = EXCLUDED.status,
      bu                       = EXCLUDED.bu
  `;
}

export async function deleteFixedAsset(id: string): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`DELETE FROM erp_fixed_assets WHERE id = ${id}`;
}

// ─── Expense Reports ──────────────────────────────────────────────────────────

export async function getExpenseReports(bu?: string): Promise<ExpenseReport[]> {
  await initERPDB();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM erp_expense_reports
    WHERE (${bu ?? null}::text IS NULL OR bu = ${bu ?? null})
    ORDER BY date DESC, created_at DESC
  `;
  return rows.map(rowToExpenseReport);
}

export async function upsertExpenseReport(e: ExpenseReport): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`
    INSERT INTO erp_expense_reports
      (id, date, employee, category, description, value, status, bu, created_at)
    VALUES
      (${e.id}, ${e.date}, ${e.employee}, ${e.category}, ${e.description},
       ${e.value}, ${e.status}, ${e.bu}, ${e.created_at})
    ON CONFLICT (id) DO UPDATE SET
      date        = EXCLUDED.date,
      employee    = EXCLUDED.employee,
      category    = EXCLUDED.category,
      description = EXCLUDED.description,
      value       = EXCLUDED.value,
      status      = EXCLUDED.status,
      bu          = EXCLUDED.bu
  `;
}

export async function deleteExpenseReport(id: string): Promise<void> {
  await initERPDB();
  if (!sql) return;
  await sql`DELETE FROM erp_expense_reports WHERE id = ${id}`;
}
