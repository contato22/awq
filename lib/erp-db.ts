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

export type ErpExpense = {
  id: string; employee: string; category: string; description: string;
  amount: number; date: string; status: string;
};

export async function listExpenses(): Promise<ErpExpense[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,employee,category,description,amount,date::text AS date,status FROM erp_expenses ORDER BY date DESC`;
  return rows as unknown as ErpExpense[];
}
export async function createExpense(d: Omit<ErpExpense,"id">): Promise<ErpExpense> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_expenses ${sql(d)} RETURNING id,employee,category,description,amount,date::text AS date,status`;
  return r as unknown as ErpExpense;
}
export async function updateExpenseStatus(id: string, status: string): Promise<ErpExpense | null> {
  if (!sql) return null;
  const rows = await sql`UPDATE erp_expenses SET status=${status}, updated_at=NOW() WHERE id=${id} RETURNING id,employee,category,description,amount,date::text AS date,status`;
  return rows[0] as unknown as ErpExpense ?? null;
}
export async function deleteExpense(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_expenses WHERE id=${id}`;
}

export type ErpMaintenance = {
  id: string; asset_name: string; type: string; description: string;
  scheduled_date: string | null; completed_date: string | null;
  responsible: string; status: string;
};

export async function listMaintenance(): Promise<ErpMaintenance[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,asset_name,type,description,scheduled_date::text AS scheduled_date,completed_date::text AS completed_date,responsible,status FROM erp_asset_maintenance ORDER BY scheduled_date DESC`;
  return rows as unknown as ErpMaintenance[];
}
export async function createMaintenance(d: Omit<ErpMaintenance,"id">): Promise<ErpMaintenance> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_asset_maintenance ${sql(d)} RETURNING id,asset_name,type,description,scheduled_date::text AS scheduled_date,completed_date::text AS completed_date,responsible,status`;
  return r as unknown as ErpMaintenance;
}
export async function deleteMaintenance(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_asset_maintenance WHERE id=${id}`;
}

export type ErpInvoice = {
  id: string; customer: string; order_id: string | null;
  issue_date: string; value: number; status: string;
};
export async function listInvoices(): Promise<ErpInvoice[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,customer,order_id,issue_date::text AS issue_date,value,status FROM erp_invoices ORDER BY issue_date DESC`;
  return rows as unknown as ErpInvoice[];
}
export async function createInvoice(d: Omit<ErpInvoice,"id">): Promise<ErpInvoice> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_invoices ${sql(d)} RETURNING id,customer,order_id,issue_date::text AS issue_date,value,status`;
  return r as unknown as ErpInvoice;
}
export async function deleteInvoice(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_invoices WHERE id=${id}`;
}

export type ErpFulfillment = {
  id: string; customer: string; order_id: string | null;
  priority: string; status: string; notes: string;
};
export async function listFulfillment(): Promise<ErpFulfillment[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,customer,order_id,priority,status,notes FROM erp_fulfillment ORDER BY created_at DESC`;
  return rows as unknown as ErpFulfillment[];
}
export async function createFulfillment(d: Omit<ErpFulfillment,"id">): Promise<ErpFulfillment> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_fulfillment ${sql(d)} RETURNING id,customer,order_id,priority,status,notes`;
  return r as unknown as ErpFulfillment;
}
export async function deleteFulfillment(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_fulfillment WHERE id=${id}`;
}

export type ErpShipment = {
  id: string; carrier: string; shipment_date: string | null;
  estimated_delivery: string | null; status: string; notes: string;
};
export async function listShipments(): Promise<ErpShipment[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,carrier,shipment_date::text AS shipment_date,estimated_delivery::text AS estimated_delivery,status,notes FROM erp_shipments ORDER BY shipment_date DESC NULLS LAST`;
  return rows as unknown as ErpShipment[];
}
export async function createShipment(d: Omit<ErpShipment,"id">): Promise<ErpShipment> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_shipments ${sql(d)} RETURNING id,carrier,shipment_date::text AS shipment_date,estimated_delivery::text AS estimated_delivery,status,notes`;
  return r as unknown as ErpShipment;
}
export async function deleteShipment(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_shipments WHERE id=${id}`;
}

export type ErpDisposal = {
  id: string; asset_name: string; reason: string; disposal_date: string | null;
  book_value: number; sale_price: number; responsible: string; result: string;
};
export async function listDisposals(): Promise<ErpDisposal[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,asset_name,reason,disposal_date::text AS disposal_date,book_value,sale_price,responsible,result FROM erp_asset_disposals ORDER BY disposal_date DESC NULLS LAST`;
  return rows as unknown as ErpDisposal[];
}
export async function createDisposal(d: Omit<ErpDisposal,"id">): Promise<ErpDisposal> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_asset_disposals ${sql(d)} RETURNING id,asset_name,reason,disposal_date::text AS disposal_date,book_value,sale_price,responsible,result`;
  return r as unknown as ErpDisposal;
}
export async function deleteDisposal(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_asset_disposals WHERE id=${id}`;
}

export type ErpRequisition = {
  id: string; item_name: string; quantity: number;
  requester: string; needed_date: string | null; status: string; notes: string;
};
export async function listRequisitions(): Promise<ErpRequisition[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,item_name,quantity,requester,needed_date::text AS needed_date,status,notes FROM erp_requisitions ORDER BY needed_date ASC NULLS LAST`;
  return rows as unknown as ErpRequisition[];
}
export async function createRequisition(d: Omit<ErpRequisition,"id">): Promise<ErpRequisition> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_requisitions ${sql(d)} RETURNING id,item_name,quantity,requester,needed_date::text AS needed_date,status,notes`;
  return r as unknown as ErpRequisition;
}
export async function deleteRequisition(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_requisitions WHERE id=${id}`;
}

export type ErpReceiving = {
  id: string; supplier: string; received_date: string;
  item_name: string; quantity: number; status: string; notes: string;
};
export async function listReceiving(): Promise<ErpReceiving[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,supplier,received_date::text AS received_date,item_name,quantity,status,notes FROM erp_receiving ORDER BY received_date DESC`;
  return rows as unknown as ErpReceiving[];
}
export async function createReceiving(d: Omit<ErpReceiving,"id">): Promise<ErpReceiving> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_receiving ${sql(d)} RETURNING id,supplier,received_date::text AS received_date,item_name,quantity,status,notes`;
  return r as unknown as ErpReceiving;
}
export async function deleteReceiving(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_receiving WHERE id=${id}`;
}

export type ErpInventoryMovement = {
  id: string; type: string; item_name: string; quantity: number;
  date: string; origin: string; destination: string; reference: string;
};
export async function listInventoryMovements(): Promise<ErpInventoryMovement[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,type,item_name,quantity,date::text AS date,origin,destination,reference FROM erp_inventory_movements ORDER BY date DESC`;
  return rows as unknown as ErpInventoryMovement[];
}
export async function createInventoryMovement(d: Omit<ErpInventoryMovement,"id">): Promise<ErpInventoryMovement> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_inventory_movements ${sql(d)} RETURNING id,type,item_name,quantity,date::text AS date,origin,destination,reference`;
  return r as unknown as ErpInventoryMovement;
}
export async function deleteInventoryMovement(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_inventory_movements WHERE id=${id}`;
}

export type ErpWarehouse = {
  id: string; code: string; name: string; address: string;
  capacity: string; manager: string; status: string;
};
export async function listWarehouses(): Promise<ErpWarehouse[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,code,name,address,capacity,manager,status FROM erp_warehouses ORDER BY name`;
  return rows as unknown as ErpWarehouse[];
}
export async function createWarehouse(d: Omit<ErpWarehouse,"id">): Promise<ErpWarehouse> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_warehouses ${sql(d)} RETURNING id,code,name,address,capacity,manager,status`;
  return r as unknown as ErpWarehouse;
}
export async function deleteWarehouse(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_warehouses WHERE id=${id}`;
}

export type ErpContractObligation = {
  id: string; contract_name: string; title: string;
  responsible: string; due_date: string | null; recurrence: string; status: string;
};
export async function listContractObligations(): Promise<ErpContractObligation[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,contract_name,title,responsible,due_date::text AS due_date,recurrence,status FROM erp_contract_obligations ORDER BY due_date ASC NULLS LAST`;
  return rows as unknown as ErpContractObligation[];
}
export async function createContractObligation(d: Omit<ErpContractObligation,"id">): Promise<ErpContractObligation> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO erp_contract_obligations ${sql(d)} RETURNING id,contract_name,title,responsible,due_date::text AS due_date,recurrence,status`;
  return r as unknown as ErpContractObligation;
}
export async function deleteContractObligation(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM erp_contract_obligations WHERE id=${id}`;
}
