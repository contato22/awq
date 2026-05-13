import { sql } from "@/lib/db";

export type ErpItem = {
  id: string; sku: string; name: string; category: string; unit: string;
  cost: number; price: number; stock: number; location: string;
};
export type ErpOrder = {
  id: string; type: string; customer: string; status: string;
  total: number; owner: string; notes: string; order_date: string;
};
export type ErpOrderItem = {
  id: string; order_id: string; item_id: string; qty: number; unit_price: number;
};
export type ErpContract = {
  id: string; name: string; party: string; type: string; value: number;
  start_date: string | null; end_date: string | null; status: string;
  auto_renew: boolean; owner: string;
};
export type ErpAsset = {
  id: string; name: string; category: string; acquisition_date: string | null;
  acquisition_cost: number; current_value: number; depreciation_pct: number;
  status: string; location: string; owner: string;
};
export type ErpTimeEntry = {
  id: string; employee: string; project: string; date: string;
  hours: number; description: string; status: string;
};

export async function listItems(): Promise<ErpItem[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,sku,name,category,unit,cost,price,stock,location FROM erp_items ORDER BY name`;
  return rows as unknown as ErpItem[];
}
export async function createItem(d: Omit<ErpItem,"id">): Promise<ErpItem> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_items ${sql(d)} RETURNING id,sku,name,category,unit,cost,price,stock,location`;
  return r as unknown as ErpItem;
}
export async function updateItem(id: string, d: Partial<Omit<ErpItem,"id">>): Promise<ErpItem|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE erp_items SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,sku,name,category,unit,cost,price,stock,location`;
  return rows[0] as unknown as ErpItem ?? null;
}
export async function deleteItem(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_items WHERE id=${id}`;
}

export async function listOrders(): Promise<ErpOrder[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,type,customer,status,total,owner,notes,order_date::text AS order_date FROM erp_orders ORDER BY order_date DESC`;
  return rows as unknown as ErpOrder[];
}
export async function createOrder(d: Omit<ErpOrder,"id">): Promise<ErpOrder> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_orders ${sql(d)} RETURNING id,type,customer,status,total,owner,notes,order_date::text AS order_date`;
  return r as unknown as ErpOrder;
}
export async function updateOrder(id: string, d: Partial<Omit<ErpOrder,"id">>): Promise<ErpOrder|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE erp_orders SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,type,customer,status,total,owner,notes,order_date::text AS order_date`;
  return rows[0] as unknown as ErpOrder ?? null;
}

export async function listContracts(): Promise<ErpContract[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,party,type,value,start_date::text AS start_date,end_date::text AS end_date,status,auto_renew,owner FROM erp_contracts ORDER BY updated_at DESC`;
  return rows as unknown as ErpContract[];
}
export async function createContract(d: Omit<ErpContract,"id">): Promise<ErpContract> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_contracts ${sql(d)} RETURNING id,name,party,type,value,start_date::text AS start_date,end_date::text AS end_date,status,auto_renew,owner`;
  return r as unknown as ErpContract;
}
export async function updateContract(id: string, d: Partial<Omit<ErpContract,"id">>): Promise<ErpContract|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE erp_contracts SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,name,party,type,value,start_date::text AS start_date,end_date::text AS end_date,status,auto_renew,owner`;
  return rows[0] as unknown as ErpContract ?? null;
}

export async function listAssets(): Promise<ErpAsset[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,category,acquisition_date::text AS acquisition_date,acquisition_cost,current_value,depreciation_pct,status,location,owner FROM erp_assets ORDER BY name`;
  return rows as unknown as ErpAsset[];
}
export async function createAsset(d: Omit<ErpAsset,"id">): Promise<ErpAsset> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_assets ${sql(d)} RETURNING id,name,category,acquisition_date::text AS acquisition_date,acquisition_cost,current_value,depreciation_pct,status,location,owner`;
  return r as unknown as ErpAsset;
}

export async function listTimeEntries(): Promise<ErpTimeEntry[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,employee,project,date::text AS date,hours,description,status FROM erp_timeentries ORDER BY date DESC`;
  return rows as unknown as ErpTimeEntry[];
}
export async function createTimeEntry(d: Omit<ErpTimeEntry,"id">): Promise<ErpTimeEntry> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_timeentries ${sql(d)} RETURNING id,employee,project,date::text AS date,hours,description,status`;
  return r as unknown as ErpTimeEntry;
}
