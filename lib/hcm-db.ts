import { sql } from "@/lib/db";

export type HcmEmployee = {
  id: string; name: string; email: string; department: string;
  role: string; status: string; hire_date: string | null;
  salary: number; manager: string;
};
export type HcmAbsence = {
  id: string; employee_id: string; type: string;
  start_date: string; end_date: string; status: string; notes: string;
};
export type HcmPayroll = {
  id: string; employee_id: string; periodo: string;
  gross: number; deductions: number; net: number; status: string;
};
export type HcmRecruitment = {
  id: string; position: string; department: string; status: string;
  candidates: number; opened_date: string; closed_date: string | null; owner: string;
};
export type HcmTraining = {
  id: string; employee_id: string; course: string; provider: string;
  status: string; start_date: string | null; end_date: string | null; hours: number;
};

export async function listEmployees(): Promise<HcmEmployee[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,email,department,role,status,hire_date::text AS hire_date,salary,manager FROM hcm_employees ORDER BY name`;
  return rows as unknown as HcmEmployee[];
}
export async function createEmployee(d: Omit<HcmEmployee,"id">): Promise<HcmEmployee> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO hcm_employees ${sql(d)} RETURNING id,name,email,department,role,status,hire_date::text AS hire_date,salary,manager`;
  return r as unknown as HcmEmployee;
}
export async function updateEmployee(id: string, d: Partial<Omit<HcmEmployee,"id">>): Promise<HcmEmployee|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE hcm_employees SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,name,email,department,role,status,hire_date::text AS hire_date,salary,manager`;
  return rows[0] as unknown as HcmEmployee ?? null;
}
export async function deleteEmployee(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM hcm_employees WHERE id=${id}`;
}

export async function listAbsences(employee_id?: string): Promise<HcmAbsence[]> {
  if (!sql) return [];
  const rows = employee_id
    ? await sql`SELECT id,employee_id,type,start_date::text AS start_date,end_date::text AS end_date,status,notes FROM hcm_absences WHERE employee_id=${employee_id} ORDER BY start_date DESC`
    : await sql`SELECT id,employee_id,type,start_date::text AS start_date,end_date::text AS end_date,status,notes FROM hcm_absences ORDER BY start_date DESC`;
  return rows as unknown as HcmAbsence[];
}
export async function createAbsence(d: Omit<HcmAbsence,"id">): Promise<HcmAbsence> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO hcm_absences ${sql(d)} RETURNING id,employee_id,type,start_date::text AS start_date,end_date::text AS end_date,status,notes`;
  return r as unknown as HcmAbsence;
}

export async function listPayroll(employee_id?: string): Promise<HcmPayroll[]> {
  if (!sql) return [];
  const rows = employee_id
    ? await sql`SELECT id,employee_id,periodo,gross,deductions,net,status FROM hcm_payroll WHERE employee_id=${employee_id} ORDER BY periodo DESC`
    : await sql`SELECT id,employee_id,periodo,gross,deductions,net,status FROM hcm_payroll ORDER BY periodo DESC`;
  return rows as unknown as HcmPayroll[];
}
export async function createPayroll(d: Omit<HcmPayroll,"id">): Promise<HcmPayroll> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO hcm_payroll ${sql(d)} RETURNING id,employee_id,periodo,gross,deductions,net,status`;
  return r as unknown as HcmPayroll;
}

export async function listRecruitment(): Promise<HcmRecruitment[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,position,department,status,candidates,opened_date::text AS opened_date,closed_date::text AS closed_date,owner FROM hcm_recruitment ORDER BY opened_date DESC`;
  return rows as unknown as HcmRecruitment[];
}
export async function createRecruitment(d: Omit<HcmRecruitment,"id">): Promise<HcmRecruitment> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO hcm_recruitment ${sql(d)} RETURNING id,position,department,status,candidates,opened_date::text AS opened_date,closed_date::text AS closed_date,owner`;
  return r as unknown as HcmRecruitment;
}
export async function updateRecruitment(id: string, d: Partial<Omit<HcmRecruitment,"id">>): Promise<HcmRecruitment|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE hcm_recruitment SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,position,department,status,candidates,opened_date::text AS opened_date,closed_date::text AS closed_date,owner`;
  return rows[0] as unknown as HcmRecruitment ?? null;
}

export async function listTraining(employee_id?: string): Promise<HcmTraining[]> {
  if (!sql) return [];
  const rows = employee_id
    ? await sql`SELECT id,employee_id,course,provider,status,start_date::text AS start_date,end_date::text AS end_date,hours FROM hcm_training WHERE employee_id=${employee_id} ORDER BY created_at DESC`
    : await sql`SELECT id,employee_id,course,provider,status,start_date::text AS start_date,end_date::text AS end_date,hours FROM hcm_training ORDER BY created_at DESC`;
  return rows as unknown as HcmTraining[];
}
export async function createTraining(d: Omit<HcmTraining,"id">): Promise<HcmTraining> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO hcm_training ${sql(d)} RETURNING id,employee_id,course,provider,status,start_date::text AS start_date,end_date::text AS end_date,hours`;
  return r as unknown as HcmTraining;
}
