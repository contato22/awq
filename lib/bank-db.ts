import { sql } from "@/lib/db";

export type BankAccountRow = {
  id: string; bank: string; name: string; color: string;
  current_balance: number; last_updated: string | null;
};

export type BankTransactionRow = {
  id: string; account_id: string; tx_date: string | null;
  description: string; amount: number; category: string;
  balance: number | null;
};

export async function listBankAccounts(): Promise<BankAccountRow[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,bank,name,color,current_balance,last_updated::text AS last_updated FROM bank_accounts ORDER BY name`;
  return rows as unknown as BankAccountRow[];
}

export async function createBankAccount(d: Omit<BankAccountRow, "id">): Promise<BankAccountRow> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO bank_accounts (bank,name,color,current_balance,last_updated) VALUES (${d.bank},${d.name},${d.color},${d.current_balance},${d.last_updated||null}) RETURNING id,bank,name,color,current_balance,last_updated::text AS last_updated`;
  return r as unknown as BankAccountRow;
}

export async function deleteBankAccount(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM bank_accounts WHERE id=${id}`;
}

export async function listBankTransactions(account_id?: string): Promise<BankTransactionRow[]> {
  if (!sql) return [];
  const rows = account_id
    ? await sql`SELECT id,account_id,tx_date::text AS tx_date,description,amount,category,balance FROM bank_transactions WHERE account_id=${account_id} ORDER BY tx_date DESC NULLS LAST`
    : await sql`SELECT id,account_id,tx_date::text AS tx_date,description,amount,category,balance FROM bank_transactions ORDER BY tx_date DESC NULLS LAST`;
  return rows as unknown as BankTransactionRow[];
}

export async function createBankTransaction(d: Omit<BankTransactionRow, "id">): Promise<BankTransactionRow> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO bank_transactions (account_id,tx_date,description,amount,category,balance) VALUES (${d.account_id},${d.tx_date||null},${d.description},${d.amount},${d.category},${d.balance??null}) RETURNING id,account_id,tx_date::text AS tx_date,description,amount,category,balance`;
  return r as unknown as BankTransactionRow;
}

export async function deleteBankTransaction(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM bank_transactions WHERE id=${id}`;
}

export type AllocFlagRow = {
  id: string; bu_id: string; flag: string; capital_allocated: number;
};

export async function listAllocFlags(): Promise<AllocFlagRow[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,bu_id,flag,capital_allocated FROM awq_alloc_flags ORDER BY bu_id`;
  return rows as unknown as AllocFlagRow[];
}

export async function upsertAllocFlag(bu_id: string, flag: string, capital_allocated: number): Promise<AllocFlagRow> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO awq_alloc_flags (bu_id,flag,capital_allocated) VALUES (${bu_id},${flag},${capital_allocated}) ON CONFLICT (bu_id) DO UPDATE SET flag=${flag},capital_allocated=${capital_allocated},updated_at=NOW() RETURNING id,bu_id,flag,capital_allocated`;
  return r as unknown as AllocFlagRow;
}

export type CategoryBudgetRow = {
  id: string; category: string; bu: string; budget: number; actual: number;
};

export async function listCategoryBudget(): Promise<CategoryBudgetRow[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,category,bu,budget,actual FROM awq_category_budget ORDER BY category`;
  return rows as unknown as CategoryBudgetRow[];
}

export async function upsertCategoryBudget(category: string, bu: string, budget: number, actual: number): Promise<CategoryBudgetRow> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO awq_category_budget (category,bu,budget,actual) VALUES (${category},${bu},${budget},${actual}) ON CONFLICT (category,bu) DO UPDATE SET budget=${budget},actual=${actual},updated_at=NOW() RETURNING id,category,bu,budget,actual`;
  return r as unknown as CategoryBudgetRow;
}
