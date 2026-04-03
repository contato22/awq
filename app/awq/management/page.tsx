// ─── /awq/management — Financial Architecture Governance Hub ─────────────────
//
// Server component. Single page that surfaces the full health of the financial
// data architecture:
//   §1  Pipeline status — ingestion, documents, transactions
//   §2  Snapshot migration map — which pages still use planning data
//   §3  Source type coverage — per-page metric provenance matrix
//   §4  Data quality diagnostics — ambiguous, unclassified, coverage gaps
//   §5  Governance rules — what is blocked and why

import Link from "next/link";
import {
  getManagementDiagnostics,
} from "@/lib/financial-metric-query";
import {
  SNAPSHOT_REGISTRY,
  getSnapshotMigrationStatus,
  type SnapshotStatus,
} from "@/lib/snapshot-registry";
import { PLATFORM_ROUTES } from "@/lib/platform-registry";
import {
  KNOWN_ACCOUNTS,
  activeAccounts,
  operatingAccounts,
  investmentAccounts,
  buildAccountCoverageReport,
} from "@/lib/bank-account-registry";
import { getAllDocuments } from "@/lib/financial-db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return Math.round((n / d) * 100) + "%";
}

const STATUS_BADGE: Record<SnapshotStatus, string> = {
  active:             "bg-amber-100 text-amber-700 border border-amber-200",
  "migration-pending":"bg-blue-100 text-blue-700 border border-blue-200",
  replaced:           "bg-emerald-100 text-emerald-700 border border-emerald-200",
  blocked:            "bg-red-100 text-red-700 border border-red-200",
};

const STATUS_LABEL: Record<SnapshotStatus, string> = {
  active:             "ATIVO",
  "migration-pending":"MIGRAÇÃO PENDENTE",
  replaced:           "SUBSTITUÍDO",
  blocked:            "BLOQUEADO",
};

// ─── Section components ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 mt-8 first:mt-0">
      {children}
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, color = "text-gray-900" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs font-medium text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ManagementPage() {
  const diag   = getManagementDiagnostics();
  const snap   = getSnapshotMigrationStatus();
  const awqRoutes = PLATFORM_ROUTES.filter((r) => r.bu === "awq" && r.status === "active");

  // Bank registry coverage
  const doneDocs = getAllDocuments().filter((d) => d.status === "done");
  const accountCoverage = buildAccountCoverageReport(doneDocs);

  // Categorise pages by data regime
  const realPages     = awqRoutes.filter((r) => r.dataSource.startsWith("lib/financial-query"));
  const hybridPages   = awqRoutes.filter((r) =>
    r.dataSource.includes("financial-query") && r.dataSource.includes("snapshot")
  );
  const snapshotPages = awqRoutes.filter((r) =>
    !r.dataSource.includes("financial-query") && r.dataSource.includes("snapshot")
  );
  const systemPages   = awqRoutes.filter((r) =>
    !r.dataSource.includes("financial-query") && !r.dataSource.includes("snapshot")
  );

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Gestão da Base Financeira</h1>
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 border border-gray-200 text-gray-500 uppercase tracking-widest">
            Governança
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Visibilidade completa da arquitetura de dados financeiros — pipeline real, snapshots de planejamento, cobertura e regras de bloqueio.
        </p>
        <div className="flex gap-3 mt-4 flex-wrap">
          <Link href="/awq/ingest" className="text-xs px-3 py-1.5 bg-brand-50 border border-brand-200 text-brand-700 rounded-lg hover:bg-brand-100 transition-colors font-medium">
            → Ingestão
          </Link>
          <Link href="/awq/data" className="text-xs px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            → Base de Dados
          </Link>
          <Link href="/awq/kpis" className="text-xs px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            → KPIs
          </Link>
        </div>
      </div>

      {/* ── §0 Bank Account Registry ──────────────────────────────────────── */}
      <SectionTitle>§0 · Topologia Bancária Canônica</SectionTitle>
      <div className="mb-2 flex gap-4 text-xs text-gray-500">
        <span>{KNOWN_ACCOUNTS.length} contas cadastradas</span>
        <span>·</span>
        <span>{activeAccounts.length} ativas</span>
        <span>·</span>
        <span>{operatingAccounts.length} operacionais</span>
        <span>·</span>
        <span>{investmentAccounts.length} investimento</span>
      </div>
      <div className="space-y-3 mb-6">
        {accountCoverage.map((cov) => {
          const usageLabel: Record<string, string> = {
            operating_cash:    "Caixa Operacional",
            investment_vehicle:"Veículo Investimento",
            payroll:           "Folha",
            tax:               "Tributos",
            shared_multiuse:   "Multiuso",
          };
          const entityColor: Record<string, string> = {
            AWQ_Holding: "text-brand-600 bg-brand-50 border-brand-200",
            JACQES:      "text-violet-700 bg-violet-50 border-violet-200",
            Caza_Vision: "text-emerald-700 bg-emerald-50 border-emerald-200",
            Unknown:     "text-gray-500 bg-gray-100 border-gray-200",
          };
          const covered = cov.hasData;
          return (
            <div key={cov.account.id}
              className={`card p-4 flex items-start gap-4 ${covered ? "" : "border-amber-200 bg-amber-50/30"}`}>
              {/* Coverage indicator */}
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${covered ? "bg-emerald-500" : "bg-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-900">{cov.account.bank}</span>
                  <span className="text-xs text-gray-500">·</span>
                  <span className="text-xs text-gray-700">{cov.account.accountName}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    entityColor[cov.account.entity] ?? "text-gray-500 bg-gray-100 border-gray-200"
                  }`}>
                    {cov.account.entity.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                    {usageLabel[cov.account.usage] ?? cov.account.usage}
                  </span>
                  {cov.account.closedAt && (
                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                      Encerrada {cov.account.closedAt}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mb-1">{cov.account.notes}</div>
                {covered ? (
                  <div className="text-[10px] text-emerald-600 font-medium">
                    ✓ Extrato ingerido · período: {cov.periodStart ?? "?"} → {cov.periodEnd ?? "?"} ·
                    saldo final: {cov.closingBalance != null ? `R$${cov.closingBalance.toLocaleString("pt-BR")}` : "—"}
                  </div>
                ) : (
                  <div className="text-[10px] text-amber-700 font-medium">
                    ⚠ Sem extrato ingerido —{" "}
                    <Link href="/awq/ingest" className="underline">ingerir agora</Link>
                    {" · "}parser esperado: <span className="font-mono">{cov.account.parserFormat}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── §1 Pipeline Status ─────────────────────────────────────────────── */}
      <SectionTitle>§1 · Status do Pipeline Real</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <Card>
          <Stat
            label="Documentos ingeridos"
            value={diag.totalDocumentsIngested}
            color={diag.totalDocumentsIngested > 0 ? "text-gray-900" : "text-red-600"}
          />
        </Card>
        <Card>
          <Stat
            label="Documentos processados"
            value={diag.doneDocuments}
            sub={`${pct(diag.doneDocuments, diag.totalDocumentsIngested)} do total`}
            color={diag.doneDocuments > 0 ? "text-emerald-700" : "text-red-600"}
          />
        </Card>
        <Card>
          <Stat
            label="Documentos com erro"
            value={diag.errorDocuments}
            color={diag.errorDocuments > 0 ? "text-red-600" : "text-emerald-700"}
          />
        </Card>
        <Card>
          <Stat
            label="Transações extraídas"
            value={diag.totalTransactions.toLocaleString("pt-BR")}
            sub={diag.hasRealData ? "pipeline ok" : "aguardando ingestão"}
            color={diag.totalTransactions > 0 ? "text-gray-900" : "text-amber-600"}
          />
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <Stat
            label="Transações confirmadas"
            value={diag.confirmedTransactions.toLocaleString("pt-BR")}
            sub={`${pct(diag.confirmedTransactions, diag.totalTransactions)} do total`}
            color="text-emerald-700"
          />
        </Card>
        <Card>
          <Stat
            label="Transações ambíguas"
            value={diag.ambiguousTransactions.toLocaleString("pt-BR")}
            sub="precisam revisão manual"
            color={diag.ambiguousTransactions > 0 ? "text-amber-600" : "text-emerald-700"}
          />
        </Card>
        <Card className="col-span-2">
          <div className="text-xs font-semibold text-gray-500 mb-2">Lacunas de cobertura</div>
          {diag.coverageGaps.length === 0 ? (
            <div className="text-sm text-emerald-600 font-medium">Sem lacunas detectadas</div>
          ) : (
            <ul className="space-y-1">
              {diag.coverageGaps.map((gap, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">⚠</span>
                  {gap}
                </li>
              ))}
            </ul>
          )}
          {diag.lastUpdated && (
            <div className="text-[10px] text-gray-400 mt-2">
              Última atualização: {diag.lastUpdated}
            </div>
          )}
        </Card>
      </div>

      {/* Pipeline health banner */}
      {!diag.hasRealData ? (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <span className="text-red-500 shrink-0 mt-0.5 text-lg">✕</span>
          <div>
            <div className="text-sm font-semibold text-red-700">Pipeline sem dados reais</div>
            <div className="text-xs text-red-600 mt-0.5">
              Nenhum documento com status=done. Acesse{" "}
              <Link href="/awq/ingest" className="underline font-medium">/awq/ingest</Link>{" "}
              para fazer upload de extratos bancários em PDF. As páginas KPIs, Financial e Risk
              operam com dados de snapshot enquanto o pipeline está vazio.
            </div>
          </div>
        </div>
      ) : diag.pipelineHealthy ? (
        <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <span className="text-emerald-500 shrink-0 mt-0.5 text-lg">✓</span>
          <div>
            <div className="text-sm font-semibold text-emerald-700">Pipeline saudável</div>
            <div className="text-xs text-emerald-600 mt-0.5">
              Todos os documentos processados, sem lacunas de cobertura detectadas.
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <span className="text-amber-500 shrink-0 mt-0.5 text-lg">⚠</span>
          <div>
            <div className="text-sm font-semibold text-amber-700">Pipeline parcialmente saudável</div>
            <div className="text-xs text-amber-600 mt-0.5">
              Dados reais disponíveis mas com lacunas de cobertura. Verifique os detalhes acima.
            </div>
          </div>
        </div>
      )}

      {/* ── §2 Snapshot Migration Map ──────────────────────────────────────── */}
      <SectionTitle>§2 · Mapa de Migração de Snapshots</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <Stat label="Fontes ativas (snapshot)" value={snap.activeSources} color="text-amber-700" />
        </Card>
        <Card>
          <Stat label="Migração pendente" value={snap.pendingSources} color="text-blue-700" />
        </Card>
        <Card>
          <Stat label="Substituídas" value={snap.replacedSources} color="text-emerald-700" />
        </Card>
        <Card>
          <Stat label="Bloqueadas" value={snap.blockedSources} color="text-red-600" />
        </Card>
      </div>

      <div className="space-y-4 mb-6">
        {SNAPSHOT_REGISTRY.map((src, i) => (
          <Card key={i}>
            <div className="flex items-start gap-3 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${STATUS_BADGE[src.status]}`}>
                {STATUS_LABEL[src.status]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-700 font-mono mb-1">{src.file}</div>
                <div className="text-xs text-gray-500 mb-2">{src.scope}</div>
                <div className="text-[10px] text-gray-400 mb-1">
                  <span className="font-semibold text-gray-500">Período:</span> {src.period}
                </div>
                <div className="text-[10px] text-gray-400 mb-1">
                  <span className="font-semibold text-gray-500">Consumidores:</span>{" "}
                  {src.consumers.join(", ")}
                </div>
                {src.migratesTo && (
                  <div className="text-[10px] text-blue-600 mb-1">
                    <span className="font-semibold">Migra para:</span> {src.migratesTo}
                  </div>
                )}
                {src.migrationBlocker && (
                  <div className="text-[10px] text-amber-600">
                    <span className="font-semibold">Bloqueio:</span> {src.migrationBlocker}
                  </div>
                )}
                {src.notes && (
                  <div className="text-[10px] text-gray-400 mt-1 italic">{src.notes}</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── §3 Page Coverage Matrix ────────────────────────────────────────── */}
      <SectionTitle>§3 · Cobertura por Página (Regime de Dados)</SectionTitle>

      {/* Real-only pages */}
      {realPages.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">
            Páginas com dados reais (pipeline canônico)
          </div>
          <div className="space-y-2">
            {realPages.map((r) => (
              <div key={r.href} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">REAL</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-800">{r.label} <span className="font-mono text-gray-400">{r.href}</span></div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{r.dataSource}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hybrid pages */}
      {hybridPages.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">
            Páginas híbridas (real + snapshot)
          </div>
          <div className="space-y-2">
            {hybridPages.map((r) => (
              <div key={r.href} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 shrink-0">HÍBRIDO</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-800">{r.label} <span className="font-mono text-gray-400">{r.href}</span></div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{r.dataSource}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot-only pages */}
      {snapshotPages.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">
            Páginas snapshot (accrual planejamento — sem dados reais)
          </div>
          <div className="space-y-2">
            {snapshotPages.map((r) => (
              <div key={r.href} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 shrink-0">SNAPSHOT</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-800">{r.label} <span className="font-mono text-gray-400">{r.href}</span></div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{r.dataSource}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System/other pages */}
      {systemPages.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Páginas de sistema (sem dados financeiros diretos)
          </div>
          <div className="space-y-2">
            {systemPages.map((r) => (
              <div key={r.href} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 border border-gray-300 shrink-0">SISTEMA</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-800">{r.label} <span className="font-mono text-gray-400">{r.href}</span></div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{r.dataSource}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── §4 Data Quality Diagnostics ───────────────────────────────────── */}
      <SectionTitle>§4 · Diagnóstico de Qualidade de Dados</SectionTitle>
      <Card className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Cobertura de classificação</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: pct(diag.confirmedTransactions, diag.totalTransactions) }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 shrink-0">
                {pct(diag.confirmedTransactions, diag.totalTransactions)}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              {diag.confirmedTransactions.toLocaleString("pt-BR")} / {diag.totalTransactions.toLocaleString("pt-BR")} transações classificadas
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Documentos processados</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full"
                  style={{ width: pct(diag.doneDocuments, diag.totalDocumentsIngested) }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 shrink-0">
                {pct(diag.doneDocuments, diag.totalDocumentsIngested)}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              {diag.doneDocuments} / {diag.totalDocumentsIngested} documentos com status=done
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Ação necessária</div>
            {diag.ambiguousTransactions === 0 && diag.errorDocuments === 0 ? (
              <div className="text-sm text-emerald-600 font-medium">Nenhuma ação pendente</div>
            ) : (
              <ul className="space-y-1">
                {diag.ambiguousTransactions > 0 && (
                  <li className="text-xs text-amber-700">
                    {diag.ambiguousTransactions} transações para revisão manual
                  </li>
                )}
                {diag.errorDocuments > 0 && (
                  <li className="text-xs text-red-600">
                    {diag.errorDocuments} documento(s) com erro de processamento
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {!diag.hasRealData && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Para iniciar o pipeline: acesse{" "}
              <Link href="/awq/ingest" className="text-brand-600 underline font-medium">/awq/ingest</Link>
              {" "}→ selecione banco → faça upload do extrato em PDF → aguarde status=done.
            </div>
          </div>
        )}
      </Card>

      {/* ── §5 Governance Rules ───────────────────────────────────────────── */}
      <SectionTitle>§5 · Regras de Governança (Bloqueios Estruturais)</SectionTitle>
      <Card className="mb-8">
        <div className="space-y-4">
          {[
            {
              rule: "Sem valor financeiro sem FinancialMetric<T>",
              description: "Toda métrica financeira exibida em página central deve ser um objeto FinancialMetric<T> com source_type declarado. Nunca exibir número bruto sem proveniência.",
              enforcement: "lib/financial-metric-registry.ts",
              status: "enforced",
            },
            {
              rule: "Sem importação direta de awq-group-data em pages/",
              description: "Pages devem importar de lib/awq-derived-metrics.ts (camada canônica). Nenhuma página pode importar lib/awq-group-data.ts diretamente.",
              enforcement: "Verificação: grep -r 'from \"@/lib/awq-group-data\"' app/",
              status: "enforced",
            },
            {
              rule: "Sem novos arrays financeiros hardcoded em lib/",
              description: "Antes de adicionar qualquer nova constante de dados financeiros, registre em lib/snapshot-registry.ts. Se não há justificativa para um entry no registry, não adicione o hardcode.",
              enforcement: "lib/snapshot-registry.ts",
              status: "enforced",
            },
            {
              rule: "Fontes reais exclusivamente via buildFinancialQuery()",
              description: "Dados cash-basis (extratos bancários) devem ser consumidos exclusivamente por buildFinancialQuery() em lib/financial-query.ts. Nenhuma leitura direta de financial-db.ts em pages.",
              enforcement: "lib/financial-metric-query.ts (único entry point para pages)",
              status: "enforced",
            },
            {
              rule: "Empty state honesto — nunca inventar valores",
              description: "Quando não há dados (emptyMetric), o UI deve exibir '—' ou MetricEmpty. Nunca fallback silencioso para 0 ou para snapshot sem badge visível.",
              enforcement: "metricDisplay() em financial-metric-registry.ts + MetricEmpty componente",
              status: "enforced",
            },
            {
              rule: "Snapshot sempre com badge visível",
              description: "Qualquer métrica com source_type=snapshot ou fallback deve exibir MetricSourceBadge e MetricDetail no componente de card.",
              enforcement: "components/MetricSourceBadge.tsx",
              status: "enforced",
            },
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                rule.status === "enforced"
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-amber-100 text-amber-700 border border-amber-200"
              }`}>
                {rule.status === "enforced" ? "ATIVO" : "PENDENTE"}
              </span>
              <div>
                <div className="text-xs font-semibold text-gray-800">{rule.rule}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{rule.description}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{rule.enforcement}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="text-[10px] text-gray-400 border-t border-gray-200 pt-4">
        Arquitetura financeira AWQ · Dados reais via{" "}
        <span className="font-mono">lib/financial-query.ts → lib/financial-db.ts</span> ·
        Planejamento via{" "}
        <span className="font-mono">lib/awq-derived-metrics.ts → lib/awq-group-data.ts</span> ·
        Contrato de tipo:{" "}
        <span className="font-mono">lib/financial-metric-registry.ts</span>
      </div>
    </div>
  );
}
