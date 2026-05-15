// ─── AWQ PPM — Data Access Layer ──────────────────────────────────────────────
//
// Manages Projects, Tasks, Milestones, Allocations, Time Entries, Risks, Issues.
// Storage priority: Supabase → in-memory seed data.
// DO NOT import in client components.

import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import type {
  PpmProject, PpmTask, PpmMilestone, PpmAllocation, PpmTimeEntry,
  PpmRisk, PpmIssue, PpmPortfolioMetrics, BuCode,
  ProjectType, ContractType, ProjectPhase, ProjectStatus, HealthStatus,
  Priority, TaskStatus, TaskType, MilestoneStatus, AllocationStatus,
  TimeEntryStatus, RiskImpact, RiskProbability, RiskStatus,
  IssueSeverity, IssueStatus,
} from "@/lib/ppm-types";

export type {
  PpmProject, PpmTask, PpmMilestone, PpmAllocation, PpmTimeEntry,
  PpmRisk, PpmIssue, PpmPortfolioMetrics,
  BuCode, ProjectType, ContractType, ProjectPhase, ProjectStatus,
  HealthStatus, Priority, TaskStatus, TaskType, MilestoneStatus,
  AllocationStatus, TimeEntryStatus, RiskImpact, RiskProbability,
  RiskStatus, IssueSeverity, IssueStatus,
};

function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }
function calcRiskScore(impact: RiskImpact, probability: RiskProbability): number {
  const m: Record<string, number> = { low: 1, medium: 2, high: 3 };
  return m[impact] * m[probability];
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

export const SEED_PROJECTS: PpmProject[] = [
  {
    project_id: "prj-001",
    project_code: "PRJ-2026-001",
    project_name: "XP Investimentos — Campanha Q1 2026",
    customer_id: "a1",
    customer_name: "XP Investimentos S.A.",
    bu_code: "CAZA",
    bu_name: "Caza Vision",
    project_type: "one_off",
    service_category: "video_production",
    contract_type: "fixed_price",
    start_date: "2026-01-15",
    planned_end_date: "2026-03-31",
    budget_hours: 240,
    actual_hours: 148,
    budget_cost: 85000,
    actual_cost: 52000,
    budget_revenue: 320000,
    actual_revenue: 96000,
    margin_target: 0.73,
    project_manager: "Miguel",
    description: "Produção de campanha institucional Q1 para XP Investimentos: 5 vídeos + fotografia.",
    phase: "execution",
    status: "active",
    health_status: "green",
    priority: "high",
    completion_pct: 62,
    team_size: 3,
    schedule_variance_days: 0,
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-04-28T10:00:00Z",
    created_by: "Miguel",
  },
  {
    project_id: "prj-002",
    project_code: "PRJ-2026-002",
    project_name: "Nubank — Vídeo Institucional",
    customer_id: "a2",
    customer_name: "Nu Pagamentos S.A.",
    bu_code: "CAZA",
    bu_name: "Caza Vision",
    project_type: "one_off",
    service_category: "video_production",
    contract_type: "fixed_price",
    start_date: "2026-02-01",
    planned_end_date: "2026-03-15",
    actual_end_date: undefined,
    budget_hours: 80,
    actual_hours: 24,
    budget_cost: 28000,
    actual_cost: 8400,
    budget_revenue: 85000,
    actual_revenue: 0,
    margin_target: 0.67,
    project_manager: "Miguel",
    phase: "planning",
    status: "active",
    health_status: "yellow",
    health_notes: "Briefing ainda em ajuste com cliente, possível atraso.",
    priority: "medium",
    completion_pct: 30,
    team_size: 2,
    schedule_variance_days: 46,
    created_at: "2026-01-28T10:00:00Z",
    updated_at: "2026-04-25T10:00:00Z",
    created_by: "Miguel",
  },
  {
    project_id: "prj-003",
    project_code: "PRJ-2026-003",
    project_name: "Carol Bertolini — Social Media Mensal",
    customer_id: "a6",
    customer_name: "Carol Bertolini",
    bu_code: "JACQES",
    bu_name: "JACQES",
    project_type: "retainer",
    service_category: "social_media",
    contract_type: "retainer",
    start_date: "2026-01-01",
    planned_end_date: "2026-12-31",
    budget_hours: 20,
    actual_hours: 68,
    budget_cost: 900,
    actual_cost: 3060,
    budget_revenue: 3000,
    actual_revenue: 12000,
    margin_target: 0.70,
    project_manager: "Danilo",
    billing_frequency: "monthly",
    phase: "execution",
    status: "active",
    health_status: "green",
    priority: "low",
    completion_pct: 33,
    team_size: 1,
    schedule_variance_days: 0,
    created_at: "2025-12-20T10:00:00Z",
    updated_at: "2026-04-30T10:00:00Z",
    created_by: "Danilo",
  },
  {
    project_id: "prj-004",
    project_code: "PRJ-2026-004",
    project_name: "Reabilicor — Consultoria Estratégica",
    customer_id: "a4",
    customer_name: "Reabilicor Clínica Cardíaca",
    bu_code: "ADVISOR",
    bu_name: "Advisor",
    project_type: "one_off",
    service_category: "consulting",
    contract_type: "fixed_price",
    start_date: "2026-03-01",
    planned_end_date: "2026-06-30",
    budget_hours: 120,
    actual_hours: 40,
    budget_cost: 22000,
    actual_cost: 7000,
    budget_revenue: 95000,
    actual_revenue: 28500,
    margin_target: 0.77,
    project_manager: "Danilo",
    phase: "execution",
    status: "active",
    health_status: "green",
    priority: "high",
    completion_pct: 33,
    team_size: 2,
    schedule_variance_days: 0,
    created_at: "2026-02-20T10:00:00Z",
    updated_at: "2026-04-28T10:00:00Z",
    created_by: "Danilo",
  },
  {
    project_id: "prj-005",
    project_code: "PRJ-2026-005",
    project_name: "Colégio CEM — Produção Anual 2026",
    customer_id: "a3",
    customer_name: "Colégio CEM",
    bu_code: "CAZA",
    bu_name: "Caza Vision",
    project_type: "one_off",
    service_category: "video_production",
    contract_type: "fixed_price",
    start_date: "2026-04-01",
    planned_end_date: "2026-07-31",
    budget_hours: 60,
    actual_hours: 8,
    budget_cost: 12000,
    actual_cost: 1600,
    budget_revenue: 35000,
    actual_revenue: 0,
    margin_target: 0.66,
    project_manager: "Miguel",
    phase: "initiation",
    status: "active",
    health_status: "yellow",
    health_notes: "Contrato ainda em assinatura.",
    priority: "medium",
    completion_pct: 5,
    team_size: 2,
    schedule_variance_days: 0,
    created_at: "2026-03-25T10:00:00Z",
    updated_at: "2026-04-30T10:00:00Z",
    created_by: "Miguel",
  },
];

export const SEED_TASKS: PpmTask[] = [
  // XP Campanha Q1 (prj-001)
  { task_id:"tsk-001", project_id:"prj-001", task_name:"Pré-Produção", task_type:"phase", wbs_code:"1", sort_order:1, estimated_hours:40, actual_hours:40, start_date:"2026-01-15", due_date:"2026-01-31", completed_date:"2026-01-31", status:"completed", completion_pct:100, is_deliverable:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-31T18:00:00Z" },
  { task_id:"tsk-002", project_id:"prj-001", parent_task_id:"tsk-001", task_name:"Briefing com cliente", task_type:"task", wbs_code:"1.1", sort_order:2, assigned_to:"miguel", assigned_name:"Miguel", estimated_hours:4, actual_hours:4, start_date:"2026-01-15", due_date:"2026-01-16", completed_date:"2026-01-16", status:"completed", completion_pct:100, is_deliverable:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-16T18:00:00Z" },
  { task_id:"tsk-003", project_id:"prj-001", parent_task_id:"tsk-001", task_name:"Desenvolvimento de roteiro", task_type:"task", wbs_code:"1.2", sort_order:3, assigned_to:"miguel", assigned_name:"Miguel", estimated_hours:16, actual_hours:16, start_date:"2026-01-17", due_date:"2026-01-24", completed_date:"2026-01-24", status:"completed", completion_pct:100, is_deliverable:true, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-24T18:00:00Z" },
  { task_id:"tsk-004", project_id:"prj-001", parent_task_id:"tsk-001", task_name:"Casting e locação", task_type:"task", wbs_code:"1.3", sort_order:4, assigned_to:"danilo", assigned_name:"Danilo", estimated_hours:12, actual_hours:12, start_date:"2026-01-25", due_date:"2026-01-30", completed_date:"2026-01-30", status:"completed", completion_pct:100, is_deliverable:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-30T18:00:00Z" },
  { task_id:"tsk-005", project_id:"prj-001", task_name:"Produção", task_type:"phase", wbs_code:"2", sort_order:5, estimated_hours:120, actual_hours:88, start_date:"2026-02-01", due_date:"2026-02-28", status:"in_progress", completion_pct:73, is_deliverable:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-04-28T10:00:00Z" },
  { task_id:"tsk-006", project_id:"prj-001", parent_task_id:"tsk-005", task_name:"Filmagem — Vídeo 1", task_type:"task", wbs_code:"2.1", sort_order:6, estimated_hours:24, actual_hours:24, start_date:"2026-02-03", due_date:"2026-02-04", completed_date:"2026-02-04", status:"completed", completion_pct:100, is_deliverable:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-02-04T18:00:00Z" },
  { task_id:"tsk-007", project_id:"prj-001", parent_task_id:"tsk-005", task_name:"Filmagem — Vídeo 2", task_type:"task", wbs_code:"2.2", sort_order:7, estimated_hours:24, actual_hours:24, start_date:"2026-02-10", due_date:"2026-02-11", completed_date:"2026-02-11", status:"completed", completion_pct:100, is_deliverable:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-02-11T18:00:00Z" },
  { task_id:"tsk-008", project_id:"prj-001", parent_task_id:"tsk-005", task_name:"Filmagens restantes (3 vídeos)", task_type:"task", wbs_code:"2.3", sort_order:8, estimated_hours:72, actual_hours:40, start_date:"2026-02-15", due_date:"2026-02-28", status:"in_progress", completion_pct:55, is_deliverable:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-04-20T10:00:00Z" },
  { task_id:"tsk-009", project_id:"prj-001", task_name:"Pós-Produção", task_type:"phase", wbs_code:"3", sort_order:9, estimated_hours:80, actual_hours:20, start_date:"2026-03-01", due_date:"2026-03-25", status:"in_progress", completion_pct:25, is_deliverable:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-04-28T10:00:00Z" },
  { task_id:"tsk-010", project_id:"prj-001", parent_task_id:"tsk-009", task_name:"Edição final", task_type:"task", wbs_code:"3.1", sort_order:10, estimated_hours:60, actual_hours:20, start_date:"2026-03-01", due_date:"2026-03-20", status:"in_progress", completion_pct:33, is_deliverable:true, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-04-28T10:00:00Z" },
  { task_id:"tsk-011", project_id:"prj-001", parent_task_id:"tsk-009", task_name:"Entrega e aprovação final", task_type:"milestone", wbs_code:"3.2", sort_order:11, estimated_hours:8, actual_hours:0, start_date:"2026-03-24", due_date:"2026-03-25", status:"not_started", completion_pct:0, is_deliverable:true, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-10T10:00:00Z" },
  // Nubank (prj-002)
  { task_id:"tsk-020", project_id:"prj-002", task_name:"Briefing & Concept", task_type:"phase", wbs_code:"1", sort_order:1, estimated_hours:16, actual_hours:12, start_date:"2026-02-01", due_date:"2026-02-10", status:"in_progress", completion_pct:75, is_deliverable:false, created_at:"2026-01-28T10:00:00Z", updated_at:"2026-04-20T10:00:00Z" },
  { task_id:"tsk-021", project_id:"prj-002", task_name:"Produção", task_type:"phase", wbs_code:"2", sort_order:2, estimated_hours:40, actual_hours:12, start_date:"2026-02-11", due_date:"2026-02-28", status:"in_progress", completion_pct:30, is_deliverable:false, created_at:"2026-01-28T10:00:00Z", updated_at:"2026-04-20T10:00:00Z" },
  { task_id:"tsk-022", project_id:"prj-002", task_name:"Pós-Produção e Entrega", task_type:"phase", wbs_code:"3", sort_order:3, estimated_hours:24, actual_hours:0, start_date:"2026-03-01", due_date:"2026-03-15", status:"not_started", completion_pct:0, is_deliverable:false, created_at:"2026-01-28T10:00:00Z", updated_at:"2026-01-28T10:00:00Z" },
  // Reabilicor (prj-004)
  { task_id:"tsk-030", project_id:"prj-004", task_name:"Diagnóstico Estratégico", task_type:"phase", wbs_code:"1", sort_order:1, estimated_hours:40, actual_hours:40, start_date:"2026-03-01", due_date:"2026-03-31", completed_date:"2026-03-31", status:"completed", completion_pct:100, is_deliverable:true, created_at:"2026-02-20T10:00:00Z", updated_at:"2026-03-31T18:00:00Z" },
  { task_id:"tsk-031", project_id:"prj-004", task_name:"Plano de Ação", task_type:"phase", wbs_code:"2", sort_order:2, estimated_hours:40, actual_hours:0, start_date:"2026-04-01", due_date:"2026-05-31", status:"not_started", completion_pct:0, is_deliverable:false, created_at:"2026-02-20T10:00:00Z", updated_at:"2026-02-20T10:00:00Z" },
  { task_id:"tsk-032", project_id:"prj-004", task_name:"Implementação", task_type:"phase", wbs_code:"3", sort_order:3, estimated_hours:40, actual_hours:0, start_date:"2026-06-01", due_date:"2026-06-30", status:"not_started", completion_pct:0, is_deliverable:false, created_at:"2026-02-20T10:00:00Z", updated_at:"2026-02-20T10:00:00Z" },
];

export const SEED_MILESTONES: PpmMilestone[] = [
  { milestone_id:"ms-001", project_id:"prj-001", milestone_name:"Kickoff e Briefing Aprovado", planned_date:"2026-01-16", actual_date:"2026-01-16", status:"achieved", triggers_payment:true, payment_percentage:30, requires_approval:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-16T18:00:00Z" },
  { milestone_id:"ms-002", project_id:"prj-001", milestone_name:"Conclusão das Filmagens", planned_date:"2026-02-28", status:"upcoming", triggers_payment:true, payment_percentage:40, requires_approval:false, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-10T10:00:00Z" },
  { milestone_id:"ms-003", project_id:"prj-001", milestone_name:"Entrega Final Aprovada", planned_date:"2026-03-25", status:"upcoming", triggers_payment:true, payment_percentage:30, requires_approval:true, created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-10T10:00:00Z" },
  { milestone_id:"ms-004", project_id:"prj-002", milestone_name:"Conceito Aprovado", planned_date:"2026-02-10", status:"upcoming", triggers_payment:true, payment_percentage:25, requires_approval:true, created_at:"2026-01-28T10:00:00Z", updated_at:"2026-01-28T10:00:00Z" },
  { milestone_id:"ms-005", project_id:"prj-004", milestone_name:"Diagnóstico Entregue", planned_date:"2026-03-31", actual_date:"2026-03-31", status:"achieved", triggers_payment:true, payment_percentage:30, requires_approval:false, created_at:"2026-02-20T10:00:00Z", updated_at:"2026-03-31T18:00:00Z" },
];

export const SEED_ALLOCATIONS: PpmAllocation[] = [
  { allocation_id:"alc-001", project_id:"prj-001", project_name:"XP Investimentos — Campanha Q1 2026", user_id:"miguel", user_name:"Miguel", role:"Project Manager / Director", allocation_pct:50, hours_per_week:20, start_date:"2026-01-15", end_date:"2026-03-31", billable_rate:200, cost_rate:100, is_billable:true, status:"active", created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-10T10:00:00Z" },
  { allocation_id:"alc-002", project_id:"prj-001", project_name:"XP Investimentos — Campanha Q1 2026", user_id:"danilo", user_name:"Danilo", role:"Production Coordinator", allocation_pct:30, hours_per_week:12, start_date:"2026-01-15", end_date:"2026-03-31", billable_rate:120, cost_rate:60, is_billable:true, status:"active", created_at:"2026-01-10T10:00:00Z", updated_at:"2026-01-10T10:00:00Z" },
  { allocation_id:"alc-003", project_id:"prj-002", project_name:"Nubank — Vídeo Institucional", user_id:"miguel", user_name:"Miguel", role:"Director", allocation_pct:25, hours_per_week:10, start_date:"2026-02-01", end_date:"2026-03-15", billable_rate:200, cost_rate:100, is_billable:true, status:"active", created_at:"2026-01-28T10:00:00Z", updated_at:"2026-01-28T10:00:00Z" },
  { allocation_id:"alc-004", project_id:"prj-003", project_name:"Carol Bertolini — Social Media Mensal", user_id:"danilo", user_name:"Danilo", role:"Social Media Manager", allocation_pct:20, hours_per_week:8, start_date:"2026-01-01", end_date:"2026-12-31", billable_rate:75, cost_rate:40, is_billable:true, status:"active", created_at:"2025-12-20T10:00:00Z", updated_at:"2025-12-20T10:00:00Z" },
  { allocation_id:"alc-005", project_id:"prj-004", project_name:"Reabilicor — Consultoria Estratégica", user_id:"danilo", user_name:"Danilo", role:"Consultant", allocation_pct:30, hours_per_week:12, start_date:"2026-03-01", end_date:"2026-06-30", billable_rate:150, cost_rate:60, is_billable:true, status:"active", created_at:"2026-02-20T10:00:00Z", updated_at:"2026-02-20T10:00:00Z" },
];

export const SEED_TIME_ENTRIES: PpmTimeEntry[] = [
  { entry_id:"te-001", user_id:"miguel", user_name:"Miguel", project_id:"prj-001", project_name:"XP — Campanha Q1", task_id:"tsk-002", task_name:"Briefing com cliente", entry_date:"2026-01-15", hours:4, is_billable:true, billing_rate:200, cost_rate:100, description:"Reunião de briefing com cliente XP", status:"approved", invoiced:false, created_at:"2026-01-15T18:00:00Z", updated_at:"2026-01-16T10:00:00Z" },
  { entry_id:"te-002", user_id:"miguel", user_name:"Miguel", project_id:"prj-001", project_name:"XP — Campanha Q1", task_id:"tsk-003", task_name:"Desenvolvimento de roteiro", entry_date:"2026-01-20", hours:8, is_billable:true, billing_rate:200, cost_rate:100, description:"Desenvolvimento roteiro vídeo 1", status:"approved", invoiced:false, created_at:"2026-01-20T18:00:00Z", updated_at:"2026-01-21T10:00:00Z" },
  { entry_id:"te-003", user_id:"danilo", user_name:"Danilo", project_id:"prj-001", project_name:"XP — Campanha Q1", task_id:"tsk-004", task_name:"Casting e locação", entry_date:"2026-01-25", hours:6, is_billable:true, billing_rate:120, cost_rate:60, description:"Pesquisa de locações e casting", status:"approved", invoiced:false, created_at:"2026-01-25T18:00:00Z", updated_at:"2026-01-26T10:00:00Z" },
  { entry_id:"te-004", user_id:"danilo", user_name:"Danilo", project_id:"prj-003", project_name:"Carol Bertolini — Social Media", entry_date:"2026-04-28", hours:4, is_billable:true, billing_rate:75, cost_rate:40, description:"Criação de conteúdo abril semana 4", status:"submitted", invoiced:false, created_at:"2026-04-28T18:00:00Z", updated_at:"2026-04-28T18:00:00Z" },
  { entry_id:"te-005", user_id:"danilo", user_name:"Danilo", project_id:"prj-004", project_name:"Reabilicor — Consultoria", task_id:"tsk-030", task_name:"Diagnóstico Estratégico", entry_date:"2026-03-15", hours:8, is_billable:true, billing_rate:150, cost_rate:60, description:"Entrevistas stakeholders e análise SWOT", status:"approved", invoiced:false, created_at:"2026-03-15T18:00:00Z", updated_at:"2026-03-16T10:00:00Z" },
];

export const SEED_RISKS: PpmRisk[] = [
  { risk_id:"rsk-001", project_id:"prj-001", project_name:"XP — Campanha Q1", risk_description:"Atraso nas aprovações de roteiro pelo cliente pode impactar cronograma de filmagens", impact:"high", probability:"medium", risk_score:6, mitigation_plan:"Definir SLA de 48h para aprovações no contrato. Escalar para diretor XP se necessário.", status:"mitigating", identified_date:"2026-01-15", created_at:"2026-01-15T10:00:00Z", updated_at:"2026-01-15T10:00:00Z" },
  { risk_id:"rsk-002", project_id:"prj-001", project_name:"XP — Campanha Q1", risk_description:"Indisponibilidade de locação premium pode exigir plano B", impact:"medium", probability:"low", risk_score:2, mitigation_plan:"Identificar 3 locações alternativas antes do início das filmagens.", status:"identified", identified_date:"2026-01-20", created_at:"2026-01-20T10:00:00Z", updated_at:"2026-01-20T10:00:00Z" },
  { risk_id:"rsk-003", project_id:"prj-002", project_name:"Nubank — Vídeo Institucional", risk_description:"Escopo pode crescer sem aprovação formal de mudança", impact:"high", probability:"high", risk_score:9, mitigation_plan:"Implementar Change Request formal para qualquer alteração de escopo.", status:"identified", identified_date:"2026-02-01", created_at:"2026-02-01T10:00:00Z", updated_at:"2026-02-01T10:00:00Z" },
];

export const SEED_ISSUES: PpmIssue[] = [
  { issue_id:"iss-001", project_id:"prj-002", project_name:"Nubank — Vídeo Institucional", issue_description:"Briefing final ainda não aprovado após 3 semanas — bloqueia início da produção", severity:"high", reported_by:"miguel", reported_by_name:"Miguel", assigned_to:"danilo", assigned_name:"Danilo", status:"open", reported_date:"2026-02-22", created_at:"2026-02-22T10:00:00Z", updated_at:"2026-02-22T10:00:00Z" },
  { issue_id:"iss-002", project_id:"prj-001", project_name:"XP — Campanha Q1", issue_description:"Equipamento de câmera com problema técnico — filmagem vídeo 3 precisou ser remarcada", severity:"medium", reported_by:"miguel", reported_by_name:"Miguel", assigned_to:"miguel", assigned_name:"Miguel", status:"resolved", resolution:"Alugado equipamento reserva. Filmagem reagendada para 1 semana depois sem impacto no prazo final.", reported_date:"2026-02-18", resolved_date:"2026-02-20", created_at:"2026-02-18T10:00:00Z", updated_at:"2026-02-20T18:00:00Z" },
];

// ─── Helper: in-memory store (dev) ───────────────────────────────────────────

let _projects:    PpmProject[]    = [...SEED_PROJECTS];
let _tasks:       PpmTask[]       = [...SEED_TASKS];
let _milestones:  PpmMilestone[]  = [...SEED_MILESTONES];
let _allocations: PpmAllocation[] = [...SEED_ALLOCATIONS];
let _timeEntries: PpmTimeEntry[]  = [...SEED_TIME_ENTRIES];
let _risks:       PpmRisk[]       = [...SEED_RISKS];
let _issues:      PpmIssue[]      = [...SEED_ISSUES];

// ─── DB init ──────────────────────────────────────────────────────────────────

export async function initPpmDB(): Promise<void> {
  // Tables created via awq_ppm_full_schema.sql — no-op here.
}

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export async function listProjects(filters?: {
  bu_code?: BuCode;
  status?: ProjectStatus;
  health_status?: HealthStatus;
  project_type?: ProjectType;
  search?: string;
}): Promise<PpmProject[]> {
  // ── Supabase ──────────────────────────────────────────────────────────────
  if (supabase) {
    let q = supabase.from("ppm_projects").select("*").order("created_at", { ascending: false });
    if (filters?.bu_code)       q = q.eq("bu_code",       filters.bu_code);
    if (filters?.status)        q = q.eq("status",        filters.status);
    if (filters?.health_status) q = q.eq("health_status", filters.health_status);
    if (filters?.project_type)  q = q.eq("project_type",  filters.project_type);
    if (filters?.search)        q = q.ilike("project_name", `%${filters.search}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as PpmProject[];
  }

  // ── In-memory seed ────────────────────────────────────────────────────────
  let rows = [..._projects];
  if (filters?.bu_code)      rows = rows.filter(r => r.bu_code === filters.bu_code);
  if (filters?.status)       rows = rows.filter(r => r.status === filters.status);
  if (filters?.health_status)rows = rows.filter(r => r.health_status === filters.health_status);
  if (filters?.project_type) rows = rows.filter(r => r.project_type === filters.project_type);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    rows = rows.filter(r => r.project_name.toLowerCase().includes(s) || r.project_code.toLowerCase().includes(s));
  }
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getProject(project_id: string): Promise<PpmProject | null> {
  if (supabase) {
    const { data, error } = await supabase.from("ppm_projects").select("*").eq("project_id", project_id).single();
    if (error) return null;
    return data as PpmProject;
  }
  return _projects.find(p => p.project_id === project_id) ?? null;
}

export async function createProject(input: Omit<PpmProject, "project_id" | "project_code" | "actual_hours" | "actual_cost" | "actual_revenue" | "created_at" | "updated_at">): Promise<PpmProject> {
  const project_id   = randomUUID();
  const project_code = `PRJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
  const ts = now();
  const newProject: PpmProject = {
    ...input,
    project_id,
    project_code,
    actual_hours:   0,
    actual_cost:    0,
    actual_revenue: 0,
    completion_pct: 0,
    team_size:      0,
    created_at: ts,
    updated_at: ts,
  };

  // ── Supabase ──────────────────────────────────────────────────────────────
  if (supabase) {
    const row = {
      project_id,
      project_code,
      project_name:      input.project_name,
      customer_name:     input.customer_name ?? null,
      bu_code:           input.bu_code,
      opportunity_id:    input.opportunity_id ?? null,
      project_type:      input.project_type,
      service_category:  input.service_category ?? null,
      contract_type:     input.contract_type,
      start_date:        input.start_date,
      planned_end_date:  input.planned_end_date,
      budget_hours:      input.budget_hours ?? null,
      budget_cost:       input.budget_cost,
      budget_revenue:    input.budget_revenue,
      margin_target:     input.margin_target ?? null,
      project_manager:   input.project_manager ?? null,
      description:       input.description ?? null,
      objectives:        input.objectives ?? null,
      phase:             input.phase ?? "initiation",
      status:            input.status ?? "active",
      health_status:     input.health_status ?? "green",
      priority:          input.priority ?? "medium",
      billing_frequency: input.billing_frequency ?? null,
      notes:             input.notes ?? null,
      actual_hours:      0,
      actual_cost:       0,
      actual_revenue:    0,
      created_at:        ts,
      updated_at:        ts,
    };
    const { data, error } = await supabase.from("ppm_projects").insert(row).select().single();
    if (error) throw new Error(error.message);
    return (data ?? newProject) as PpmProject;
  }

  // ── In-memory seed ────────────────────────────────────────────────────────
  _projects.unshift(newProject);
  return newProject;
}

export async function updateProject(project_id: string, patch: Partial<PpmProject>): Promise<PpmProject | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("ppm_projects")
      .update({ ...patch, updated_at: now() })
      .eq("project_id", project_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as PpmProject;
  }
  const idx = _projects.findIndex(p => p.project_id === project_id);
  if (idx === -1) return null;
  _projects[idx] = { ..._projects[idx], ...patch, updated_at: now() };
  return _projects[idx];
}

// ─── Task CRUD ────────────────────────────────────────────────────────────────

export async function listTasks(project_id?: string, filters?: { status?: TaskStatus; assigned_to?: string }): Promise<PpmTask[]> {
  if (supabase) {
    let q = supabase.from("ppm_tasks").select("*").order("sort_order");
    if (project_id)          q = q.eq("project_id",  project_id);
    if (filters?.status)     q = q.eq("status",       filters.status);
    if (filters?.assigned_to)q = q.eq("assigned_to",  filters.assigned_to);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as PpmTask[];
  }
  let rows = [..._tasks];
  if (project_id)         rows = rows.filter(t => t.project_id === project_id);
  if (filters?.status)    rows = rows.filter(t => t.status === filters.status);
  if (filters?.assigned_to) rows = rows.filter(t => t.assigned_to === filters.assigned_to);
  return rows.sort((a, b) => a.sort_order - b.sort_order);
}

export async function createTask(input: Omit<PpmTask, "task_id" | "actual_hours" | "created_at" | "updated_at">): Promise<PpmTask> {
  const task_id = randomUUID();
  const newTask: PpmTask = {
    ...input,
    task_id,
    actual_hours: 0,
    created_at: now(),
    updated_at: now(),
  };
  _tasks.push(newTask);
  return newTask;
}

export async function updateTask(task_id: string, patch: Partial<PpmTask>): Promise<PpmTask | null> {
  if (patch.status === "completed") {
    patch = { ...patch, completion_pct: 100, completed_date: today() };
  }
  if (supabase) {
    const { data, error } = await supabase
      .from("ppm_tasks")
      .update({ ...patch, updated_at: now() })
      .eq("task_id", task_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as PpmTask | null;
  }
  const idx = _tasks.findIndex(t => t.task_id === task_id);
  if (idx === -1) return null;
  _tasks[idx] = { ..._tasks[idx], ...patch, updated_at: now() };
  return _tasks[idx];
}

// ─── Milestone CRUD ───────────────────────────────────────────────────────────

export async function listMilestones(project_id?: string): Promise<PpmMilestone[]> {
  if (supabase) {
    let q = supabase.from("ppm_milestones").select("*").order("planned_date");
    if (project_id) q = q.eq("project_id", project_id);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as PpmMilestone[];
  }
  const rows = project_id ? _milestones.filter(m => m.project_id === project_id) : [..._milestones];
  return rows.sort((a, b) => a.planned_date.localeCompare(b.planned_date));
}

export async function createMilestone(input: Omit<PpmMilestone, "milestone_id" | "created_at" | "updated_at">): Promise<PpmMilestone> {
  const milestone_id = randomUUID();
  const m: PpmMilestone = { ...input, milestone_id, created_at: now(), updated_at: now() };
  _milestones.push(m);
  return m;
}

// ─── Resource Allocation CRUD ─────────────────────────────────────────────────

export async function listAllocations(project_id?: string, user_id?: string): Promise<PpmAllocation[]> {
  if (supabase) {
    let q = supabase.from("ppm_allocations").select("*");
    if (project_id) q = q.eq("project_id", project_id);
    if (user_id)    q = q.eq("user_id",    user_id);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as PpmAllocation[];
  }
  let rows = [..._allocations];
  if (project_id) rows = rows.filter(a => a.project_id === project_id);
  if (user_id)    rows = rows.filter(a => a.user_id === user_id);
  return rows;
}

export async function createAllocation(input: Omit<PpmAllocation, "allocation_id" | "created_at" | "updated_at">): Promise<PpmAllocation> {
  const allocation_id = randomUUID();
  const a: PpmAllocation = { ...input, allocation_id, created_at: now(), updated_at: now() };
  _allocations.push(a);
  return a;
}

export async function getResourceUtilization(): Promise<{ user_id: string; user_name: string; total_allocation_pct: number; utilization_status: string; active_projects: number; project_names: string[] }[]> {
  const byUser: Record<string, { user_name: string; total: number; projects: string[] }> = {};
  for (const a of _allocations.filter(x => x.status === "active")) {
    if (!byUser[a.user_id]) byUser[a.user_id] = { user_name: a.user_name ?? a.user_id, total: 0, projects: [] };
    byUser[a.user_id].total += a.allocation_pct;
    if (a.project_name) byUser[a.user_id].projects.push(a.project_name);
  }
  return Object.entries(byUser).map(([user_id, v]) => ({
    user_id,
    user_name: v.user_name,
    total_allocation_pct: v.total,
    utilization_status: v.total > 100 ? "overallocated" : v.total >= 80 ? "fully_allocated" : v.total >= 50 ? "partially_allocated" : "available",
    active_projects: v.projects.length,
    project_names: v.projects,
  }));
}

// ─── Time Entry CRUD ──────────────────────────────────────────────────────────

export async function listTimeEntries(filters?: { project_id?: string; user_id?: string; status?: TimeEntryStatus }): Promise<PpmTimeEntry[]> {
  let rows = [..._timeEntries];
  if (filters?.project_id) rows = rows.filter(e => e.project_id === filters.project_id);
  if (filters?.user_id)    rows = rows.filter(e => e.user_id    === filters.user_id);
  if (filters?.status)     rows = rows.filter(e => e.status     === filters.status);
  return rows.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
}

export async function createTimeEntry(input: Omit<PpmTimeEntry, "entry_id" | "created_at" | "updated_at">): Promise<PpmTimeEntry> {
  const entry_id = randomUUID();
  const e: PpmTimeEntry = { ...input, entry_id, created_at: now(), updated_at: now() };
  _timeEntries.unshift(e);
  // Update project actual_hours
  const proj = _projects.find(p => p.project_id === input.project_id);
  if (proj) proj.actual_hours = _timeEntries.filter(t => t.project_id === input.project_id).reduce((s, t) => s + t.hours, 0);
  return e;
}

export async function approveTimeEntry(entry_id: string, approved_by: string): Promise<void> {
  const e = _timeEntries.find(x => x.entry_id === entry_id);
  if (e) { e.status = "approved"; e.approved_by = approved_by; e.approved_at = now(); e.updated_at = now(); }
}

// ─── Risk CRUD ────────────────────────────────────────────────────────────────

export async function listRisks(project_id?: string): Promise<PpmRisk[]> {
  if (supabase) {
    let q = supabase.from("ppm_risks").select("*").order("risk_score", { ascending: false });
    if (project_id) q = q.eq("project_id", project_id);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as PpmRisk[];
  }
  return project_id ? _risks.filter(r => r.project_id === project_id) : [..._risks];
}

export async function createRisk(input: Omit<PpmRisk, "risk_id" | "risk_score" | "created_at" | "updated_at">): Promise<PpmRisk> {
  const risk_id = randomUUID();
  const risk_score = calcRiskScore(input.impact, input.probability);
  const r: PpmRisk = { ...input, risk_id, risk_score, created_at: now(), updated_at: now() };
  _risks.push(r);
  return r;
}

// ─── Issue CRUD ───────────────────────────────────────────────────────────────

export async function listIssues(project_id?: string): Promise<PpmIssue[]> {
  if (supabase) {
    let q = supabase.from("ppm_issues").select("*").order("reported_date", { ascending: false });
    if (project_id) q = q.eq("project_id", project_id);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as PpmIssue[];
  }
  return project_id ? _issues.filter(i => i.project_id === project_id) : [..._issues];
}

export async function createIssue(input: Omit<PpmIssue, "issue_id" | "created_at" | "updated_at">): Promise<PpmIssue> {
  const issue_id = randomUUID();
  const i: PpmIssue = { ...input, issue_id, created_at: now(), updated_at: now() };
  _issues.push(i);
  return i;
}

// ─── Portfolio Metrics ────────────────────────────────────────────────────────

export async function getPortfolioMetrics(): Promise<PpmPortfolioMetrics> {
  const projects = await listProjects();
  const active   = projects.filter(p => p.status === "active");
  const tasks    = await listTasks();
  const overdue  = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled" && t.due_date && t.due_date < today());

  return {
    total_projects:       projects.length,
    active_projects:      active.length,
    total_budget_revenue: projects.reduce((s, p) => s + p.budget_revenue, 0),
    total_actual_revenue: projects.reduce((s, p) => s + p.actual_revenue, 0),
    total_budget_cost:    projects.reduce((s, p) => s + p.budget_cost, 0),
    total_actual_cost:    projects.reduce((s, p) => s + p.actual_cost, 0),
    avg_margin_pct: active.length === 0 ? 0 : active.reduce((s, p) => {
      const m = p.actual_revenue > 0 ? ((p.actual_revenue - p.actual_cost) / p.actual_revenue) * 100 : ((p.budget_revenue - p.budget_cost) / p.budget_revenue) * 100;
      return s + m;
    }, 0) / active.length,
    green_count:        projects.filter(p => p.health_status === "green").length,
    yellow_count:       projects.filter(p => p.health_status === "yellow").length,
    red_count:          projects.filter(p => p.health_status === "red").length,
    total_team_members: [...new Set(_allocations.filter(a => a.status === "active").map(a => a.user_id))].length,
    overdue_tasks:      overdue.length,
  };
}
