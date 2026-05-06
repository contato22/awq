// ─── AWQ Google Drive Export ──────────────────────────────────────────────────
//
// Exports platform data to structured Google Drive folders by period.
//
// Folder structure in Drive:
//   AWQ Platform/
//   ├── Diário/   YYYY-MM-DD/   transacoes.csv, documentos.json, caixa.json
//   ├── Semanal/  YYYY-WXX/     crm-pipeline.csv, bpm-tarefas.json, resumo.json
//   ├── Mensal/   YYYY-MM/      dre.json, transacoes.csv, crm.json, backup.json
//   └── Anual/    YYYY/         balanco.json, backup-full.json

import {
  USE_DRIVE,
  DRIVE_ROOT_FOLDER_ID,
  ensureFolder,
  uploadFile,
  toCsv,
} from "@/lib/drive-client";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function isoWeek(d = new Date()): string {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const week = Math.round(
    ((date.getTime() - week1.getTime()) / 86400000 + ((week1.getDay() + 6) % 7)) / 7
  ) + 1;
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isoMonth(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

function isoYear(d = new Date()) {
  return String(d.getFullYear());
}

// ─── Folder tree ──────────────────────────────────────────────────────────────

async function getPeriodFolder(
  periodType: "Diário" | "Semanal" | "Mensal" | "Anual",
  subLabel: string
): Promise<string | null> {
  if (!USE_DRIVE) return null;

  const root = await ensureFolder(DRIVE_ROOT_FOLDER_ID, "AWQ Platform");
  if (!root) return null;

  const typeFolder = await ensureFolder(root, periodType);
  if (!typeFolder) return null;

  return ensureFolder(typeFolder, subLabel);
}

// ─── Export results ───────────────────────────────────────────────────────────

export interface DriveExportResult {
  period: string;
  folder: string;
  files: { name: string; ok: boolean }[];
  durationMs: number;
  error?: string;
}

// ─── Daily export ─────────────────────────────────────────────────────────────
// Transações do dia, documentos ingeridos, posição de caixa

export async function exportDaily(
  date = new Date()
): Promise<DriveExportResult> {
  const t0 = Date.now();
  const label = isoDate(date);
  const result: DriveExportResult = { period: label, folder: "Diário/" + label, files: [], durationMs: 0 };

  const folderId = await getPeriodFolder("Diário", label);
  if (!folderId) {
    result.error = "Drive not configured";
    result.durationMs = Date.now() - t0;
    return result;
  }

  const { getAllTransactions, getAllDocuments, getCashPositionByEntity } =
    await import("@/lib/financial-db");

  const [allTxns, allDocs, cashPos] = await Promise.all([
    getAllTransactions(),
    getAllDocuments(),
    getCashPositionByEntity(),
  ]);

  const todayTxns = allTxns.filter((t) => t.transaction_date === label);
  const todayDocs = allDocs.filter((d) => d.uploaded_at?.slice(0, 10) === label);

  const files: [string, string, "application/json" | "text/csv"][] = [
    [
      `transacoes-${label}.csv`,
      toCsv(
        todayTxns.map((t) => ({
          id: t.id,
          data: t.transaction_date,
          entidade: t.entity,
          banco: t.bank,
          conta: t.account_name,
          descricao: t.description_original,
          valor: t.amount,
          direcao: t.direction,
          categoria: t.managerial_category,
          contraparte: t.counterparty_name ?? "",
          intercompany: t.is_intercompany,
        }))
      ),
      "text/csv",
    ],
    [
      `documentos-${label}.json`,
      JSON.stringify(todayDocs, null, 2),
      "application/json",
    ],
    [
      `posicao-caixa-${label}.json`,
      JSON.stringify({ data: label, posicoes: cashPos }, null, 2),
      "application/json",
    ],
  ];

  for (const [name, content, mime] of files) {
    const uploaded = await uploadFile(folderId, name, content, mime);
    result.files.push({ name, ok: !!uploaded });
  }

  result.durationMs = Date.now() - t0;
  return result;
}

// ─── Weekly export ────────────────────────────────────────────────────────────
// CRM pipeline, BPM tasks, posição consolidada da semana

export async function exportWeekly(
  date = new Date()
): Promise<DriveExportResult> {
  const t0 = Date.now();
  const label = isoWeek(date);
  const result: DriveExportResult = { period: label, folder: "Semanal/" + label, files: [], durationMs: 0 };

  const folderId = await getPeriodFolder("Semanal", label);
  if (!folderId) {
    result.error = "Drive not configured";
    result.durationMs = Date.now() - t0;
    return result;
  }

  const { getAllTransactions, getCashPositionByEntity } = await import("@/lib/financial-db");
  const { listOpportunities, listLeads, getPipelineMetrics } = await import("@/lib/crm-db");
  const { getAllInstances, getSlaDashboard } = await import("@/lib/bpm-db");

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  const weekStartStr = isoDate(weekStart);

  const [txns, cashPos, opps, leads, pipelineMetrics, bpmInstances, slaDash] =
    await Promise.all([
      getAllTransactions(),
      getCashPositionByEntity(),
      listOpportunities(),
      listLeads(),
      getPipelineMetrics(),
      getAllInstances(),
      getSlaDashboard(),
    ]);

  const weekTxns = txns.filter((t) => t.transaction_date >= weekStartStr);

  const files: [string, string, "application/json" | "text/csv"][] = [
    [
      `crm-pipeline-${label}.csv`,
      toCsv(
        opps.map((o) => ({
          id: o.opportunity_id,
          codigo: o.code,
          nome: o.name,
          conta: o.account_name ?? "",
          estagio: o.stage,
          valor: o.deal_value,
          probabilidade: o.probability,
          responsavel: o.owner,
          fechamento_previsto: o.expected_close_date ?? "",
        }))
      ),
      "text/csv",
    ],
    [
      `crm-leads-${label}.csv`,
      toCsv(
        leads.map((l) => ({
          id: l.lead_id,
          empresa: l.company_name,
          contato: l.contact_name ?? "",
          fonte: l.source,
          status: l.status,
          responsavel: l.assigned_to ?? "",
          bant_budget: l.bant_budget,
          bant_authority: l.bant_authority,
          bant_need: l.bant_need,
          bant_timeline: l.bant_timeline,
        }))
      ),
      "text/csv",
    ],
    [
      `bpm-instancias-${label}.json`,
      JSON.stringify(
        {
          semana: label,
          total: bpmInstances.length,
          por_status: bpmInstances.reduce<Record<string, number>>((acc, i) => {
            acc[i.status] = (acc[i.status] ?? 0) + 1;
            return acc;
          }, {}),
          sla_dashboard: slaDash,
        },
        null,
        2
      ),
      "application/json",
    ],
    [
      `resumo-financeiro-${label}.json`,
      JSON.stringify(
        {
          semana: label,
          inicio: weekStartStr,
          transacoes_count: weekTxns.length,
          entradas: weekTxns
            .filter((t) => t.direction === "credit")
            .reduce((s, t) => s + Number(t.amount), 0),
          saidas: weekTxns
            .filter((t) => t.direction === "debit")
            .reduce((s, t) => s + Number(t.amount), 0),
          posicao_caixa: cashPos,
          crm_pipeline: pipelineMetrics,
        },
        null,
        2
      ),
      "application/json",
    ],
  ];

  for (const [name, content, mime] of files) {
    const uploaded = await uploadFile(folderId, name, content, mime);
    result.files.push({ name, ok: !!uploaded });
  }

  result.durationMs = Date.now() - t0;
  return result;
}

// ─── Monthly export ───────────────────────────────────────────────────────────
// DRE gerencial, transações do mês, CRM analytics, backup JSON

export async function exportMonthly(
  date = new Date()
): Promise<DriveExportResult> {
  const t0 = Date.now();
  const label = isoMonth(date);
  const result: DriveExportResult = { period: label, folder: "Mensal/" + label, files: [], durationMs: 0 };

  const folderId = await getPeriodFolder("Mensal", label);
  if (!folderId) {
    result.error = "Drive not configured";
    result.durationMs = Date.now() - t0;
    return result;
  }

  const { getAllTransactions, getAllDocuments, getCashPositionByEntity } =
    await import("@/lib/financial-db");
  const {
    listAccounts,
    listOpportunities,
    listLeads,
    listActivities,
    getPipelineMetrics,
    getDashboardMetrics,
  } = await import("@/lib/crm-db");
  const { listProjects } = await import("@/lib/ppm-db");

  const [allTxns, allDocs, cashPos, accounts, opps, leads, activities, pipeline, crmDash, projects] =
    await Promise.all([
      getAllTransactions(),
      getAllDocuments(),
      getCashPositionByEntity(),
      listAccounts(),
      listOpportunities(),
      listLeads(),
      listActivities(),
      getPipelineMetrics(),
      getDashboardMetrics(),
      listProjects(),
    ]);

  const monthTxns = allTxns.filter((t) => t.transaction_date.startsWith(label));
  const monthDocs = allDocs.filter((d) => d.uploaded_at?.startsWith(label));

  // DRE simplificado por categoria gerencial
  const dreByCategory = monthTxns.reduce<Record<string, { entradas: number; saidas: number }>>(
    (acc, t) => {
      const cat = t.managerial_category;
      if (!acc[cat]) acc[cat] = { entradas: 0, saidas: 0 };
      if (t.direction === "credit") acc[cat].entradas += Number(t.amount);
      else acc[cat].saidas += Number(t.amount);
      return acc;
    },
    {}
  );

  // DRE por entidade
  const dreByEntity = monthTxns.reduce<Record<string, { entradas: number; saidas: number }>>(
    (acc, t) => {
      const e = t.entity;
      if (!acc[e]) acc[e] = { entradas: 0, saidas: 0 };
      if (t.direction === "credit") acc[e].entradas += Number(t.amount);
      else acc[e].saidas += Number(t.amount);
      return acc;
    },
    {}
  );

  const files: [string, string, "application/json" | "text/csv"][] = [
    [
      `transacoes-${label}.csv`,
      toCsv(
        monthTxns.map((t) => ({
          id: t.id,
          data: t.transaction_date,
          entidade: t.entity,
          banco: t.bank,
          conta: t.account_name,
          descricao: t.description_original,
          valor: t.amount,
          direcao: t.direction,
          categoria: t.managerial_category,
          contraparte: t.counterparty_name ?? "",
          conciliado: t.reconciliation_status ?? "",
          intercompany: t.is_intercompany,
        }))
      ),
      "text/csv",
    ],
    [
      `dre-gerencial-${label}.json`,
      JSON.stringify(
        {
          mes: label,
          total_entradas: monthTxns
            .filter((t) => t.direction === "credit")
            .reduce((s, t) => s + Number(t.amount), 0),
          total_saidas: monthTxns
            .filter((t) => t.direction === "debit")
            .reduce((s, t) => s + Number(t.amount), 0),
          por_categoria: dreByCategory,
          por_entidade: dreByEntity,
          posicao_caixa: cashPos,
          documentos_processados: monthDocs.length,
        },
        null,
        2
      ),
      "application/json",
    ],
    [
      `crm-${label}.json`,
      JSON.stringify(
        {
          mes: label,
          contas: accounts.length,
          leads: leads.length,
          oportunidades: opps.length,
          atividades: activities.length,
          pipeline: pipeline,
          dashboard: crmDash,
          contas_data: accounts,
          oportunidades_data: opps,
          leads_data: leads,
        },
        null,
        2
      ),
      "application/json",
    ],
    [
      `projetos-${label}.json`,
      JSON.stringify(
        {
          mes: label,
          total: projects.length,
          por_status: projects.reduce<Record<string, number>>((acc, p) => {
            acc[p.status] = (acc[p.status] ?? 0) + 1;
            return acc;
          }, {}),
          projetos: projects,
        },
        null,
        2
      ),
      "application/json",
    ],
    [
      `backup-${label}.json`,
      JSON.stringify(
        {
          mes: label,
          gerado_em: new Date().toISOString(),
          financial_documents: allDocs,
          bank_transactions: monthTxns,
          crm_accounts: accounts,
          crm_opportunities: opps,
          crm_leads: leads,
          ppm_projects: projects,
        },
        null,
        2
      ),
      "application/json",
    ],
  ];

  for (const [name, content, mime] of files) {
    const uploaded = await uploadFile(folderId, name, content, mime);
    result.files.push({ name, ok: !!uploaded });
  }

  result.durationMs = Date.now() - t0;
  return result;
}

// ─── Annual export ────────────────────────────────────────────────────────────
// Balanço consolidado + backup full de todos os módulos

export async function exportAnnual(
  date = new Date()
): Promise<DriveExportResult> {
  const t0 = Date.now();
  const label = isoYear(date);
  const result: DriveExportResult = { period: label, folder: "Anual/" + label, files: [], durationMs: 0 };

  const folderId = await getPeriodFolder("Anual", label);
  if (!folderId) {
    result.error = "Drive not configured";
    result.durationMs = Date.now() - t0;
    return result;
  }

  const { getAllTransactions, getAllDocuments, getCashPositionByEntity } =
    await import("@/lib/financial-db");
  const { listAccounts, listOpportunities, listLeads, listContacts } =
    await import("@/lib/crm-db");
  const { listProjects, listTasks, listRisks } = await import("@/lib/ppm-db");
  const { getAllInstances } = await import("@/lib/bpm-db");

  const [allTxns, allDocs, cashPos, accounts, opps, leads, contacts, projects, tasks, risks, bpmInstances] =
    await Promise.all([
      getAllTransactions(),
      getAllDocuments(),
      getCashPositionByEntity(),
      listAccounts(),
      listOpportunities(),
      listLeads(),
      listContacts(),
      listProjects(),
      listTasks(),
      listRisks(),
      getAllInstances(),
    ]);

  const yearTxns = allTxns.filter((t) => t.transaction_date.startsWith(label));

  // Balanço anual por entidade e categoria
  const balanco = yearTxns.reduce<
    Record<string, { entradas: number; saidas: number; saldo: number }>
  >((acc, t) => {
    const e = t.entity;
    if (!acc[e]) acc[e] = { entradas: 0, saidas: 0, saldo: 0 };
    const v = Number(t.amount);
    if (t.direction === "credit") {
      acc[e].entradas += v;
      acc[e].saldo += v;
    } else {
      acc[e].saidas += v;
      acc[e].saldo -= v;
    }
    return acc;
  }, {});

  const files: [string, string, "application/json" | "text/csv"][] = [
    [
      `transacoes-${label}.csv`,
      toCsv(
        yearTxns.map((t) => ({
          id: t.id,
          data: t.transaction_date,
          entidade: t.entity,
          banco: t.bank,
          conta: t.account_name,
          descricao: t.description_original,
          valor: t.amount,
          direcao: t.direction,
          categoria: t.managerial_category,
          contraparte: t.counterparty_name ?? "",
          intercompany: t.is_intercompany,
        }))
      ),
      "text/csv",
    ],
    [
      `balanco-consolidado-${label}.json`,
      JSON.stringify(
        {
          ano: label,
          gerado_em: new Date().toISOString(),
          balanco_por_entidade: balanco,
          posicao_caixa_atual: cashPos,
          total_entradas: yearTxns
            .filter((t) => t.direction === "credit")
            .reduce((s, t) => s + Number(t.amount), 0),
          total_saidas: yearTxns
            .filter((t) => t.direction === "debit")
            .reduce((s, t) => s + Number(t.amount), 0),
          total_documentos: allDocs.length,
          total_transacoes: yearTxns.length,
        },
        null,
        2
      ),
      "application/json",
    ],
    [
      `backup-full-${label}.json`,
      JSON.stringify(
        {
          ano: label,
          gerado_em: new Date().toISOString(),
          financial_documents: allDocs,
          bank_transactions: yearTxns,
          crm_accounts: accounts,
          crm_contacts: contacts,
          crm_opportunities: opps,
          crm_leads: leads,
          ppm_projects: projects,
          ppm_tasks: tasks,
          ppm_risks: risks,
          bpm_instances: bpmInstances,
        },
        null,
        2
      ),
      "application/json",
    ],
  ];

  for (const [name, content, mime] of files) {
    const uploaded = await uploadFile(folderId, name, content, mime);
    result.files.push({ name, ok: !!uploaded });
  }

  result.durationMs = Date.now() - t0;
  return result;
}

// ─── Full sync (all periods for today) ───────────────────────────────────────

export async function exportAll(date = new Date()): Promise<DriveExportResult[]> {
  const [daily, weekly, monthly, annual] = await Promise.all([
    exportDaily(date),
    exportWeekly(date),
    exportMonthly(date),
    exportAnnual(date),
  ]);
  return [daily, weekly, monthly, annual];
}
