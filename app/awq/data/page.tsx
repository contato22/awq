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
  Package, ArrowRight, Eye, EyeOff,
} from "lucide-react";
import { getAllDocuments, getAllTransactions } from "@/lib/financial-db";
import { buildFinancialQuery, ENTITY_LABELS } from "@/lib/financial-query";
import {
  INGEST_LAYER_STATUS, INGEST_SUMMARY,
  type LayerValidationStatus, type LayerProductionStatus,
} from "@/lib/financial-ingest-status";
import { PLATFORM_ROUTES } from "@/lib/platform-registry";
import { SNAPSHOT_REGISTRY, getSnapshotMigrationStatus } from "@/lib/snapshot-registry";

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

// ─── Architectural catalog (describes repo structure — static metadata) ───────

const DATA_SOURCES: DataSourceEntry[] = [
  { name: "platform-registry.ts",       path: "lib/platform-registry.ts",            type: "registry",        scope: "Plataforma",           description: "154 rotas canônicas. Single source of truth para sidebar, routing e nav.",                                         isConsumed: true,  isInternal: true,  confidence: "confirmada",      pagesUsing: -1 },
  { name: "awq-group-data.ts",           path: "lib/awq-group-data.ts",               type: "snapshot",        scope: "AWQ Group",            description: "KPIs consolidados Q1 2026 (4 BUs). Fonte primária de 8+ páginas AWQ.",                                              isConsumed: true,  isInternal: true,  confidence: "snapshot",        pagesUsing: 8  },
  { name: "data.ts",                     path: "lib/data.ts",                          type: "snapshot",        scope: "JACQES",               description: "KPIs e dados operacionais JACQES Q1 2026. Fonte primária de /jacqes/*.",                                            isConsumed: true,  isInternal: true,  confidence: "snapshot",        pagesUsing: 9  },
  { name: "caza-data.ts",                path: "lib/caza-data.ts",                     type: "snapshot",        scope: "Caza Vision / Advisor", description: "Dados de projetos e clientes Caza Vision. Usada também pelo Advisor.",                                             isConsumed: true,  isInternal: true,  confidence: "snapshot",        pagesUsing: 5  },
  { name: "public/data/financial/",      path: "public/data/financial/{docs,txns}.json",type: "canonical-store", scope: "Financeiro",           description: "Store canônica do pipeline de ingestão. Vazio sem extrato real. Efêmero no Vercel.",                               isConsumed: false, isInternal: true,  confidence: "nao-verificavel", pagesUsing: 0  },
  { name: "financial-query.ts",          path: "lib/financial-query.ts",               type: "selector",        scope: "Financeiro",           description: "Seletor canônico sobre financial-db. Único caminho autorizado para leitura real. 4 páginas.",                       isConsumed: true,  isInternal: true,  confidence: "confirmada",      pagesUsing: 4  },
  { name: "agents-config.ts",            path: "lib/agents-config.ts",                 type: "config",          scope: "AI / Agents",          description: "4 agentes autônomos (JACQES, Caza, Venture, Advisor). System prompts e tools.",                                    isConsumed: true,  isInternal: true,  confidence: "confirmada",      pagesUsing: 1  },
  { name: "auth-users.ts",               path: "lib/auth-users.ts",                    type: "config",          scope: "Sistema",              description: "4 usuários hardcoded. Roles definidos mas RBAC não enforced no middleware.",                                          isConsumed: true,  isInternal: true,  confidence: "confirmada",      pagesUsing: 1  },
  { name: "venture-sales.json",          path: "public/data/venture-sales.json",        type: "snapshot",        scope: "AWQ Venture",          description: "Pipeline de vendas Venture Q1 2026. Servido via notion-fetch.ts com fallback.",                                    isConsumed: true,  isInternal: true,  confidence: "snapshot",        pagesUsing: 1  },
  { name: "Notion API",                  path: "lib/notion-fetch.ts → /api/notion",     type: "external",        scope: "Caza / Venture",       description: "Dados ao vivo de projetos e vendas. Fallback para JSON local quando offline.",                                     isConsumed: true,  isInternal: false, confidence: "parcial",         pagesUsing: 3  },
  { name: "localStorage (browser)",      path: "app/awq/bank/page.tsx",                 type: "runtime",         scope: "Contas Banco",         description: "Saldos manuais em /awq/bank. Client-side apenas. Não persistido no servidor.",                                     isConsumed: true,  isInternal: false, confidence: "nao-verificavel", pagesUsing: 1  },
];

const ACTION_QUEUE: ActionItem[] = [
  { id: "A1", priority: "critico", title: "Persistent storage (Vercel Blob / Neon)",         description: "public/data/financial/ é efêmero em Vercel serverless. PDFs e JSON perdem entre cold starts. Bloqueia produção.",                                                             owner: "Infra",       impact: "Pipeline inutilizável em produção sem isso." },
  { id: "A2", priority: "alto",    title: "Ingerir extratos reais (Cora + Itaú)",            description: "Nenhum PDF real processado ainda. Sem dados reais o pipeline nunca pode ser validado. Ir em /awq/ingest e fazer upload.",                                                     owner: "Operação",    impact: "Todos os dashboards com financial-query passam a ter dados reais." },
  { id: "A3", priority: "alto",    title: "Ingerir extratos e validar pipeline end-to-end",  description: "awq/financial, awq/cashflow, awq/kpis, awq/portfolio, awq/risk já consomem financial-query. Budget/forecast/allocations são accrual — ficam em snapshot com aviso. Próximo gate: ingerir PDF real em /awq/ingest.",                                                                          owner: "Operação",    impact: "Valida toda a cadeia de ingestão com dados reais." },
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
  const docs   = getAllDocuments();
  const txns   = getAllTransactions();
  const q      = buildFinancialQuery();

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

        {/* ── 5.2 Data Source Overview ─────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Fontes de Dados da Plataforma</h2>
            <span className="ml-auto text-[10px] text-gray-400">{DATA_SOURCES.length} fontes catalogadas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Fonte</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Tipo</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Escopo</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500 hidden md:table-cell">Descricao</th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-500">Consumida</th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-500">Confianca</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SOURCES.map((src) => (
                  <tr key={src.name} className="border-b border-gray-100 hover:bg-gray-50/60">
                    <td className="py-2 px-2">
                      <code className="text-[10px] text-gray-700 font-mono">{src.name}</code>
                      <div className="text-[9px] text-gray-400">{src.isInternal ? "interno" : "externo"}</div>
                    </td>
                    <td className="py-2 px-2"><TypeBadge type={src.type} /></td>
                    <td className="py-2 px-2 text-gray-600">{src.scope}</td>
                    <td className="py-2 px-2 text-gray-500 hidden md:table-cell max-w-xs">{src.description}</td>
                    <td className="py-2 px-2 text-center">
                      {src.isConsumed
                        ? <CheckCircle2 size={13} className="inline text-emerald-500" />
                        : <EyeOff size={13} className="inline text-red-400" />}
                      {src.pagesUsing > 0 && <span className="ml-1 text-gray-400">{src.pagesUsing}p</span>}
                      {src.pagesUsing === -1 && <span className="ml-1 text-gray-400">todas</span>}
                    </td>
                    <td className="py-2 px-2 text-center"><ConfidenceBadge level={src.confidence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <Link href="/awq/ingest" className="underline hover:text-gray-700">Ingestao</Link>
              <span className="mx-1">·</span>
              <Link href="/awq/financial" className="underline hover:text-gray-700">Financial</Link>
              <span className="mx-1">·</span>
              <Link href="/awq/investments" className="underline hover:text-gray-700">Investimentos</Link>
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
