// ─── HCM (Human Capital Management) — Database Layer ─────────────────────────
//
// Stores employees, payroll runs, vacation requests, job openings, and training
// courses for the /awq/hcm UI.
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (hcm_* tables)
//   DATABASE_URL unset → returns [] (client uses localStorage as fallback)

import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmployeeStatus = "Ativo" | "Inativo" | "Afastado";
export interface Employee {
  id:           string;
  name:         string;
  role:         string;
  department:   string;
  bu:           string;
  salary:       number;
  hire_date:    string;   // ISO date
  status:       EmployeeStatus;
  email:        string;
  created_at:   string;
}

export type PayrollStatus = "Rascunho" | "Processado" | "Pago";
export interface PayrollRun {
  id:             string;
  period:         string;  // "2026-05" (YYYY-MM)
  bu:             string;
  total_gross:    number;
  total_net:      number;
  employee_count: number;
  status:         PayrollStatus;
  payment_date:   string | null;
  created_at:     string;
}

export type VacationStatus = "Solicitado" | "Aprovado" | "Rejeitado" | "Concluído";
export interface VacationRequest {
  id:            string;
  employee_id:   string;
  employee_name: string;
  start_date:    string;
  end_date:      string;
  days:          number;
  status:        VacationStatus;
  bu:            string;
  created_at:    string;
}

export type RecruitmentStatus = "Aberta" | "Em Triagem" | "Entrevistas" | "Oferta" | "Encerrada";
export interface JobOpening {
  id:           string;
  title:        string;
  department:   string;
  bu:           string;
  status:       RecruitmentStatus;
  open_date:    string;
  close_date:   string | null;
  applications: number;
  created_at:   string;
}

export type TrainingStatus = "Planejado" | "Em Andamento" | "Concluído" | "Cancelado";
export interface TrainingCourse {
  id:           string;
  title:        string;
  category:     string;  // "Técnico" | "Liderança" | "Compliance" | "Outros"
  instructor:   string;
  start_date:   string;
  end_date:     string;
  participants: number;
  status:       TrainingStatus;
  bu:           string;
  created_at:   string;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _ready = false;

export async function initHCMDB(): Promise<void> {
  if (!sql || _ready) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS hcm_employees (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        role        TEXT NOT NULL,
        department  TEXT NOT NULL,
        bu          TEXT NOT NULL,
        salary      NUMERIC NOT NULL,
        hire_date   TEXT NOT NULL,
        status      TEXT NOT NULL,
        email       TEXT NOT NULL,
        created_at  TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_employees_bu     ON hcm_employees(bu)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_employees_status ON hcm_employees(status)`;

    await sql`
      CREATE TABLE IF NOT EXISTS hcm_payroll_runs (
        id             TEXT PRIMARY KEY,
        period         TEXT NOT NULL,
        bu             TEXT NOT NULL,
        total_gross    NUMERIC NOT NULL,
        total_net      NUMERIC NOT NULL,
        employee_count INTEGER NOT NULL,
        status         TEXT NOT NULL,
        payment_date   TEXT,
        created_at     TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_payroll_bu     ON hcm_payroll_runs(bu)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_payroll_period ON hcm_payroll_runs(period)`;

    await sql`
      CREATE TABLE IF NOT EXISTS hcm_vacation_requests (
        id            TEXT PRIMARY KEY,
        employee_id   TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        start_date    TEXT NOT NULL,
        end_date      TEXT NOT NULL,
        days          INTEGER NOT NULL,
        status        TEXT NOT NULL,
        bu            TEXT NOT NULL,
        created_at    TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_vacation_bu          ON hcm_vacation_requests(bu)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_vacation_employee_id ON hcm_vacation_requests(employee_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS hcm_job_openings (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,
        department   TEXT NOT NULL,
        bu           TEXT NOT NULL,
        status       TEXT NOT NULL,
        open_date    TEXT NOT NULL,
        close_date   TEXT,
        applications INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_jobs_bu     ON hcm_job_openings(bu)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_jobs_status ON hcm_job_openings(status)`;

    await sql`
      CREATE TABLE IF NOT EXISTS hcm_training_courses (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,
        category     TEXT NOT NULL,
        instructor   TEXT NOT NULL,
        start_date   TEXT NOT NULL,
        end_date     TEXT NOT NULL,
        participants INTEGER NOT NULL DEFAULT 0,
        status       TEXT NOT NULL,
        bu           TEXT NOT NULL,
        created_at   TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_training_bu     ON hcm_training_courses(bu)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hcm_training_status ON hcm_training_courses(status)`;

    _ready = true;
  } catch { /* DB unavailable — client falls back to localStorage */ }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToEmployee(r: Record<string, unknown>): Employee {
  return {
    id:         r.id as string,
    name:       r.name as string,
    role:       r.role as string,
    department: r.department as string,
    bu:         r.bu as string,
    salary:     Number(r.salary),
    hire_date:  r.hire_date as string,
    status:     r.status as EmployeeStatus,
    email:      r.email as string,
    created_at: r.created_at as string,
  };
}

function rowToPayrollRun(r: Record<string, unknown>): PayrollRun {
  return {
    id:             r.id as string,
    period:         r.period as string,
    bu:             r.bu as string,
    total_gross:    Number(r.total_gross),
    total_net:      Number(r.total_net),
    employee_count: Number(r.employee_count),
    status:         r.status as PayrollStatus,
    payment_date:   (r.payment_date as string) ?? null,
    created_at:     r.created_at as string,
  };
}

function rowToVacationRequest(r: Record<string, unknown>): VacationRequest {
  return {
    id:            r.id as string,
    employee_id:   r.employee_id as string,
    employee_name: r.employee_name as string,
    start_date:    r.start_date as string,
    end_date:      r.end_date as string,
    days:          Number(r.days),
    status:        r.status as VacationStatus,
    bu:            r.bu as string,
    created_at:    r.created_at as string,
  };
}

function rowToJobOpening(r: Record<string, unknown>): JobOpening {
  return {
    id:           r.id as string,
    title:        r.title as string,
    department:   r.department as string,
    bu:           r.bu as string,
    status:       r.status as RecruitmentStatus,
    open_date:    r.open_date as string,
    close_date:   (r.close_date as string) ?? null,
    applications: Number(r.applications),
    created_at:   r.created_at as string,
  };
}

function rowToTrainingCourse(r: Record<string, unknown>): TrainingCourse {
  return {
    id:           r.id as string,
    title:        r.title as string,
    category:     r.category as string,
    instructor:   r.instructor as string,
    start_date:   r.start_date as string,
    end_date:     r.end_date as string,
    participants: Number(r.participants),
    status:       r.status as TrainingStatus,
    bu:           r.bu as string,
    created_at:   r.created_at as string,
  };
}

// ─── Employees ────────────────────────────────────────────────────────────────

export async function getEmployees(bu?: string): Promise<Employee[]> {
  await initHCMDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM hcm_employees WHERE bu = ${bu} ORDER BY name ASC`
    : await sql`SELECT * FROM hcm_employees ORDER BY name ASC`;
  return rows.map(rowToEmployee);
}

export async function upsertEmployee(e: Employee): Promise<void> {
  await initHCMDB();
  if (!sql) return;
  await sql`
    INSERT INTO hcm_employees
      (id, name, role, department, bu, salary, hire_date, status, email, created_at)
    VALUES
      (${e.id}, ${e.name}, ${e.role}, ${e.department}, ${e.bu},
       ${e.salary}, ${e.hire_date}, ${e.status}, ${e.email}, ${e.created_at})
    ON CONFLICT (id) DO UPDATE SET
      name       = EXCLUDED.name,
      role       = EXCLUDED.role,
      department = EXCLUDED.department,
      bu         = EXCLUDED.bu,
      salary     = EXCLUDED.salary,
      hire_date  = EXCLUDED.hire_date,
      status     = EXCLUDED.status,
      email      = EXCLUDED.email
  `;
}

export async function deleteEmployee(id: string): Promise<void> {
  await initHCMDB();
  if (!sql) return;
  await sql`DELETE FROM hcm_employees WHERE id = ${id}`;
}

// ─── Payroll Runs ─────────────────────────────────────────────────────────────

export async function getPayrollRuns(bu?: string): Promise<PayrollRun[]> {
  await initHCMDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM hcm_payroll_runs WHERE bu = ${bu} ORDER BY period DESC, created_at DESC`
    : await sql`SELECT * FROM hcm_payroll_runs ORDER BY period DESC, created_at DESC`;
  return rows.map(rowToPayrollRun);
}

export async function upsertPayrollRun(p: PayrollRun): Promise<void> {
  await initHCMDB();
  if (!sql) return;
  await sql`
    INSERT INTO hcm_payroll_runs
      (id, period, bu, total_gross, total_net, employee_count, status, payment_date, created_at)
    VALUES
      (${p.id}, ${p.period}, ${p.bu}, ${p.total_gross}, ${p.total_net},
       ${p.employee_count}, ${p.status}, ${p.payment_date ?? null}, ${p.created_at})
    ON CONFLICT (id) DO UPDATE SET
      period         = EXCLUDED.period,
      bu             = EXCLUDED.bu,
      total_gross    = EXCLUDED.total_gross,
      total_net      = EXCLUDED.total_net,
      employee_count = EXCLUDED.employee_count,
      status         = EXCLUDED.status,
      payment_date   = EXCLUDED.payment_date
  `;
}

// ─── Vacation Requests ────────────────────────────────────────────────────────

export async function getVacationRequests(bu?: string): Promise<VacationRequest[]> {
  await initHCMDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM hcm_vacation_requests WHERE bu = ${bu} ORDER BY start_date DESC`
    : await sql`SELECT * FROM hcm_vacation_requests ORDER BY start_date DESC`;
  return rows.map(rowToVacationRequest);
}

export async function upsertVacationRequest(v: VacationRequest): Promise<void> {
  await initHCMDB();
  if (!sql) return;
  await sql`
    INSERT INTO hcm_vacation_requests
      (id, employee_id, employee_name, start_date, end_date, days, status, bu, created_at)
    VALUES
      (${v.id}, ${v.employee_id}, ${v.employee_name}, ${v.start_date}, ${v.end_date},
       ${v.days}, ${v.status}, ${v.bu}, ${v.created_at})
    ON CONFLICT (id) DO UPDATE SET
      employee_id   = EXCLUDED.employee_id,
      employee_name = EXCLUDED.employee_name,
      start_date    = EXCLUDED.start_date,
      end_date      = EXCLUDED.end_date,
      days          = EXCLUDED.days,
      status        = EXCLUDED.status,
      bu            = EXCLUDED.bu
  `;
}

export async function deleteVacationRequest(id: string): Promise<void> {
  await initHCMDB();
  if (!sql) return;
  await sql`DELETE FROM hcm_vacation_requests WHERE id = ${id}`;
}

// ─── Job Openings ─────────────────────────────────────────────────────────────

export async function getJobOpenings(bu?: string): Promise<JobOpening[]> {
  await initHCMDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM hcm_job_openings WHERE bu = ${bu} ORDER BY open_date DESC`
    : await sql`SELECT * FROM hcm_job_openings ORDER BY open_date DESC`;
  return rows.map(rowToJobOpening);
}

export async function upsertJobOpening(j: JobOpening): Promise<void> {
  await initHCMDB();
  if (!sql) return;
  await sql`
    INSERT INTO hcm_job_openings
      (id, title, department, bu, status, open_date, close_date, applications, created_at)
    VALUES
      (${j.id}, ${j.title}, ${j.department}, ${j.bu}, ${j.status},
       ${j.open_date}, ${j.close_date ?? null}, ${j.applications}, ${j.created_at})
    ON CONFLICT (id) DO UPDATE SET
      title        = EXCLUDED.title,
      department   = EXCLUDED.department,
      bu           = EXCLUDED.bu,
      status       = EXCLUDED.status,
      open_date    = EXCLUDED.open_date,
      close_date   = EXCLUDED.close_date,
      applications = EXCLUDED.applications
  `;
}

export async function deleteJobOpening(id: string): Promise<void> {
  await initHCMDB();
  if (!sql) return;
  await sql`DELETE FROM hcm_job_openings WHERE id = ${id}`;
}

// ─── Training Courses ─────────────────────────────────────────────────────────

export async function getTrainingCourses(bu?: string): Promise<TrainingCourse[]> {
  await initHCMDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM hcm_training_courses WHERE bu = ${bu} ORDER BY start_date DESC`
    : await sql`SELECT * FROM hcm_training_courses ORDER BY start_date DESC`;
  return rows.map(rowToTrainingCourse);
}

export async function upsertTrainingCourse(t: TrainingCourse): Promise<void> {
  await initHCMDB();
  if (!sql) return;
  await sql`
    INSERT INTO hcm_training_courses
      (id, title, category, instructor, start_date, end_date, participants, status, bu, created_at)
    VALUES
      (${t.id}, ${t.title}, ${t.category}, ${t.instructor}, ${t.start_date},
       ${t.end_date}, ${t.participants}, ${t.status}, ${t.bu}, ${t.created_at})
    ON CONFLICT (id) DO UPDATE SET
      title        = EXCLUDED.title,
      category     = EXCLUDED.category,
      instructor   = EXCLUDED.instructor,
      start_date   = EXCLUDED.start_date,
      end_date     = EXCLUDED.end_date,
      participants = EXCLUDED.participants,
      status       = EXCLUDED.status,
      bu           = EXCLUDED.bu
  `;
}

export async function deleteTrainingCourse(id: string): Promise<void> {
  await initHCMDB();
  if (!sql) return;
  await sql`DELETE FROM hcm_training_courses WHERE id = ${id}`;
}
