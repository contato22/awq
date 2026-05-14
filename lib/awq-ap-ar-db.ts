import { sql } from "@/lib/db";

export type AwqApArItem = {
  id: string; item_type: string; bu: string; description: string;
  entity: string; amount: number; due_date: string | null;
  status: string; category: string; created_at: string;
};

export async function listAwqApArItems(): Promise<AwqApArItem[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,item_type,bu,description,entity,amount,due_date::text AS due_date,status,category,created_at::text AS created_at FROM ap_ar_items ORDER BY created_at DESC`;
  return rows as unknown as AwqApArItem[];
}

export async function createAwqApArItem(d: Omit<AwqApArItem, "id" | "created_at">): Promise<AwqApArItem> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO ap_ar_items (item_type,bu,description,entity,amount,due_date,status,category) VALUES (${d.item_type},${d.bu},${d.description},${d.entity},${d.amount},${d.due_date||null},${d.status},${d.category}) RETURNING id,item_type,bu,description,entity,amount,due_date::text AS due_date,status,category,created_at::text AS created_at`;
  return r as unknown as AwqApArItem;
}

export async function updateAwqApArStatus(id: string, status: string): Promise<AwqApArItem | null> {
  if (!sql) return null;
  const rows = await sql`UPDATE ap_ar_items SET status=${status},updated_at=NOW() WHERE id=${id} RETURNING id,item_type,bu,description,entity,amount,due_date::text AS due_date,status,category,created_at::text AS created_at`;
  return rows[0] as unknown as AwqApArItem ?? null;
}

export async function updateAwqApArItem(id: string, d: Partial<Omit<AwqApArItem, "id" | "created_at">>): Promise<AwqApArItem | null> {
  if (!sql) return null;
  const rows = await sql`UPDATE ap_ar_items SET item_type=COALESCE(${d.item_type ?? null},item_type),bu=COALESCE(${d.bu ?? null},bu),description=COALESCE(${d.description ?? null},description),entity=COALESCE(${d.entity ?? null},entity),amount=COALESCE(${d.amount ?? null},amount),due_date=COALESCE(${d.due_date ?? null},due_date),status=COALESCE(${d.status ?? null},status),category=COALESCE(${d.category ?? null},category),updated_at=NOW() WHERE id=${id} RETURNING id,item_type,bu,description,entity,amount,due_date::text AS due_date,status,category,created_at::text AS created_at`;
  return rows[0] as unknown as AwqApArItem ?? null;
}

export async function deleteAwqApArItem(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM ap_ar_items WHERE id=${id}`;
}
