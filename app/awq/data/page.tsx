// ─── AWQ Data Layer Management — /awq/data ──────────────────────────────────
//
// Control tower for platform storage / source of truth / data layer governance.
// Reads REAL infrastructure: financial-db, financial-ingest-status, platform-registry.
// Zero invented numbers. All unknowns labelled explicitly.

import Header from "@/components/Header";
import Link from "next/link";
import {
  Database, Server, Layers, Shield, ListTodo,
  CheckCircle2, XCircle, Clock, AlertTriangle,
  Package, ArrowRight, Eye, EyeOff, Lock, HardDrive,
  KeyRound, ShieldAlert, ShieldCheck, Activity,
} from "lucide-react";
import { getAllDocuments, getAllTransactions } from "@/lib/financial-db";
import { buildFinancialQuery, ENTITY_LABELS } from "@/lib/financial-query";
import {
  INGEST_LAYER_STATUS, INGEST_SUMMARY,
  type LayerValidationStatus, type LayerProductionStatus,
} from "@/lib/financial-ingest-status";
import { PLATFORM_ROUTES } from "@/lib/platform-registry";
import { SNAPSHOT_REGISTRY, getSnapshotMigrationStatus } from "@/lib/snapshot-registry";
import { SENSITIVE_ROUTES, SENSITIVE_APIS } from "@/lib/security-registry";
import { PERMISSION_MATRIX, SECURITY_ENFORCEMENT_MODE } from "@/lib/security-access";
import type { SecurityRole } from "@/lib/security-types";

// ─── Local types ─────────────────────────────────────────────────────────────

type SourceType =
  | "registry" | "snapshot" | "canonical-store" | "selector"
  | "config"   | "adapter"  | "runtime"          | "external";

type ConfidenceLevel =
  | "confirmada" | "snapshot" | "parcial" | "mock" | "nao-verificavel";

interface DataSourceEntry {
  name: string; path: string; type: SourceType; scope: string;
  description: string; isConsumed: boolean; isInternal: boolean;
  confidence: ConfidenceLevel; pagesUsing: number;
}

interface ActionItem {
  id: string; priority: "critico" | "alto" | "medio" | "baixo";
  title: string; description: string; owner: string; impact: string;
}

// ─── BU Storage Metadata — organizado por categoria do sidebar ───────────────

interface BuStorageConfig {
  id: "awq" | "jacqes" | "caza" | "venture" | "advisor" | "ai" | "system"
    | "crm" | "ppm" | "bpm" | "bi" | "cpm" | "grc" | "dms" | "erp" | "hcm";
  label: string;
  sublabel: string;
  borderCls: string;
  bgCls: string;
  textCls: string;
  badgeCls: string;
  securityLayer: string;
  primaryStorage: { name: string; type: SourceType; confidence: ConfidenceLevel }[];
  sidebarSections: string[];
}

const BU_STORAGE_MAP: BuStorageConfig[] = [
  {
    id: "awq", label: "AWQ Group", sublabel: "Control Tower · FP&A · Tesouraria · Controladoria · Jurídico · Dados & Infra",
    borderCls: "border-blue-200", bgCls: "bg-blue-50", textCls: "text-blue-800", badgeCls: "bg-blue-100 text-blue-700",
    securityLayer: "holding · financeiro · dados_infra · security · juridico",
    primaryStorage: [
      { name: "Neon Postgres (financial_documents + bank_transactions)", type: "canonical-store", confidence: "confirmada" },
      { name: "Google Drive AWQ PLATAFORM GROUP (10 TB — eqoa@ultrapack.cloud)", type: "canonical-store", confidence: "confirmada" },
      { name: "Vercel Blob (PDFs — priority 2, fallback, 512 MB free)",  type: "canonical-store", confidence: "confirmada" },
      { name: "lib/awq-group-data.ts (KPIs snapshot Q1 2026)",          type: "snapshot",        confidence: "snapshot"   },
      { name: "lib/financial-query.ts (seletor canônico)",               type: "selector",        confidence: "confirmada" },
      { name: "lib/bank-account-registry.ts (topologia contas)",         type: "registry",        confidence: "confirmada" },
      { name: "localStorage (saldos /awq/bank — client-side)",           type: "runtime",         confidence: "nao-verificavel" },
      { name: "lib/security-audit.ts (Neon + in-memory fallback)",        type: "adapter",         confidence: "confirmada" },
    ],
    sidebarSections: [
      "Visão Geral","KPIs Consolidados","Risk & Alertas","Portfolio Corp.","Allocations",
      "Financial (DRE)","P&L","Balanço Patrimonial","Budget","Budget vs Actual","Forecast","KPI Dashboard",
      "Cash Flow","Contas Banco","Investimentos","Conciliação Bancária","Conciliação",
      "AP & AR","Contas a Pagar","AP Aging","Contas a Receber","AR Aging","Fornecedores","Clientes EPM",
      "Razão Geral (GL)","Centros de Custo","Consolidação","Reconhec. de Receita","Fixed Assets",
      "Controladoria","Contabilidade","Fiscal",
      "CRM Dashboard","Contas CRM","Contatos","Leads","Pipeline CRM","Oportunidades","Atividades CRM","Analytics CRM","Matriz RFM",
      "PPM Portfolio","Gantt","Tarefas","Timesheets PPM","Recursos","Utilização","Rentabilidade PPM","Riscos PPM",
      "BPM Fila","Processos","Instâncias","Analytics BPM",
      "BI Dashboards","Relatórios BI","Análises","Visualizações","Base de Dados",
      "Estratégia","OKRs","Scorecards","Performance Reviews","Novidades",
      "Jurídico","Societário","Compliance","Políticas","Riscos GRC","Auditorias","Controles","Segurança",
      "DMS Documentos","Arquivos","Versionamento","Colaboração",
      "ERP Procurement","Inventory","Pedidos de Venda","Time & Expense","Contratos ERP","Assets",
      "RH","Folha de Pagamento","Férias","Recrutamento","Treinamento",
      "Ingestão",
    ],
  },
  {
    id: "jacqes", label: "JACQES", sublabel: "CRM · FP&A · Relatórios · Carreira",
    borderCls: "border-indigo-200", bgCls: "bg-indigo-50", textCls: "text-indigo-800", badgeCls: "bg-indigo-100 text-indigo-700",
    securityLayer: "jacqes",
    primaryStorage: [
      { name: "Neon Postgres (jacqes_crm_* — 10 tabelas CRM)",          type: "canonical-store", confidence: "confirmada" },
      { name: "lib/data.ts (KPIs operacionais snapshot Q1 2026)",         type: "snapshot",        confidence: "snapshot"   },
      { name: "lib/jacqes-crm-db.ts + lib/jacqes-crm-query.ts",          type: "selector",        confidence: "confirmada" },
    ],
    sidebarSections: ["Visão Geral","FP&A","Relatórios","Mini P&L","Receita","Unit Economics","CRM Visão Geral","Pipeline CRM","Leads","Oportunidades","Propostas","Clientes","Carteira","Tarefas & SLA","Interações","Expansão","Churn & Health","Relatórios CRM","Matriz RFM","Modo Carreira"],
  },
  {
    id: "caza", label: "Caza Vision", sublabel: "Projetos · Clientes · Financial · Unit Econ · Importar",
    borderCls: "border-violet-200", bgCls: "bg-violet-50", textCls: "text-violet-800", badgeCls: "bg-violet-100 text-violet-700",
    securityLayer: "caza_vision",
    primaryStorage: [
      { name: "Neon Postgres (caza_* — projetos, clientes, financeiro)",  type: "canonical-store", confidence: "confirmada" },
      { name: "Notion API (receita projetos accrual — fallback JSON)",     type: "external",        confidence: "parcial"    },
      { name: "lib/caza-data.ts (snapshot Q1 2026)",                      type: "snapshot",        confidence: "snapshot"   },
    ],
    sidebarSections: ["Visão Geral","Projetos","Clientes","Contas","Financial","Unit Economics","Importar"],
  },
  {
    id: "venture", label: "AWQ Venture", sublabel: "Visão Geral · Comercial · Portfólio · Deals · Sales",
    borderCls: "border-purple-200", bgCls: "bg-purple-50", textCls: "text-purple-800", badgeCls: "bg-purple-100 text-purple-700",
    securityLayer: "awq_venture",
    primaryStorage: [
      { name: "lib/awq-group-data.ts (snapshot portfólio/pipeline)",     type: "snapshot",        confidence: "snapshot"   },
      { name: "lib/deal-data.ts (deal workspaces — in-memory/JSON)",     type: "snapshot",        confidence: "snapshot"   },
      { name: "public/data/venture-sales.json (pipeline vendas Q1)",     type: "snapshot",        confidence: "snapshot"   },
      { name: "Notion API (vendas ao vivo via notion-fetch.ts)",          type: "external",        confidence: "parcial"    },
      { name: "lib/investment-query.ts (aplicações/resgates)",            type: "selector",        confidence: "confirmada" },
    ],
    sidebarSections: ["Visão Geral","Comercial","Portfólio","Pipeline","Deals","Financial","YoY 2025","Sales"],
  },
  {
    id: "advisor", label: "Advisor", sublabel: "Visão Geral · Financial · Customers",
    borderCls: "border-pink-200", bgCls: "bg-pink-50", textCls: "text-pink-800", badgeCls: "bg-pink-100 text-pink-700",
    securityLayer: "advisor",
    primaryStorage: [
      { name: "Dados próprios — pre_revenue, sem extrato/contrato ativo", type: "snapshot",        confidence: "mock"       },
      { name: "lib/caza-data.ts (referência parcial)",                    type: "adapter",         confidence: "parcial"    },
    ],
    sidebarSections: ["Visão Geral","Financial","Customers"],
  },
  {
    id: "ai", label: "AI & Agentes", sublabel: "Agents · OpenClaw Chat",
    borderCls: "border-emerald-200", bgCls: "bg-emerald-50", textCls: "text-emerald-800", badgeCls: "bg-emerald-100 text-emerald-700",
    securityLayer: "ai",
    primaryStorage: [
      { name: "Anthropic API (Claude — chat + PDF parsing agentic)",      type: "external",        confidence: "confirmada" },
      { name: "lib/agents-config.ts (4 agentes, system prompts, tools)",  type: "config",          confidence: "confirmada" },
      { name: "Runtime SSE (/api/chat, /api/agents/*)",                   type: "runtime",         confidence: "confirmada" },
    ],
    sidebarSections: ["Agents","OpenClaw"],
  },
  {
    id: "system", label: "Sistema", sublabel: "Login · Settings · Platform Registry",
    borderCls: "border-gray-200", bgCls: "bg-gray-50", textCls: "text-gray-700", badgeCls: "bg-gray-100 text-gray-600",
    securityLayer: "system",
    primaryStorage: [
      { name: "lib/auth-users.ts (6 users hardcoded, JWT via NextAuth)",  type: "config",          confidence: "confirmada" },
      { name: "next-auth session (JWT em memória, cookie HTTPOnly)",       type: "runtime",         confidence: "confirmada" },
      { name: "lib/platform-registry.ts (154 rotas canônicas)",           type: "registry",        confidence: "confirmada" },
    ],
    sidebarSections: ["Login","Settings","Segurança (settings)","Integrações"],
  },
  // ── 5. CRM Tower ─────────────────────────────────────────────────────────────
  {
    id: "crm", label: "CRM Tower", sublabel: "Leads · Pipeline · Clientes · Oportunidades · Matriz RFM",
    borderCls: "border-sky-200", bgCls: "bg-sky-50", textCls: "text-sky-800", badgeCls: "bg-sky-100 text-sky-700",
    securityLayer: "jacqes · caza_vision · awq_venture",
    primaryStorage: [
      { name: "Neon Postgres (jacqes_crm_* — leads, pipeline, oportunidades)", type: "canonical-store", confidence: "confirmada" },
      { name: "Neon Postgres (caza_crm_* — clientes Caza Vision)",              type: "canonical-store", confidence: "confirmada" },
      { name: "lib/crm-db.ts + lib/jacqes-crm-db.ts + lib/caza-crm-db.ts",     type: "selector",        confidence: "confirmada" },
      { name: "lib/jacqes-crm-store.ts (in-memory cache / local fallback)",     type: "adapter",         confidence: "parcial"    },
      { name: "lib/crm-rfm-types.ts (Matriz RFM — calculado em runtime)",       type: "runtime",         confidence: "confirmada" },
    ],
    sidebarSections: ["Dashboard CRM","Contas","Contatos","Leads","Pipeline","Clientes","Oportunidades","Atividades","Analytics","Matriz RFM"],
  },
  // ── 6. PPM Tower ─────────────────────────────────────────────────────────────
  {
    id: "ppm", label: "PPM Tower", sublabel: "Portfolio · Gantt · Tarefas · Timesheets · Recursos",
    borderCls: "border-teal-200", bgCls: "bg-teal-50", textCls: "text-teal-800", badgeCls: "bg-teal-100 text-teal-700",
    securityLayer: "holding · dados_infra",
    primaryStorage: [
      { name: "Neon Postgres (ppm_projects, ppm_tasks, ppm_timesheets)",         type: "canonical-store", confidence: "confirmada" },
      { name: "lib/ppm-db.ts + lib/ppm-types.ts",                               type: "selector",        confidence: "confirmada" },
      { name: "public/data/ppm-*.json (fallback local dev)",                    type: "adapter",         confidence: "parcial"    },
    ],
    sidebarSections: ["Portfolio","Gantt","Tarefas","Timesheets","Recursos","Utilização","Rentabilidade","Riscos"],
  },
  // ── 7. BPM Tower ─────────────────────────────────────────────────────────────
  {
    id: "bpm", label: "BPM Tower", sublabel: "Processos · Workflows · Aprovações · Automação",
    borderCls: "border-orange-200", bgCls: "bg-orange-50", textCls: "text-orange-800", badgeCls: "bg-orange-100 text-orange-700",
    securityLayer: "holding · dados_infra",
    primaryStorage: [
      { name: "Neon Postgres (bpm_processes, bpm_instances, bpm_tasks)",         type: "canonical-store", confidence: "confirmada" },
      { name: "lib/bpm-db.ts + lib/bpm-types.ts + lib/bpm-workflow-engine.ts",  type: "selector",        confidence: "confirmada" },
      { name: "public/data/bpm-*.json (fallback local dev)",                    type: "adapter",         confidence: "parcial"    },
    ],
    sidebarSections: ["Minha Fila","Processos","Instâncias","Analytics BPM"],
  },
  // ── 8. BI Tower ──────────────────────────────────────────────────────────────
  {
    id: "bi", label: "BI Tower", sublabel: "Dashboards · Relatórios · Análises · Visualizações",
    borderCls: "border-cyan-200", bgCls: "bg-cyan-50", textCls: "text-cyan-800", badgeCls: "bg-cyan-100 text-cyan-700",
    securityLayer: "holding · financeiro · dados_infra",
    primaryStorage: [
      { name: "lib/financial-query.ts (seletor canônico — dados reais)",         type: "selector",        confidence: "confirmada" },
      { name: "lib/awq-group-data.ts (KPIs consolidados — snapshot Q1 2026)",    type: "snapshot",        confidence: "snapshot"   },
      { name: "lib/platform-registry.ts (154 rotas — metadados de navegação)",   type: "registry",        confidence: "confirmada" },
      { name: "Base de Dados: /awq/data (esta página)",                          type: "runtime",         confidence: "confirmada" },
    ],
    sidebarSections: ["Dashboards","Relatórios","Análises","Visualizações","Base de Dados"],
  },
  // ── 9. CPM Tower ─────────────────────────────────────────────────────────────
  {
    id: "cpm", label: "CPM Tower", sublabel: "KPIs · OKRs · Estratégia · Scorecards · Performance",
    borderCls: "border-lime-200", bgCls: "bg-lime-50", textCls: "text-lime-800", badgeCls: "bg-lime-100 text-lime-700",
    securityLayer: "holding · admin",
    primaryStorage: [
      { name: "lib/awq-group-data.ts (KPIs consolidados — snapshot Q1 2026)",    type: "snapshot",        confidence: "snapshot"   },
      { name: "lib/financial-query.ts (métricas reais pós-ingestão)",            type: "selector",        confidence: "confirmada" },
      { name: "OKRs / Scorecards — stub (sem DB dedicado ainda)",                type: "runtime",         confidence: "mock"       },
    ],
    sidebarSections: ["KPIs Consolidados","Risk & Alertas","Portfolio Corp.","Allocations","Estratégia","OKRs","Scorecards","Performance Reviews","Novidades"],
  },
  // ── 10. GRC Tower ────────────────────────────────────────────────────────────
  {
    id: "grc", label: "GRC Tower", sublabel: "Jurídico · Societário · Compliance · Riscos · Auditorias",
    borderCls: "border-red-200", bgCls: "bg-red-50", textCls: "text-red-800", badgeCls: "bg-red-100 text-red-700",
    securityLayer: "security · holding",
    primaryStorage: [
      { name: "lib/security-audit.ts (Neon awq_security_audit_log + in-memory)", type: "canonical-store", confidence: "confirmada" },
      { name: "lib/security-registry.ts (rotas + APIs sensíveis)",               type: "registry",        confidence: "confirmada" },
      { name: "lib/security-access.ts (PERMISSION_MATRIX, RBAC)",                type: "config",          confidence: "confirmada" },
      { name: "Google Drive Segurança & Auditoria (eventos blocked)",            type: "canonical-store", confidence: "confirmada" },
      { name: "Jurídico / Societário / Compliance — stub (sem DB dedicado)",     type: "runtime",         confidence: "mock"       },
    ],
    sidebarSections: ["Jurídico","Societário","Compliance","Segurança","Políticas","Riscos","Auditorias","Controles"],
  },
  // ── 11. DMS Tower ────────────────────────────────────────────────────────────
  {
    id: "dms", label: "DMS Tower", sublabel: "Documentos · Arquivos · Versionamento · Colaboração",
    borderCls: "border-stone-200", bgCls: "bg-stone-50", textCls: "text-stone-800", badgeCls: "bg-stone-100 text-stone-700",
    securityLayer: "holding · dados_infra",
    primaryStorage: [
      { name: "Google Drive AWQ PLATAFORM GROUP (storage primário 10 TB)",       type: "canonical-store", confidence: "confirmada" },
      { name: "Vercel Blob (fallback PDFs e arquivos binários)",                 type: "canonical-store", confidence: "confirmada" },
      { name: "DMS DB / metadados — stub (sem tabela dedicada ainda)",           type: "runtime",         confidence: "mock"       },
    ],
    sidebarSections: ["Documentos","Arquivos","Versionamento","Colaboração"],
  },
  // ── 12. ERP Tower ────────────────────────────────────────────────────────────
  {
    id: "erp", label: "ERP Tower", sublabel: "Procurement · Inventory · Orders · Contratos · Assets",
    borderCls: "border-amber-200", bgCls: "bg-amber-50", textCls: "text-amber-800", badgeCls: "bg-amber-100 text-amber-700",
    securityLayer: "holding · dados_infra",
    primaryStorage: [
      { name: "ERP DB — stub (rotas existem, DB não implementado)",              type: "runtime",         confidence: "mock"       },
      { name: "lib/ap-ar-db.ts (AP/AR como proxy de Procurement/Orders)",        type: "adapter",         confidence: "parcial"    },
      { name: "Google Drive Dados & Infra (destino futuro de docs ERP)",         type: "canonical-store", confidence: "confirmada" },
    ],
    sidebarSections: ["Requisições","Purchase Orders","Recebimento","Inventory","Pedidos de Venda","Fulfillment","Faturamento","Expedição","Timesheets ERP","Despesas","Contratos","Assets","Depreciação","Manutenção"],
  },
  // ── 13. HCM Tower ────────────────────────────────────────────────────────────
  {
    id: "hcm", label: "HCM Tower", sublabel: "RH · Folha · Férias · Recrutamento · Treinamento",
    borderCls: "border-rose-200", bgCls: "bg-rose-50", textCls: "text-rose-800", badgeCls: "bg-rose-100 text-rose-700",
    securityLayer: "holding · admin",
    primaryStorage: [
      { name: "HCM DB — stub (rotas existem, DB não implementado)",              type: "runtime",         confidence: "mock"       },
      { name: "Google Drive Dados & Infra (destino futuro de docs RH)",          type: "canonical-store", confidence: "confirmada" },
    ],
    sidebarSections: ["RH","Folha de Pagamento","Férias","Recrutamento","Treinamento"],
  },
];

// ─── Kept for compatibility with governance section ───────────────────────────
const DATA_SOURCES: DataSourceEntry[] = [
  { name: "platform-registry.ts",  path: "lib/platform-registry.ts",              type: "registry",        scope: "Plataforma",           description: "154 rotas canônicas. Single source of truth para sidebar, routing e nav.",                                         isConsumed: true, isInternal: true,  confidence: "confirmada",      pagesUsing: -1 },
  { name: "awq-group-data.ts",      path: "lib/awq-group-data.ts",                 type: "snapshot",        scope: "AWQ Group",            description: "KPIs consolidados Q1 2026 (4 BUs). Fonte primária de 8+ páginas AWQ.",                                              isConsumed: true, isInternal: true,  confidence: "snapshot",        pagesUsing: 8  },
  { name: "data.ts",                path: "lib/data.ts",                            type: "snapshot",        scope: "JACQES",               description: "KPIs e dados operacionais JACQES Q1 2026. Fonte primária de /jacqes/*.",                                            isConsumed: true, isInternal: true,  confidence: "snapshot",        pagesUsing: 9  },
  { name: "caza-data.ts",           path: "lib/caza-data.ts",                       type: "snapshot",        scope: "Caza Vision / Advisor", description: "Dados de projetos e clientes Caza Vision. Usada também pelo Advisor.",                                             isConsumed: true, isInternal: true,  confidence: "snapshot",        pagesUsing: 5  },
  { name: "public/data/financial/", path: "public/data/financial/{docs,txns}.json", type: "canonical-store", scope: "Financeiro",           description: "Store canônica do pipeline de ingestão. Vazio sem extrato real. Efêmero no Vercel.",                               isConsumed: true, isInternal: true,  confidence: "nao-verificavel", pagesUsing: 5  },
  { name: "financial-query.ts",     path: "lib/financial-query.ts",                 type: "selector",        scope: "Financeiro",           description: "Seletor canônico sobre financial-db. Único caminho autorizado para leitura real.",                                 isConsumed: true, isInternal: true,  confidence: "confirmada",      pagesUsing: 5  },
  { name: "bank-account-registry",  path: "lib/bank-account-registry.ts",           type: "registry",        scope: "Financeiro",           description: "Topologia canônica de contas bancárias AWQ.",                                                                    isConsumed: true, isInternal: true,  confidence: "confirmada",      pagesUsing: 2  },
  { name: "investment-query.ts",    path: "lib/investment-query.ts",                type: "selector",        scope: "AWQ Venture",          description: "Seletor de dados de investimento separado do pipeline operacional.",                                              isConsumed: true, isInternal: true,  confidence: "confirmada",      pagesUsing: 2  },
  { name: "agents-config.ts",       path: "lib/agents-config.ts",                   type: "config",          scope: "AI / Agents",          description: "4 agentes autônomos (JACQES, Caza, Venture, Advisor). System prompts e tools.",                                    isConsumed: true, isInternal: true,  confidence: "confirmada",      pagesUsing: 1  },
  { name: "auth-users.ts",          path: "lib/auth-users.ts",                      type: "config",          scope: "Sistema",              description: "6 usuários. Roles definidos. RBAC enforced em api_guarded.",                                                       isConsumed: true, isInternal: true,  confidence: "confirmada",      pagesUsing: 1  },
  { name: "venture-sales.json",     path: "public/data/venture-sales.json",          type: "snapshot",        scope: "AWQ Venture",          description: "Pipeline de vendas Venture Q1 2026. Fallback de Notion.",                                                         isConsumed: true, isInternal: true,  confidence: "snapshot",        pagesUsing: 1  },
  { name: "Notion API",             path: "lib/notion-fetch.ts → /api/notion",       type: "external",        scope: "Caza / Venture",       description: "Dados ao vivo. Fallback para JSON local quando offline.",                                                         isConsumed: true, isInternal: false, confidence: "parcial",         pagesUsing: 3  },
  { name: "localStorage (browser)", path: "app/awq/bank/page.tsx",                  type: "runtime",         scope: "Contas Banco",         description: "Saldos manuais em /awq/bank. Client-side apenas. Não persistido no servidor.",                                     isConsumed: true, isInternal: false, confidence: "nao-verificavel", pagesUsing: 1  },
];

const ACTION_QUEUE: ActionItem[] = [
  { id: "A1", priority: "critico", title: "Persistent storage (Vercel Blob / Neon)",         description: "public/data/financial/ é efêmero em Vercel serverless. PDFs e JSON perdem entre cold starts. Bloqueia produção.",                                                             owner: "Infra",       impact: "Pipeline inutilizável em produção sem isso." },
  { id: "A2", priority: "alto",    title: "Ingerir extratos reais (Cora + Itaú)",            description: "Nenhum PDF real processado ainda. Sem dados reais o pipeline nunca pode ser validado. Ir em /awq/conciliacao e fazer upload.",                                                     owner: "Operação",    impact: "Todos os dashboards com financial-query passam a ter dados reais." },
  { id: "A3", priority: "alto",    title: "Ingerir extratos e validar pipeline end-to-end",  description: "awq/financial, awq/cashflow, awq/kpis, awq/portfolio, awq/risk já consomem financial-query. Budget/forecast/allocations são accrual — ficam em snapshot com aviso. Próximo gate: ingerir PDF real em /awq/conciliacao.",                                                                          owner: "Operação",    impact: "Valida toda a cadeia de ingestão com dados reais." },
  { id: "A4", priority: "medio",   title: "Enforçar RBAC no middleware",                     description: "auth-users.ts define roles (owner, admin, analyst, cs-ops) mas ROLE_ALLOWED_PREFIXES está aberto para todos. Sem restrição real no middleware.",                             owner: "Segurança",   impact: "cs-ops e analyst sem acesso a dados AWQ Group." },
  { id: "A5", priority: "baixo",   title: "Migrar awq/page.tsx para consumir menos snapshot", description: "Control tower ainda usa buData[] de awq-group-data para métricas de BU. Após ingestão real, substituir por q.entities[] agregado.",                                          owner: "Engenharia",  impact: "Control tower mostrando dados reais em vez de snapshot." },
];

// ─── Badges ───────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: SourceType }) {
  const map: Record<SourceType, string> = {
    "registry":        "bg-violet-100 text-violet-700",
    "snapshot":        "bg-amber-100 text-amber-700",
    "canonical-store": "bg-emerald-100 text-emerald-700",
    "selector":        "bg-blue-100 text-blue-700",
    "config":          "bg-gray-100 text-gray-600",
    "adapter":         "bg-teal-100 text-teal-700",
    "runtime":         "bg-orange-100 text-orange-700",
    "external":        "bg-rose-100 text-rose-700",
  };
  return (
    <span className={"inline-block px-2 py-0.5 rounded text-[10px] font-semibold " + map[type]}>
      {type}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const map: Record<ConfidenceLevel, string> = {
    "confirmada":     "bg-emerald-100 text-emerald-700",
    "snapshot":       "bg-amber-100 text-amber-700",
    "parcial":        "bg-blue-100 text-blue-700",
    "mock":           "bg-gray-100 text-gray-500",
    "nao-verificavel":"bg-red-100 text-red-600",
  };
  const labels: Record<ConfidenceLevel, string> = {
    "confirmada":     "confirmada",
    "snapshot":       "snapshot",
    "parcial":        "parcial",
    "mock":           "mock",
    "nao-verificavel":"nao-verificavel",
  };
  return (
    <span className={"inline-block px-2 py-0.5 rounded text-[10px] font-semibold " + map[level]}>
      {labels[level]}
    </span>
  );
}

function ValidationBadge({ v }: { v: LayerValidationStatus }) {
  const map: Record<LayerValidationStatus, { label: string; cls: string }> = {
    "proven_with_real_data":  { label: "validado c/ dados reais", cls: "bg-emerald-100 text-emerald-700" },
    "staging_functional":     { label: "staging-ok",             cls: "bg-blue-100 text-blue-700"    },
    "depends_on_real_pdfs":   { label: "requer PDF real",        cls: "bg-amber-100 text-amber-700"  },
    "not_validated":          { label: "nao validado",           cls: "bg-red-100 text-red-600"      },
    "not_verifiable_by_repo": { label: "nao verificavel",        cls: "bg-gray-100 text-gray-500"    },
  };
  const b = map[v];
  return <span className={"inline-block px-2 py-0.5 rounded text-[10px] font-semibold " + b.cls}>{b.label}</span>;
}

function ProductionBadge({ p }: { p: LayerProductionStatus }) {
  const map: Record<LayerProductionStatus, { label: string; cls: string }> = {
    "production_ready":       { label: "producao",       cls: "bg-emerald-100 text-emerald-700" },
    "local_only":             { label: "apenas local",   cls: "bg-red-100 text-red-600"      },
    "requires_infra_upgrade": { label: "requer infra",   cls: "bg-orange-100 text-orange-700" },
    "staging_only":           { label: "staging",        cls: "bg-amber-100 text-amber-700"  },
  };
  const b = map[p];
  return <span className={"inline-block px-2 py-0.5 rounded text-[10px] font-semibold " + b.cls}>{b.label}</span>;
}

function PriorityBadge({ p }: { p: ActionItem["priority"] }) {
  const map: Record<ActionItem["priority"], string> = {
    "critico": "bg-red-100 text-red-700",
    "alto":    "bg-orange-100 text-orange-700",
    "medio":   "bg-amber-100 text-amber-700",
    "baixo":   "bg-gray-100 text-gray-500",
  };
  return <span className={"inline-block px-2 py-0.5 rounded text-[10px] font-semibold " + map[p]}>{p.toUpperCase()}</span>;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AwqDataPage() {
  // ── Real data from canonical infrastructure ──────────────────────────────
  const docs   = await getAllDocuments();
  const txns   = await getAllTransactions();
  const q      = await buildFinancialQuery();

  const doneDocs      = docs.filter((d) => d.status === "done");
  const errorDocs     = docs.filter((d) => d.status === "error");
  const processingDocs= docs.filter((d) => !["done","error"].includes(d.status));
  const ambiguousTxns = txns.filter((t) => t.classificationConfidence === "ambiguous" || t.classificationConfidence === "unclassifiable");
  const confirmedTxns = txns.filter((t) => t.classificationConfidence === "confirmed");
  const lastDoc       = docs.length > 0
    ? docs.slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]
    : null;

  // ── Route consumption map (from real platform-registry) ──────────────────
  const activeRoutes = PLATFORM_ROUTES.filter((r) => r.inSidebar && r.status !== "redirect");
  const snapshotRoutes = activeRoutes.filter(
    (r) => r.dataSource.includes("awq-group-data") || r.dataSource.includes("data.ts") || r.dataSource.includes("caza-data"),
  );
  const pipelineRoutes = activeRoutes.filter(
    (r) => r.dataSource.includes("financial-query") || r.dataSource.includes("financial-db") || r.dataSource.includes("financial/"),
  );
  const externalRoutes = activeRoutes.filter(
    (r) => r.dataSource.includes("Notion") || r.dataSource.includes("localStorage"),
  );

  return (
    <>
      <Header
        title="Base de Dados — AWQ Group"
        subtitle="Gestao, auditoria e governanca da camada de storage / source of truth / data layer"
      />
      <div className="page-container">

        {/* ── 5.1 Executive Header ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-gray-500">Documentos Ingeridos</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{docs.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">
              {doneDocs.length} concluidos · {processingDocs.length} processando · {errorDocs.length} erro
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-gray-500">Transacoes Classificadas</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{txns.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">
              {confirmedTxns.length} confirmadas · {ambiguousTxns.length} ambiguas
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-xs font-semibold text-gray-500">Dashboards em Snapshot</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{snapshotRoutes.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">
              de {activeRoutes.length} rotas ativas · {pipelineRoutes.length} no pipeline
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className={q.hasData ? "text-emerald-600" : "text-amber-600"} />
              <span className="text-xs font-semibold text-gray-500">Pipeline Status</span>
            </div>
            <div className={"text-sm font-bold " + (q.hasData ? "text-emerald-600" : "text-amber-600")}>
              {q.hasData ? "COM DADOS" : "AGUARDANDO EXTRATO"}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              {lastDoc ? "Ultimo: " + lastDoc.bank + " " + lastDoc.uploadedAt.slice(0,10) : "Nenhum extrato ingerido"}
            </div>
          </div>
        </div>

        {/* ── Assessment banner ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                {INGEST_SUMMARY.overallAssessment}
              </p>
              <p className="text-[11px] text-amber-600 mt-1">
                {INGEST_SUMMARY.implementedLayers}/{INGEST_SUMMARY.totalLayers} camadas implementadas
                · {INGEST_SUMMARY.stagingFunctional} staging-ok
                · {INGEST_SUMMARY.provenWithRealData} validadas com dados reais
                · {INGEST_SUMMARY.requiresRealPDFs} requerem PDF real
              </p>
            </div>
          </div>
        </div>

        {/* ── 5.2 Storage por Categoria do Sidebar ─────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Storage por Categoria — Sidebar</h2>
            <span className="ml-auto text-[10px] text-gray-400">{BU_STORAGE_MAP.length} BUs catalogadas</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {BU_STORAGE_MAP.map((bu) => {
              const buRoutes = activeRoutes.filter((r) => r.bu === bu.id);
              const sidebarCount = buRoutes.filter((r) => r.inSidebar).length;
              const activeCount  = buRoutes.filter((r) => r.status === "active").length;
              return (
                <div key={bu.id} className={"rounded-lg border p-4 " + bu.borderCls + " " + bu.bgCls}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className={"text-xs font-bold " + bu.textCls}>{bu.label}</div>
                      <div className="text-[9px] text-gray-500 mt-0.5">{bu.sublabel}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={bu.badgeCls + " text-[9px] font-semibold px-1.5 py-0.5 rounded"}>
                        {sidebarCount} sidebar
                      </span>
                      <span className="text-[9px] text-gray-400">{activeCount} ativos</span>
                    </div>
                  </div>
                  {/* Storage backends */}
                  <div className="space-y-1 mb-3">
                    {bu.primaryStorage.map((s) => (
                      <div key={s.name} className="flex items-start gap-1.5">
                        <TypeBadge type={s.type} />
                        <span className="text-[9px] text-gray-600 leading-tight flex-1">{s.name}</span>
                        <ConfidenceBadge level={s.confidence} />
                      </div>
                    ))}
                  </div>
                  {/* Security layer */}
                  <div className="rounded bg-white/60 border border-gray-200 px-2 py-1 text-[9px] text-gray-500">
                    <span className="font-semibold">layer:</span> {bu.securityLayer}
                  </div>
                  {/* Sidebar items (compact) */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {bu.sidebarSections.slice(0, 8).map((s) => (
                      <span key={s} className="text-[8px] bg-white/70 border border-gray-200 px-1 py-0.5 rounded text-gray-500">{s}</span>
                    ))}
                    {bu.sidebarSections.length > 8 && (
                      <span className="text-[8px] text-gray-400">+{bu.sidebarSections.length - 8} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 5.3 Storage / Persistence Panel ─────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Storage / Persistencia</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-bold text-emerald-800 mb-2">Store Canonica (Pipeline)</div>
              <div className="space-y-1 text-[11px] text-emerald-700">
                <div><code>public/data/financial/documents.json</code></div>
                <div><code>public/data/financial/transactions.json</code></div>
                <div><code>public/data/financial/pdfs/</code></div>
              </div>
              <div className="mt-3 rounded bg-red-100 px-2 py-1 text-[10px] text-red-700 font-medium">
                ATENCAO: efemero no Vercel serverless. Requer Vercel Blob/Neon para producao.
              </div>
              <div className="mt-2 text-[10px] text-emerald-600">
                {docs.length === 0 ? "Vazio — nenhum extrato ingerido" : docs.length + " documentos · " + txns.length + " transacoes"}
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-bold text-amber-800 mb-2">TypeScript Hardcoded (Snapshots)</div>
              <div className="space-y-1 text-[11px] text-amber-700">
                <div><code>lib/awq-group-data.ts</code> — AWQ Group</div>
                <div><code>lib/data.ts</code> — JACQES</div>
                <div><code>lib/caza-data.ts</code> — Caza Vision</div>
                <div><code>public/data/venture-sales.json</code> — Venture</div>
              </div>
              <div className="mt-3 text-[10px] text-amber-600">
                Fonte primaria atual de {snapshotRoutes.length} rotas. Estatico, bundled, Q1 2026.
                Pendente substituicao pelo pipeline apos ingestao real.
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold text-gray-700 mb-2">Runtime / Externo</div>
              <div className="space-y-1 text-[11px] text-gray-600">
                <div><code>localStorage</code> — saldos /awq/bank (client-side)</div>
                <div><code>Notion API</code> — projetos Caza, vendas Venture</div>
                <div><code>next-auth session</code> — auth em memoria</div>
              </div>
              <div className="mt-3 text-[10px] text-gray-500">
                Nao persistido no servidor. Nao verificavel pelo repositorio.
                Integracoes externas com fallback para JSON local.
              </div>
            </div>
          </div>
        </div>

        {/* ── 5.3b Storage Limits ─────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Limites de Storage — Plataforma</h2>
            <span className="ml-auto text-[10px] text-gray-400">infraestrutura atual</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Neon Postgres */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Database size={12} className="text-blue-600" />
                <div className="text-xs font-bold text-blue-800">Neon Postgres</div>
                <span className="ml-auto text-[9px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Free Tier</span>
              </div>
              <div className="space-y-1.5 text-[10px] text-blue-700">
                <div className="flex justify-between"><span>Storage total</span><span className="font-semibold">512 MB</span></div>
                <div className="flex justify-between"><span>Projetos</span><span className="font-semibold">1</span></div>
                <div className="flex justify-between"><span>Branches</span><span className="font-semibold">10</span></div>
                <div className="flex justify-between"><span>Compute</span><span className="font-semibold">0.25 vCPU / 1 GB RAM</span></div>
                <div className="flex justify-between"><span>Conexões</span><span className="font-semibold">100 concurrent</span></div>
                <div className="flex justify-between"><span>Compute hours</span><span className="font-semibold">191 h/mês</span></div>
              </div>
              <div className="mt-3 text-[9px] text-blue-500">
                Tabelas: financial_documents · bank_transactions · awq_security_audit_log · caza_*
              </div>
            </div>
            {/* Google Drive */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <HardDrive size={12} className="text-emerald-600" />
                <div className="text-xs font-bold text-emerald-800">Google Drive</div>
                <span className="ml-auto text-[9px] bg-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">Priority 1</span>
              </div>
              <div className="space-y-1.5 text-[10px] text-emerald-700">
                <div className="flex justify-between"><span>Pasta raiz</span><span className="font-semibold font-mono text-[9px]">AWQ PLATAFORM GROUP</span></div>
                <div className="flex justify-between"><span>Conta</span><span className="font-semibold text-[9px]">eqoa@ultrapack.cloud</span></div>
                <div className="flex justify-between"><span>Storage</span><span className="font-semibold">10 TB (Workspace)</span></div>
                <div className="flex justify-between"><span>Upload PDFs (config)</span><span className="font-semibold text-orange-600">20 MB (interno)</span></div>
                <div className="flex justify-between"><span>Auth</span><span className="font-semibold">Service Account</span></div>
                <div className="flex justify-between"><span>blobUrl</span><span className="font-semibold font-mono text-[9px]">gdrive://&#123;fileId&#125;</span></div>
              </div>
              <div className="mt-3 text-[9px] text-emerald-600">
                PDFs Financeiros · Extratos Bancários · Segurança &amp; Auditoria · Dados &amp; Infra
              </div>
            </div>
            {/* Vercel Blob */}
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Server size={12} className="text-violet-600" />
                <div className="text-xs font-bold text-violet-800">Vercel Blob</div>
                <span className="ml-auto text-[9px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded font-semibold">Priority 2</span>
              </div>
              <div className="space-y-1.5 text-[10px] text-violet-700">
                <div className="flex justify-between"><span>Storage total</span><span className="font-semibold">512 MB</span></div>
                <div className="flex justify-between"><span>Banda/mês</span><span className="font-semibold">100 GB</span></div>
                <div className="flex justify-between"><span>Arquivo máx.</span><span className="font-semibold">500 MB por arquivo</span></div>
                <div className="flex justify-between"><span>Upload PDFs (config)</span><span className="font-semibold text-orange-600">20 MB (interno)</span></div>
              </div>
              <div className="mt-3 text-[9px] text-violet-500">
                Fallback do Drive. Se nem Drive nem Blob: filesystem local (efêmero, dev)
              </div>
            </div>
            {/* Vercel Functions */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Activity size={12} className="text-gray-600" />
                <div className="text-xs font-bold text-gray-700">Vercel Functions</div>
                <span className="ml-auto text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-semibold">Hobby</span>
              </div>
              <div className="space-y-1.5 text-[10px] text-gray-600">
                <div className="flex justify-between"><span>Memória</span><span className="font-semibold">1024 MB</span></div>
                <div className="flex justify-between"><span>Timeout</span><span className="font-semibold text-orange-600">15 s (hobby)</span></div>
                <div className="flex justify-between"><span>Body size (default)</span><span className="font-semibold">4.5 MB</span></div>
                <div className="flex justify-between"><span>Filesystem /tmp</span><span className="font-semibold text-red-500">efêmero</span></div>
                <div className="flex justify-between"><span>Invocações/mês</span><span className="font-semibold">100 k</span></div>
                <div className="flex justify-between"><span>SSE streaming</span><span className="font-semibold text-emerald-600">suportado</span></div>
              </div>
              <div className="mt-3 text-[9px] text-gray-400">
                Ingestão: /api/ingest/upload + /api/ingest/process (SSE)
              </div>
            </div>
            {/* Audit / In-memory */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ShieldCheck size={12} className="text-amber-600" />
                <div className="text-xs font-bold text-amber-800">Audit Log</div>
                <span className="ml-auto text-[9px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Híbrido</span>
              </div>
              <div className="space-y-1.5 text-[10px] text-amber-700">
                <div className="flex justify-between"><span>Primário</span><span className="font-semibold">Neon Postgres</span></div>
                <div className="flex justify-between"><span>Fallback</span><span className="font-semibold">in-memory</span></div>
                <div className="flex justify-between"><span>In-memory (max)</span><span className="font-semibold text-orange-600">100 eventos</span></div>
                <div className="flex justify-between"><span>In-memory reset</span><span className="font-semibold text-red-500">cold start</span></div>
                <div className="flex justify-between"><span>PII no log</span><span className="font-semibold text-emerald-600">jamais</span></div>
                <div className="flex justify-between"><span>Campos</span><span className="font-semibold">user_id (email)</span></div>
              </div>
              <div className="mt-3 text-[9px] text-amber-500">
                Tabela: awq_security_audit_log · índices: timestamp, result
              </div>
            </div>
          </div>
          {/* Storage usage bar (visual only, static reference) */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-[10px] font-semibold text-gray-700 mb-2">Referência de Limites — Tier Atual vs. Pro</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px]">
              <div>
                <div className="flex justify-between mb-0.5 text-gray-600"><span>Neon DB: docs + txns</span><span className="font-semibold">→ 512 MB free</span></div>
                <div className="h-1.5 rounded-full bg-gray-200"><div className="h-1.5 rounded-full bg-blue-400" style={{width: docs.length > 0 ? "15%" : "2%"}} /></div>
                <div className="text-[9px] text-gray-400 mt-0.5">{docs.length} docs · {txns.length} txns armazenados</div>
              </div>
              <div>
                <div className="flex justify-between mb-0.5 text-gray-600"><span>Vercel Blob (PDFs)</span><span className="font-semibold">→ 512 MB free</span></div>
                <div className="h-1.5 rounded-full bg-gray-200"><div className="h-1.5 rounded-full bg-violet-400" style={{width: docs.length > 0 ? "10%" : "1%"}} /></div>
                <div className="text-[9px] text-gray-400 mt-0.5">PDFs até 20 MB cada · dedup SHA-256</div>
              </div>
              <div>
                <div className="flex justify-between mb-0.5 text-gray-600"><span>Audit Log (Neon)</span><span className="font-semibold">→ incluso no DB</span></div>
                <div className="h-1.5 rounded-full bg-gray-200"><div className="h-1.5 rounded-full bg-amber-400" style={{width: "5%"}} /></div>
                <div className="text-[9px] text-gray-400 mt-0.5">in-memory fallback: 100 eventos (cold start)</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5.4 Consumer Map ─────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Mapa de Consumo — Paginas vs. Fonte</h2>
            <span className="ml-auto text-[10px] text-gray-400">{activeRoutes.length} rotas no sidebar</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="text-xs font-bold text-amber-800 mb-1">Em Snapshot ({snapshotRoutes.length} rotas)</div>
              <div className="space-y-0.5">
                {snapshotRoutes.slice(0, 8).map((r) => (
                  <div key={r.href} className="text-[10px] text-amber-700 font-mono">{r.href}</div>
                ))}
                {snapshotRoutes.length > 8 && (
                  <div className="text-[10px] text-amber-500">+{snapshotRoutes.length - 8} mais</div>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-xs font-bold text-emerald-800 mb-1">No Pipeline ({pipelineRoutes.length} rotas)</div>
              <div className="space-y-0.5">
                {pipelineRoutes.map((r) => (
                  <div key={r.href} className="text-[10px] text-emerald-700 font-mono">{r.href}</div>
                ))}
                {pipelineRoutes.length === 0 && (
                  <div className="text-[10px] text-emerald-600">Aguardando migracoes (A2/A3)</div>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-bold text-gray-700 mb-1">Runtime / Externo ({externalRoutes.length} rotas)</div>
              <div className="space-y-0.5">
                {externalRoutes.map((r) => (
                  <div key={r.href} className="text-[10px] text-gray-600 font-mono">{r.href}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-400">
            Fonte: <code>lib/platform-registry.ts</code> (PLATFORM_ROUTES.dataSource).
            Dados em tempo de compilacao — reflete o estado atual do registry.
          </div>
        </div>

        {/* ── 5.5 Financial Data Infrastructure Map ───────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Infraestrutura Financeira — Pipeline de Ingestao</h2>
            <span className="ml-auto text-[10px] text-gray-400">
              {INGEST_SUMMARY.implementedLayers}/{INGEST_SUMMARY.totalLayers} camadas
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Camada</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Impl.</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Validacao</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Producao</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500 hidden lg:table-cell">Notas</th>
                </tr>
              </thead>
              <tbody>
                {INGEST_LAYER_STATUS.map((layer) => (
                  <tr key={layer.name} className="border-b border-gray-100 hover:bg-gray-50/60">
                    <td className="py-2 px-2">
                      <div className="font-medium text-gray-800">{layer.name}</div>
                      <div className="text-[9px] text-gray-400 font-mono">{layer.files[0]}</div>
                    </td>
                    <td className="py-2 px-2">
                      {layer.implementation === "implemented"
                        ? <CheckCircle2 size={13} className="text-emerald-500" />
                        : <XCircle size={13} className="text-red-400" />}
                    </td>
                    <td className="py-2 px-2"><ValidationBadge v={layer.validation} /></td>
                    <td className="py-2 px-2"><ProductionBadge p={layer.production} /></td>
                    <td className="py-2 px-2 text-gray-500 hidden lg:table-cell max-w-xs text-[10px]">{layer.notes.slice(0, 100)}{layer.notes.length > 100 ? "..." : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[10px] text-gray-400">
            Fonte: <code>lib/financial-ingest-status.ts</code> (INGEST_LAYER_STATUS).
            Estado real sem inferencia. Cada camada classificada em implementacao + validacao + producao.
          </div>
        </div>

        {/* ── 5.6 Governance / Reliability Layer ──────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Governanca / Confiabilidade</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Confirmada",      cls: "bg-emerald-50 border-emerald-200 text-emerald-700", sources: DATA_SOURCES.filter(s => s.confidence === "confirmada").map(s => s.name) },
              { label: "Snapshot",        cls: "bg-amber-50 border-amber-200 text-amber-700",     sources: DATA_SOURCES.filter(s => s.confidence === "snapshot").map(s => s.name) },
              { label: "Parcial",         cls: "bg-blue-50 border-blue-200 text-blue-700",        sources: DATA_SOURCES.filter(s => s.confidence === "parcial").map(s => s.name) },
              { label: "Mock",            cls: "bg-gray-50 border-gray-200 text-gray-500",        sources: DATA_SOURCES.filter(s => s.confidence === "mock").map(s => s.name) },
              { label: "Nao Verificavel", cls: "bg-red-50 border-red-200 text-red-600",           sources: DATA_SOURCES.filter(s => s.confidence === "nao-verificavel").map(s => s.name) },
              { label: "Derivado",        cls: "bg-violet-50 border-violet-200 text-violet-700",  sources: DATA_SOURCES.filter(s => s.type === "selector" || s.type === "adapter").map(s => s.name) },
            ].map((cat) => (
              <div key={cat.label} className={"rounded-lg border p-3 " + cat.cls}>
                <div className="text-[10px] font-bold mb-2">{cat.label}</div>
                <div className="text-[9px] font-semibold mb-1">{cat.sources.length} fontes</div>
                {cat.sources.map((s) => (
                  <div key={s} className="text-[9px] font-mono opacity-80 truncate">{s}</div>
                ))}
                {cat.sources.length === 0 && <div className="text-[9px] opacity-60">nenhuma</div>}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-[10px] font-semibold text-gray-700 mb-1">Classificacao das camadas do pipeline financeiro</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              <div><span className="font-semibold text-emerald-600">{INGEST_SUMMARY.provenWithRealData}</span> <span className="text-gray-500">validadas com dados reais</span></div>
              <div><span className="font-semibold text-blue-600">{INGEST_SUMMARY.stagingFunctional}</span> <span className="text-gray-500">staging-funcionais</span></div>
              <div><span className="font-semibold text-amber-600">{INGEST_SUMMARY.requiresRealPDFs}</span> <span className="text-gray-500">requerem PDF real</span></div>
              <div><span className="font-semibold text-gray-500">{INGEST_SUMMARY.productionReady}</span> <span className="text-gray-500">prontas para producao</span></div>
            </div>
            <div className="mt-2 text-[10px] text-red-600 font-medium">
              {INGEST_SUMMARY.dashboardsStillOnSnapshot
                ? "Dashboards ainda em snapshot — migracao pendente (ver fila de acoes abaixo)."
                : "Dashboards migrando para pipeline."}
            </div>
          </div>
        </div>

        {/* ── 5.6b Segurança do Storage — resumo (painel completo em /awq/security) */}
        {(() => {
          const storageApis = SENSITIVE_APIS.filter((a) =>
            a.layer === "dados_infra" || a.layer === "financeiro" || a.layer === "security"
          );
          const storageRoutes = SENSITIVE_ROUTES.filter((r) =>
            r.layer === "dados_infra" || r.layer === "financeiro" || r.layer === "security"
          );
          const canonicalRoles: SecurityRole[] = ["owner", "admin", "finance", "operator", "viewer"];
          const storageLayers = ["financeiro", "dados_infra", "security"] as const;

          return (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={15} className="text-gray-700" />
                <h2 className="text-sm font-semibold text-gray-900">Segurança do Storage</h2>
                <span className={"ml-auto text-[10px] px-2 py-0.5 rounded font-semibold " +
                  (SECURITY_ENFORCEMENT_MODE === "full" ? "bg-emerald-100 text-emerald-700" :
                   SECURITY_ENFORCEMENT_MODE === "api_guarded" ? "bg-amber-100 text-amber-700" :
                   "bg-red-100 text-red-600")}>
                  modo: {SECURITY_ENFORCEMENT_MODE}
                </span>
                <Link href="/awq/security" className="text-[10px] text-blue-600 underline hover:text-blue-800 ml-2">
                  painel completo →
                </Link>
              </div>
              <p className="text-[11px] text-gray-500 mb-4">
                Resumo dos controles de acesso aplicados às camadas de storage desta plataforma.
                RBAC matrix, audit log completo e rotas sensíveis de todas as camadas estão em{" "}
                <Link href="/awq/security" className="underline text-blue-600">/awq/security</Link>.
              </p>

              {/* Permissões RBAC — apenas camadas de storage */}
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <KeyRound size={11} className="text-gray-500" /> Acesso por Role — Camadas de Storage
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left py-1.5 px-2 font-semibold text-gray-600 border-b border-gray-200">Camada</th>
                        {canonicalRoles.map((r) => (
                          <th key={r} className="py-1.5 px-2 font-semibold text-gray-600 border-b border-gray-200 text-center">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {storageLayers.map((layer, i) => (
                        <tr key={layer} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="py-1.5 px-2 font-mono text-[9px] text-gray-700 border-r border-gray-100">{layer}</td>
                          {canonicalRoles.map((role) => {
                            const actions = PERMISSION_MATRIX[role]?.[layer] ?? [];
                            return (
                              <td key={role} className="py-1.5 px-1 text-center">
                                {actions.length === 0
                                  ? <XCircle size={11} className="inline text-gray-300" />
                                  : actions.length >= 8
                                  ? <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">full</span>
                                  : <span className="text-[8px] text-blue-600 bg-blue-50 px-1 rounded font-medium" title={actions.join(", ")}>{actions.join(", ")}</span>
                                }
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* APIs de storage guardadas */}
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Lock size={11} className="text-gray-500" /> APIs de Storage Guardadas ({storageApis.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {storageApis.map((api) => (
                    <div key={api.pattern} className="rounded border border-gray-200 bg-gray-50/60 p-2 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5" />
                      <div>
                        <code className="text-[9px] font-mono text-gray-800">{api.pattern}</code>
                        <div className="text-[9px] text-gray-500">{api.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rotas sensíveis de storage/financeiro */}
              <div>
                <div className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <ShieldAlert size={11} className="text-gray-500" /> Rotas de Storage & Financeiro ({storageRoutes.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {storageRoutes.map((route) => (
                    <span key={route.path} className={"inline-flex items-center gap-1 px-2 py-1 rounded border text-[9px] font-mono " +
                      (route.sensitivity === "high" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
                      <span className={"inline-block w-1 h-1 rounded-full " + (route.sensitivity === "high" ? "bg-red-400" : "bg-amber-400")} />
                      {route.path}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-[9px] text-gray-400">
                  Enforcement: <code>lib/security-guard.ts</code> + <code>lib/api-guard.ts</code> ·
                  Registry: <code>lib/security-registry.ts</code> ·{" "}
                  <Link href="/awq/security" className="underline hover:text-gray-600">Ver painel completo com audit log →</Link>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 5.7 Action Queue / Consolidation Backlog ────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Fila de Acoes — Consolidacao Pendente</h2>
            <span className="ml-auto text-[10px] text-gray-400">{ACTION_QUEUE.length} items</span>
          </div>
          <div className="space-y-3">
            {ACTION_QUEUE.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-gray-400 font-mono mt-0.5 shrink-0">{item.id}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <PriorityBadge p={item.priority} />
                      <span className="text-xs font-semibold text-gray-800">{item.title}</span>
                      <span className="ml-auto text-[10px] text-gray-400">{item.owner}</span>
                    </div>
                    <p className="text-[11px] text-gray-600">{item.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      <span className="font-semibold">Impacto:</span> {item.impact}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5.8 Snapshot Migration Map ──────────────────────────────────── */}
        {(() => {
          const migration = getSnapshotMigrationStatus();
          return (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={15} className="text-amber-600" />
                <h2 className="text-sm font-semibold text-gray-900">Mapa de Migracao de Snapshots</h2>
                <span className="ml-auto text-[10px] text-gray-400">{migration.totalSources} fontes · {migration.totalConsumers} paginas consumidoras</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-4">
                Toda fonte de dados snapshot esta registrada aqui. Este e o firewall contra proliferacao de novos hardcodes.
                Nenhum novo array financeiro pode ser adicionado sem entrada neste registro.
              </p>
              <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                {[
                  { label: "Ativas",             v: migration.activeSources,   cls: "bg-amber-50 text-amber-700 border-amber-200" },
                  { label: "Migracao pendente",   v: migration.pendingSources,  cls: "bg-blue-50 text-blue-700 border-blue-200"   },
                  { label: "Substituidas",         v: migration.replacedSources, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                  { label: "Bloqueadas",           v: migration.blockedSources,  cls: "bg-red-50 text-red-700 border-red-200"     },
                ].map((s) => (
                  <div key={s.label} className={"rounded-lg border p-3 " + s.cls}>
                    <div className="text-xl font-bold">{s.v}</div>
                    <div className="text-[10px] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {SNAPSHOT_REGISTRY.map((src) => (
                  <div key={src.file} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <code className="text-[10px] font-mono font-semibold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">{src.file}</code>
                      <span className={"inline-block px-2 py-0.5 rounded text-[9px] font-bold " +
                        (src.status === "active" ? "bg-amber-200 text-amber-800" :
                         src.status === "migration-pending" ? "bg-blue-100 text-blue-700" :
                         src.status === "replaced" ? "bg-emerald-100 text-emerald-700" :
                         "bg-red-100 text-red-700")}>
                        {src.status}
                      </span>
                      <span className="text-[10px] text-gray-500">{src.period}</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mb-1">{src.scope}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {src.consumers.map((c) => (
                        <code key={c} className="text-[9px] font-mono bg-white border border-amber-100 px-1 py-0.5 rounded text-gray-500">{c}</code>
                      ))}
                    </div>
                    {src.migratesTo && (
                      <p className="text-[10px] text-blue-600">
                        <span className="font-semibold">Migra para:</span> {src.migratesTo}
                      </p>
                    )}
                    {src.migrationBlocker && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        <span className="font-semibold">Bloqueio:</span> {src.migrationBlocker}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><Database size={10} /> Rota: <code>/awq/data</code></span>
            <span className="flex items-center gap-1"><Layers size={10} /> Registry: <code>lib/platform-registry.ts</code></span>
            <span className="flex items-center gap-1"><Server size={10} /> Pipeline: <code>lib/financial-ingest-status.ts</code></span>
            <span className="flex items-center gap-1"><Shield size={10} /> Store: <code>lib/financial-db.ts</code></span>
            <span className="ml-auto flex items-center gap-1">
              <ArrowRight size={10} />
              <Link href="/awq/conciliacao" className="underline hover:text-gray-700">Ingestao</Link>
              <span className="mx-1">·</span>
              <Link href="/awq/financial" className="underline hover:text-gray-700">Financial</Link>
              <span className="mx-1">·</span>
              <Link href="/awq/investments" className="underline hover:text-gray-700">Investimentos</Link>
              <span className="mx-1">·</span>
              <Link href="/awq/security" className="underline hover:text-gray-700">Seguranca</Link>
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
