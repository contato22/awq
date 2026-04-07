// ─── /awq/assets — Holding Asset Consolidated Dashboard ──────────────────────
//
// DATA SOURCE: lib/asset-data.ts (BU subledgers) via lib/asset-query.ts
// SCOPE: Consolidated recognized patrimony across all BUs — Q1 2026 snapshot.
//        strategic_non_recognized assets are EXCLUDED from total_asset_net.
// AWQ Holding reads/consolidates only — never originates or edits asset records.

import Header from "@/components/Header";
import Link from "next/link";
import {
  Building2,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Shield,
  ChevronRight,
  Package,
} from "lucide-react";
import {
  buildHoldingAssetConsolidated,
  fmtBRL,
  BU_LABELS,
} from "@/lib/asset-query";
import type { BuAssetSnapshot } from "@/lib/asset-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number): string {
  return (n * 100).toFixed(0) + "%";
}

function score(n: number): string {
  return (n * 10).toFixed(1) + " / 10";
}

function riskColor(n: number): string {
  if (n >= 0.7) return "text-red-600";
  if (n >= 0.4) return "text-amber-600";
  return "text-emerald-600";
}

function evidenceColor(n: number): string {
  if (n >= 0.7) return "text-emerald-600";
  if (n >= 0.4) return "text-amber-600";
  return "text-red-600";
}

// ─── Snapshot Banner ──────────────────────────────────────────────────────────

function SnapshotBanner() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
      <span>
        <strong>Snapshot Patrimonial Q1 2026</strong> — dados gerados a partir dos subledgers de ativos
        de cada BU (lib/asset-data.ts). A AWQ Holding consolida e lê esses registros — não os origina.
        Ativos estratégicos não reconhecidos são apresentados na camada estratégica e{" "}
        <strong>não compõem o patrimônio líquido consolidado</strong>.
      </span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  note,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  note?: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
        <div className="text-xs font-medium text-gray-500 mt-0.5">{label}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
        {note && (
          <div className="text-[10px] text-amber-600 mt-1 font-semibold">{note}</div>
        )}
      </div>
    </div>
  );
}

// ─── BU Breakdown Table ───────────────────────────────────────────────────────

function BuBreakdownTable({ snapshots }: { snapshots: BuAssetSnapshot[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Building2 size={15} className="text-brand-500" />
          Desdobramento por BU
        </h2>
        <span className="text-[10px] text-gray-400">Q1 2026 · snapshot patrimonial</span>
      </div>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">BU</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Tangível Líq.</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Intangível Rec. Líq.</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Total Rec.</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Ativos Rec.</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Ociosos</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Evidência Alta</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Risco</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.bu_id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-gray-900">
                    {BU_LABELS[s.bu_id] ?? s.bu_id}
                  </div>
                  <div className="text-[10px] text-gray-400">{s.bu_id}</div>
                </td>
                <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-gray-800">
                  {fmtBRL(s.tangible_net_value)}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-gray-800">
                  {fmtBRL(s.intangible_recognized_net)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold tabular-nums text-brand-700">
                  {fmtBRL(s.recognized_net_total)}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-700">
                  {s.recognized_asset_count}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={s.idle_asset_count > 0 ? "text-amber-600 font-semibold" : "text-gray-400"}>
                    {s.idle_asset_count}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={evidenceColor(s.evidence_high_pct)}>
                    {pct(s.evidence_high_pct)}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={riskColor(s.critical_asset_risk_score)}>
                    {score(s.critical_asset_risk_score)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Group Quality Scores ─────────────────────────────────────────────────────

function GroupScores({
  utilizationScore,
  evidenceScore,
  riskScore,
}: {
  utilizationScore: number;
  evidenceScore: number;
  riskScore: number;
}) {
  const metrics = [
    {
      label: "Utilização do Portfólio",
      value: utilizationScore,
      display: score(utilizationScore),
      color: utilizationScore >= 0.7 ? "bg-emerald-500" : utilizationScore >= 0.4 ? "bg-amber-500" : "bg-red-500",
      textColor: utilizationScore >= 0.7 ? "text-emerald-700" : utilizationScore >= 0.4 ? "text-amber-700" : "text-red-700",
      hint: "Score médio ponderado de utilização produtiva dos ativos",
    },
    {
      label: "Score de Evidência",
      value: evidenceScore,
      display: score(evidenceScore),
      color: evidenceScore >= 0.7 ? "bg-emerald-500" : evidenceScore >= 0.4 ? "bg-amber-500" : "bg-red-500",
      textColor: evidenceScore >= 0.7 ? "text-emerald-700" : evidenceScore >= 0.4 ? "text-amber-700" : "text-red-700",
      hint: "Percentual médio de ativos com evidência documental alta",
    },
    {
      label: "Score de Risco",
      value: riskScore,
      display: score(riskScore),
      color: riskScore >= 0.7 ? "bg-red-500" : riskScore >= 0.4 ? "bg-amber-500" : "bg-emerald-500",
      textColor: riskScore >= 0.7 ? "text-red-700" : riskScore >= 0.4 ? "text-amber-700" : "text-emerald-700",
      hint: "Score composto: ociosidade + revisão vencida + baixa evidência (menor = melhor)",
    },
  ];

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 size={15} className="text-brand-500" />
        Scores do Grupo — Qualidade Patrimonial
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700">{m.label}</span>
              <span className={`text-sm font-bold ${m.textColor}`}>{m.display}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${m.color}`}
                style={{ width: `${m.value * 100}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-400 mt-1">{m.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqAssetsPage() {
  const consolidated = await buildHoldingAssetConsolidated();

  const criticalAlerts = consolidated.governance_alerts.filter(
    (a) => a.severity === "critical"
  );
  const highAlerts = consolidated.governance_alerts.filter(
    (a) => a.severity === "high"
  );
  const totalGovernanceAlerts = consolidated.governance_alerts.length;

  return (
    <>
      <Header
        title="Ativos — AWQ Group"
        subtitle={`Consolidado Patrimonial · ${consolidated.period} · snapshot ${consolidated.consolidation_date.slice(0, 10)}`}
      />
      <div className="page-container">

        <SnapshotBanner />

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Patrimônio Líquido Total"
            value={fmtBRL(consolidated.total_asset_net)}
            sub="tangível + intangível reconhecido"
            icon={Package}
            color="text-brand-600"
            bg="bg-brand-50"
          />
          <KpiCard
            label="Tangível Líquido"
            value={fmtBRL(consolidated.total_tangible_net)}
            sub="após depreciação acumulada"
            icon={Building2}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <KpiCard
            label="Intangível Reconhecido Líquido"
            value={fmtBRL(consolidated.total_intangible_recognized_net)}
            sub="após amortização acumulada"
            icon={CheckCircle2}
            color="text-violet-600"
            bg="bg-violet-50"
          />
          <KpiCard
            label="Estratégico Não Reconhecido"
            value={String(consolidated.total_strategic_assets)}
            sub={`ativo(s) — não compõe o PL`}
            icon={TrendingDown}
            color="text-amber-600"
            bg="bg-amber-50"
            note="Excluído do patrimônio líquido consolidado"
          />
        </div>

        {/* ── Governance Alert Badge ───────────────────────────────────────── */}
        {totalGovernanceAlerts > 0 && (
          <div className="card p-4 border-l-4 border-red-400 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-red-500 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {totalGovernanceAlerts} alerta(s) de governança patrimonial
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {criticalAlerts.length > 0 && (
                    <span className="text-red-600 font-semibold mr-2">
                      {criticalAlerts.length} crítico(s)
                    </span>
                  )}
                  {highAlerts.length > 0 && (
                    <span className="text-amber-600 font-semibold mr-2">
                      {highAlerts.length} alto(s)
                    </span>
                  )}
                  Revise na página de Governança de Ativos.
                </div>
              </div>
            </div>
            <Link
              href="/awq/assets/governance"
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
            >
              Ver Alertas <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* ── BU Breakdown Table ───────────────────────────────────────────── */}
        <BuBreakdownTable snapshots={consolidated.bu_snapshots} />

        {/* ── Group Quality Scores ─────────────────────────────────────────── */}
        <GroupScores
          utilizationScore={consolidated.group_asset_utilization_score}
          evidenceScore={consolidated.group_evidence_score}
          riskScore={consolidated.group_asset_risk_score}
        />

        {/* ── Movement Summary ─────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-brand-500" />
            Movimentações do Período (Q1 2026)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                CAPEX do Período
              </div>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {fmtBRL(consolidated.total_capex_month)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Aquisições consolidadas</div>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-100 p-4">
              <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">
                Impairment do Período
              </div>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {fmtBRL(consolidated.total_impairment_month)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Redução ao valor recuperável</div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Ativos em Validação
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {consolidated.total_under_validation_assets}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Aguardando aprovação de reconhecimento</div>
            </div>
          </div>
        </div>

        {/* ── Strategic Layer Link ─────────────────────────────────────────── */}
        <div className="card p-5 border border-amber-200 bg-amber-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                <TrendingDown size={15} className="text-amber-600" />
                Camada Estratégica — Ativos Não Reconhecidos
              </div>
              <div className="text-xs text-amber-700 mt-1">
                {consolidated.total_strategic_assets} ativo(s) estratégico(s) mapeados por BU.
                Estes <strong>não compõem o patrimônio líquido</strong> consolidado acima.
                Acesse o painel estratégico para detalhes por BU e tipo.
              </div>
            </div>
            <Link
              href="/awq/assets/strategic"
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 ml-4"
            >
              Ver Estratégico <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* ── Methodology Note ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Consolidação Patrimonial AWQ</span> —
            A AWQ Holding lê os subledgers de ativos de cada BU via{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">lib/asset-query.ts</code>.
            Somente ativos com{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">recognition_type: recognized</code>{" "}
            entram no{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">total_asset_net</code>.
            Ativos{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">strategic_non_recognized</code>{" "}
            são registrados para contexto estratégico mas excluídos do PL.
            Governança aplicada por{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">lib/asset-governance.ts</code>.
          </p>
        </div>

      </div>
    </>
  );
}
