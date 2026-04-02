// ─── Data Governance Engine ─────────────────────────────────────────────────────
// Self-contained monitoring engine that scans the entire AWQ data layer
// and produces actionable reports. Used by:
//   1. The Data Governance Agent (via API/agent loop)
//   2. The autonomous /api/agents/data-governance endpoint
//   3. Any future monitoring dashboard
//
// This engine does NOT make changes — it only diagnoses.
// Changes are made by the agent or the API route based on the diagnosis.

import { SOURCE_CATALOG, getSourceMeta } from "../meta";
import { assessAllSources, getQualitySummary } from "../meta/data-quality";
import { BU_REGISTRY, getActiveBus, getOperatingBus } from "../registry";
import { MOCK_REGISTRY, getMockMigrationSummary } from "../mocks";

import { kpis, revenueData, customers, alerts } from "@/lib/data";
import { cazaKpis, cazaRevenueData, projetos, cazaClients, cazaAlerts } from "@/lib/caza-data";
import {
  buData, consolidated, monthlyRevenue, riskSignals,
  cashFlowRows, revenueForecasts,
} from "@/lib/awq-group-data";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IssueSeverity = "critical" | "warning" | "info";
export type IssueAction = "auto-fix" | "escalate" | "monitor";

export interface GovernanceIssue {
  id: string;
  severity: IssueSeverity;
  action: IssueAction;
  category: "consistency" | "freshness" | "completeness" | "accuracy" | "structural";
  buAffected: string;
  title: string;
  description: string;
  suggestion: string;
}

export interface HealthScore {
  overall: number;        // 0-100
  consistency: number;    // 0-100
  freshness: number;      // 0-100
  completeness: number;   // 0-100
  accuracy: number;       // 0-100
}

export interface GovernanceReport {
  timestamp: string;
  health: HealthScore;
  issues: GovernanceIssue[];
  metrics: {
    totalSources: number;
    mockSources: number;
    realSources: number;
    derivedSources: number;
    busRegistered: number;
    busActive: number;
    busOperating: number;
    mockMigrationSummary: ReturnType<typeof getMockMigrationSummary>;
    qualitySummary: ReturnType<typeof getQualitySummary>;
  };
  autoFixable: GovernanceIssue[];
  escalations: GovernanceIssue[];
}

// ─── Consistency Checks ───────────────────────────────────────────────────────

function checkConsistency(): GovernanceIssue[] {
  const issues: GovernanceIssue[] = [];

  // Check AWQ consolidated revenue matches sum of operating BUs
  const opBus = buData.filter((b) => b.id !== "venture");
  const expectedRevenue = opBus.reduce((s, b) => s + b.revenue, 0);
  if (consolidated.revenue !== expectedRevenue) {
    issues.push({
      id: "CONS-001",
      severity: "critical",
      action: "auto-fix",
      category: "consistency",
      buAffected: "AWQ Group",
      title: "Receita consolidada inconsistente",
      description: `consolidated.revenue (${consolidated.revenue}) != sum of operating BUs (${expectedRevenue})`,
      suggestion: "Recalcular consolidated.revenue a partir dos dados de BU.",
    });
  }

  // Check monthly revenue totals add up
  for (const point of monthlyRevenue) {
    const sum = point.jacqes + point.caza + point.advisor;
    if (sum !== point.total) {
      issues.push({
        id: `CONS-MR-${point.month}`,
        severity: "warning",
        action: "auto-fix",
        category: "consistency",
        buAffected: "AWQ Group",
        title: `Revenue mensal ${point.month} — total inconsistente`,
        description: `jacqes(${point.jacqes}) + caza(${point.caza}) + advisor(${point.advisor}) = ${sum}, mas total = ${point.total}`,
        suggestion: "Corrigir total para ser a soma dos componentes.",
      });
    }
  }

  // Check cash flow rows: FCO = Lucro + D&A + Cap Giro
  const busKeys = ["jacqes", "caza", "advisor", "venture"] as const;
  const cfLabels = cashFlowRows.map((r) => r.label);
  const lucroIdx = cfLabels.findIndex((l) => l.includes("Lucro Líquido"));
  const daIdx = cfLabels.findIndex((l) => l.includes("D&A"));
  const giroIdx = cfLabels.findIndex((l) => l.includes("Cap. de Giro"));
  const fcoIdx = cfLabels.findIndex((l) => l.includes("FCO (Caixa Operacional)"));

  if (lucroIdx >= 0 && daIdx >= 0 && giroIdx >= 0 && fcoIdx >= 0) {
    for (const bu of busKeys) {
      const expected =
        cashFlowRows[lucroIdx][bu] +
        cashFlowRows[daIdx][bu] +
        cashFlowRows[giroIdx][bu];
      const actual = cashFlowRows[fcoIdx][bu];
      if (expected !== actual) {
        issues.push({
          id: `CONS-CF-${bu}`,
          severity: "warning",
          action: "auto-fix",
          category: "consistency",
          buAffected: bu,
          title: `Cash flow ${bu} — FCO inconsistente`,
          description: `Lucro(${cashFlowRows[lucroIdx][bu]}) + D&A(${cashFlowRows[daIdx][bu]}) + Giro(${cashFlowRows[giroIdx][bu]}) = ${expected}, mas FCO = ${actual}`,
          suggestion: "Recalcular FCO como soma dos componentes.",
        });
      }
    }
  }

  // Check Caza Vision KPI revenue matches sum of last 3 months
  const last3CazaRevenue = cazaRevenueData.slice(-3).reduce((s, d) => s + d.receita, 0);
  const cazaRevenueKpi = cazaKpis.find((k) => k.id === "receita");
  if (cazaRevenueKpi && Math.abs(cazaRevenueKpi.value - last3CazaRevenue) > 1000) {
    issues.push({
      id: "CONS-CAZA-REV",
      severity: "warning",
      action: "escalate",
      category: "consistency",
      buAffected: "Caza Vision",
      title: "KPI Receita YTD vs soma dos meses recentes",
      description: `KPI receita = ${cazaRevenueKpi.value}, soma últimos 3 meses = ${last3CazaRevenue}. Diferença: ${Math.abs(cazaRevenueKpi.value - last3CazaRevenue)}`,
      suggestion: "Verificar se o KPI reflete o YTD correto ou se os dados mensais mudaram.",
    });
  }

  // Check JACQES BU data revenue matches monthly sum
  const jacqesBu = buData.find((b) => b.id === "jacqes");
  const jacqesMonthlySum = monthlyRevenue.reduce((s, m) => s + m.jacqes, 0);
  if (jacqesBu && Math.abs(jacqesBu.revenue - jacqesMonthlySum) > 1000) {
    issues.push({
      id: "CONS-JAQ-REV",
      severity: "info",
      action: "monitor",
      category: "consistency",
      buAffected: "JACQES",
      title: "BuData revenue vs monthly sum",
      description: `BuData.revenue = ${jacqesBu.revenue}, monthly sum = ${jacqesMonthlySum}`,
      suggestion: "Diferença pode ser intencional (BuData inclui meses anteriores). Monitorar.",
    });
  }

  return issues;
}

// ─── Freshness Checks ─────────────────────────────────────────────────────────

function checkFreshness(): GovernanceIssue[] {
  const issues: GovernanceIssue[] = [];
  const now = new Date();
  const STALE_THRESHOLD_DAYS = 30;

  // Check alert timestamps
  for (const alert of [...alerts, ...cazaAlerts]) {
    const alertDate = new Date(alert.timestamp);
    const daysSince = Math.floor((now.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > STALE_THRESHOLD_DAYS) {
      issues.push({
        id: `FRESH-ALERT-${alert.id}`,
        severity: "info",
        action: "auto-fix",
        category: "freshness",
        buAffected: alerts.includes(alert as typeof alerts[number]) ? "JACQES" : "Caza Vision",
        title: `Alerta "${alert.title}" com ${daysSince} dias`,
        description: `Alerta ${alert.id} tem timestamp de ${alert.timestamp} — ${daysSince} dias atrás.`,
        suggestion: "Atualizar timestamp ou remover alerta se já não for relevante.",
      });
    }
  }

  // Check SOURCE_CATALOG lastUpdated
  for (const source of Object.values(SOURCE_CATALOG)) {
    const sourceDate = new Date(source.lastUpdated);
    const daysSince = Math.floor((now.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > STALE_THRESHOLD_DAYS) {
      issues.push({
        id: `FRESH-SRC-${source.sourceId}`,
        severity: "info",
        action: "auto-fix",
        category: "freshness",
        buAffected: source.buOwner ?? "AWQ Group",
        title: `Source "${source.sourceId}" sem atualização há ${daysSince}d`,
        description: `lastUpdated: ${source.lastUpdated}`,
        suggestion: "Verificar se os dados da fonte foram atualizados e atualizar lastUpdated.",
      });
    }
  }

  // Check project deadlines (Caza)
  for (const projeto of projetos) {
    const prazoDate = new Date(projeto.prazo);
    if (prazoDate < now && projeto.status !== "Entregue") {
      issues.push({
        id: `FRESH-PROJ-${projeto.id}`,
        severity: "critical",
        action: "escalate",
        category: "freshness",
        buAffected: "Caza Vision",
        title: `Projeto ${projeto.id} passou do prazo`,
        description: `"${projeto.titulo}" (${projeto.cliente}) — prazo: ${projeto.prazo}, status: ${projeto.status}`,
        suggestion: "Projeto precisa de atenção imediata. Atualizar status ou renegociar prazo.",
      });
    }
  }

  return issues;
}

// ─── Completeness Checks ──────────────────────────────────────────────────────

function checkCompleteness(): GovernanceIssue[] {
  const issues: GovernanceIssue[] = [];

  // Check if all BUs in registry have data sources
  for (const bu of Object.values(BU_REGISTRY)) {
    if (!bu.hasOwnDataFile && bu.status === "active") {
      issues.push({
        id: `COMP-BU-${bu.id}`,
        severity: "warning",
        action: "escalate",
        category: "completeness",
        buAffected: bu.name,
        title: `BU "${bu.name}" sem arquivo de dados dedicado`,
        description: `${bu.name} está ativa mas não tem um lib/<bu>-data.ts próprio. Dados vêm de awq-group-data.ts.`,
        suggestion: "Criar arquivo dedicado quando a BU tiver dados próprios suficientes.",
      });
    }
  }

  // Check for BUs without KPIs
  const busWithKpis = new Set(["jacqes", "caza-vision"]);
  for (const bu of getOperatingBus()) {
    if (!busWithKpis.has(bu.id)) {
      issues.push({
        id: `COMP-KPI-${bu.id}`,
        severity: "info",
        action: "monitor",
        category: "completeness",
        buAffected: bu.name,
        title: `BU "${bu.name}" sem KPIs dedicados`,
        description: `${bu.name} não possui array de KPIs próprio (como kpis/cazaKpis).`,
        suggestion: "Quando disponível, criar KPIs específicos no BU data module.",
      });
    }
  }

  // Check if forecast has actual values for past months
  for (const point of revenueForecasts) {
    const monthDate = parseMonthStr(point.month);
    if (monthDate && monthDate < now && point.actual === undefined) {
      issues.push({
        id: `COMP-FORECAST-${point.month}`,
        severity: "warning",
        action: "auto-fix",
        category: "completeness",
        buAffected: "AWQ Group",
        title: `Forecast ${point.month} — sem valor actual`,
        description: `Mês já passou mas forecast não tem campo "actual" preenchido.`,
        suggestion: "Preencher actual com base nos dados realizados de monthlyRevenue.",
      });
    }
  }

  return issues;
}

// ─── Accuracy Checks ──────────────────────────────────────────────────────────

function checkAccuracy(): GovernanceIssue[] {
  const issues: GovernanceIssue[] = [];

  // Check for negative values where they shouldn't be
  for (const bu of buData) {
    if (bu.revenue < 0 && bu.id !== "venture") {
      issues.push({
        id: `ACC-NEG-REV-${bu.id}`,
        severity: "critical",
        action: "escalate",
        category: "accuracy",
        buAffected: bu.name,
        title: `${bu.name} com receita negativa: ${bu.revenue}`,
        description: "Receita negativa para BU operacional é anomalia.",
        suggestion: "Verificar se o valor está correto ou se houve erro de input.",
      });
    }
    if (bu.customers < 0) {
      issues.push({
        id: `ACC-NEG-CUST-${bu.id}`,
        severity: "critical",
        action: "auto-fix",
        category: "accuracy",
        buAffected: bu.name,
        title: `${bu.name} com clientes negativos: ${bu.customers}`,
        description: "Número de clientes não pode ser negativo.",
        suggestion: "Corrigir para 0 ou valor correto.",
      });
    }
  }

  // Check ROIC sanity
  for (const bu of buData) {
    if (bu.roic > 500) {
      issues.push({
        id: `ACC-ROIC-${bu.id}`,
        severity: "info",
        action: "monitor",
        category: "accuracy",
        buAffected: bu.name,
        title: `${bu.name} ROIC extremamente alto: ${bu.roic}%`,
        description: "ROIC acima de 500% merece verificação (pode ser correto para venture).",
        suggestion: "Confirmar se o cálculo está correto.",
      });
    }
  }

  // Check customer LTV sanity (JACQES)
  for (const customer of customers) {
    if (customer.ltv < 0) {
      issues.push({
        id: `ACC-LTV-${customer.id}`,
        severity: "critical",
        action: "auto-fix",
        category: "accuracy",
        buAffected: "JACQES",
        title: `Cliente ${customer.id} com LTV negativo`,
        description: `${customer.name} (${customer.company}): LTV = ${customer.ltv}`,
        suggestion: "LTV não pode ser negativo. Corrigir para 0.",
      });
    }
  }

  // Check Caza client budgets
  for (const client of cazaClients) {
    if (client.budget_anual <= 0 && client.status === "Ativo") {
      issues.push({
        id: `ACC-BUDGET-${client.id}`,
        severity: "warning",
        action: "escalate",
        category: "accuracy",
        buAffected: "Caza Vision",
        title: `Cliente ativo ${client.name} com budget zerado`,
        description: `budget_anual = ${client.budget_anual} mas status = "Ativo"`,
        suggestion: "Verificar se budget é real ou se deveria ser atualizado.",
      });
    }
  }

  return issues;
}

// ─── Structural Checks ───────────────────────────────────────────────────────

function checkStructural(): GovernanceIssue[] {
  const issues: GovernanceIssue[] = [];

  // Check that all mock entries in MOCK_REGISTRY have corresponding SOURCE_CATALOG entries
  for (const mock of MOCK_REGISTRY) {
    if (!SOURCE_CATALOG[mock.sourceId]) {
      issues.push({
        id: `STRUCT-MOCK-${mock.sourceId}`,
        severity: "warning",
        action: "auto-fix",
        category: "structural",
        buAffected: mock.buId,
        title: `Mock "${mock.sourceId}" sem entrada no SOURCE_CATALOG`,
        description: `MOCK_REGISTRY referencia ${mock.sourceId} mas não existe em SOURCE_CATALOG.`,
        suggestion: "Adicionar entrada correspondente no SOURCE_CATALOG.",
      });
    }
  }

  // Check that all BU IDs in registry are valid
  const registeredBuIds = new Set(Object.keys(BU_REGISTRY));
  const buIdsInData = new Set(buData.map((b) => b.id));
  for (const buId of buIdsInData) {
    // Map awq-group-data ids to registry ids
    const registryId = buId === "caza" ? "caza-vision" : buId;
    if (!registeredBuIds.has(registryId)) {
      issues.push({
        id: `STRUCT-BU-${buId}`,
        severity: "warning",
        action: "auto-fix",
        category: "structural",
        buAffected: buId,
        title: `BU "${buId}" em buData mas não no BU_REGISTRY`,
        description: `buData contém entry para "${buId}" mas o BU_REGISTRY não tem esta key.`,
        suggestion: "Adicionar ao BU_REGISTRY ou criar alias.",
      });
    }
  }

  return issues;
}

// ─── Health Score Calculation ─────────────────────────────────────────────────

function calculateHealth(issues: GovernanceIssue[]): HealthScore {
  const byCategory = {
    consistency: issues.filter((i) => i.category === "consistency"),
    freshness: issues.filter((i) => i.category === "freshness"),
    completeness: issues.filter((i) => i.category === "completeness"),
    accuracy: issues.filter((i) => i.category === "accuracy"),
  };

  function score(categoryIssues: GovernanceIssue[]): number {
    if (categoryIssues.length === 0) return 100;
    const criticals = categoryIssues.filter((i) => i.severity === "critical").length;
    const warnings = categoryIssues.filter((i) => i.severity === "warning").length;
    const infos = categoryIssues.filter((i) => i.severity === "info").length;
    return Math.max(0, 100 - criticals * 25 - warnings * 10 - infos * 3);
  }

  const consistency = score(byCategory.consistency);
  const freshness = score(byCategory.freshness);
  const completeness = score(byCategory.completeness);
  const accuracy = score(byCategory.accuracy);
  const overall = Math.round((consistency + freshness + completeness + accuracy) / 4);

  return { overall, consistency, freshness, completeness, accuracy };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMonthStr(month: string): Date | null {
  // Handles "Jan/26", "Fev/26", "Mar/26" etc.
  const monthMap: Record<string, number> = {
    Jan: 0, Fev: 1, Feb: 1, Mar: 2, Abr: 3, Apr: 3, Mai: 4, May: 4,
    Jun: 5, Jul: 6, Ago: 7, Aug: 7, Set: 8, Sep: 8, Out: 9, Oct: 9,
    Nov: 10, Dez: 11, Dec: 11,
  };
  const parts = month.split("/");
  if (parts.length !== 2) return null;
  const m = monthMap[parts[0]];
  if (m === undefined) return null;
  const y = 2000 + parseInt(parts[1], 10);
  return new Date(y, m, 1);
}

// ─── Main Scan Function ──────────────────────────────────────────────────────

/** Run a complete governance scan and produce a full report */
export function runGovernanceScan(): GovernanceReport {
  const issues = [
    ...checkConsistency(),
    ...checkFreshness(),
    ...checkCompleteness(),
    ...checkAccuracy(),
    ...checkStructural(),
  ];

  const health = calculateHealth(issues);

  const qualitySummary = getQualitySummary();
  const mockMigrationSummary = getMockMigrationSummary();
  const allSources = Object.values(SOURCE_CATALOG);

  return {
    timestamp: new Date().toISOString(),
    health,
    issues,
    metrics: {
      totalSources: allSources.length,
      mockSources: allSources.filter((s) => s.origin === "mock").length,
      realSources: allSources.filter((s) => s.origin !== "mock" && s.origin !== "derived").length,
      derivedSources: allSources.filter((s) => s.origin === "derived").length,
      busRegistered: Object.keys(BU_REGISTRY).length,
      busActive: getActiveBus().length,
      busOperating: getOperatingBus().length,
      mockMigrationSummary,
      qualitySummary,
    },
    autoFixable: issues.filter((i) => i.action === "auto-fix"),
    escalations: issues.filter((i) => i.action === "escalate"),
  };
}

/** Format report for human consumption (concise) */
export function formatReportForHuman(report: GovernanceReport): string {
  const lines: string[] = [];

  lines.push(`📊 DATA GOVERNANCE REPORT — ${report.timestamp}`);
  lines.push("");
  lines.push(`HEALTH SCORE: ${report.health.overall}%`);
  lines.push(`  Consistência: ${report.health.consistency}% | Frescor: ${report.health.freshness}% | Completude: ${report.health.completeness}% | Precisão: ${report.health.accuracy}%`);
  lines.push("");

  if (report.autoFixable.length > 0) {
    lines.push(`✅ AUTO-FIXÁVEL (${report.autoFixable.length}):`);
    for (const issue of report.autoFixable.slice(0, 5)) {
      lines.push(`  • [${issue.severity.toUpperCase()}] ${issue.title}`);
    }
    if (report.autoFixable.length > 5) {
      lines.push(`  ... +${report.autoFixable.length - 5} mais`);
    }
    lines.push("");
  }

  if (report.escalations.length > 0) {
    lines.push(`🔴 ESCALAÇÕES (${report.escalations.length}):`);
    for (const issue of report.escalations) {
      lines.push(`  • [${issue.severity.toUpperCase()}] ${issue.title} — ${issue.description}`);
      lines.push(`    → ${issue.suggestion}`);
    }
    lines.push("");
  }

  const warnings = report.issues.filter((i) => i.action === "monitor");
  if (warnings.length > 0) {
    lines.push(`⚠️ MONITORANDO (${warnings.length}):`);
    for (const issue of warnings.slice(0, 3)) {
      lines.push(`  • ${issue.title}`);
    }
    lines.push("");
  }

  lines.push(`📈 MÉTRICAS:`);
  lines.push(`  Sources: ${report.metrics.totalSources} total | ${report.metrics.mockSources} mock | ${report.metrics.realSources} real | ${report.metrics.derivedSources} derivado`);
  lines.push(`  BUs: ${report.metrics.busRegistered} registradas | ${report.metrics.busActive} ativas | ${report.metrics.busOperating} operacionais`);
  lines.push(`  Mocks high-priority: ${report.metrics.mockMigrationSummary.highPriority}`);

  return lines.join("\n");
}
