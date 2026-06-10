// ─── /awq/epm/hurdle — Hurdle Rate · Projeto / BU ────────────────────────────
//
// Avalia projetos e BUs contra hurdle rate (taxa mínima de retorno aceitável).
// Compara IRR / ROIC / payback de cada projeto com o hurdle definido por BU.

import Header from "@/components/Header";
import Link from "next/link";
import {
  Percent, TrendingUp, TrendingDown, CheckCircle2,
  XCircle, AlertTriangle, Info, BarChart3, Clock,
} from "lucide-react";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type HurdleStatus = "approved" | "rejected" | "watch" | "pending";

interface ProjectEval {
  id:          string;
  name:        string;
  bu:          string;
  capex:       number;
  irr:         number | null;
  roic:        number | null;
  paybackMo:   number | null;
  hurdle:      number;
  status:      HurdleStatus;
  description: string;
}

interface BuHurdle {
  bu:          string;
  hurdle:      number;
  wacc:        number;
  riskPremium: number;
  projects:    number;
}

// ─── Dados de referência (substituir por DB quando disponível) ───────────────

const BU_HURDLES: BuHurdle[] = [
  { bu: "AWQ Holding",  hurdle: 15, wacc: 12, riskPremium: 3,  projects: 4 },
  { bu: "JACQES",       hurdle: 18, wacc: 13, riskPremium: 5,  projects: 3 },
  { bu: "AWQ Venture",  hurdle: 25, wacc: 15, riskPremium: 10, projects: 5 },
  { bu: "Caza Vision",  hurdle: 20, wacc: 14, riskPremium: 6,  projects: 2 },
];

const PROJECTS: ProjectEval[] = [
  {
    id: "PRJ-001", name: "Expansão Sede SP",
    bu: "AWQ Holding", capex: 850_000, irr: 22.4, roic: 19.1, paybackMo: 38,
    hurdle: 15, status: "approved",
    description: "Ampliação do escritório principal + infraestrutura de TI",
  },
  {
    id: "PRJ-002", name: "Sistema ERP Integrado",
    bu: "AWQ Holding", capex: 320_000, irr: 11.2, roic: 9.8, paybackMo: 54,
    hurdle: 15, status: "rejected",
    description: "Migração para plataforma ERP unificada — IRR abaixo do hurdle",
  },
  {
    id: "PRJ-003", name: "Linha Produção JACQES v2",
    bu: "JACQES", capex: 1_200_000, irr: 24.7, roic: 21.3, paybackMo: 30,
    hurdle: 18, status: "approved",
    description: "Nova linha de produção para escalar capacidade em 40%",
  },
  {
    id: "PRJ-004", name: "Automação Logística",
    bu: "JACQES", capex: 450_000, irr: 17.1, roic: 15.4, paybackMo: 42,
    hurdle: 18, status: "watch",
    description: "IRR marginal — monitorar premissas de custo de frete",
  },
  {
    id: "PRJ-005", name: "Seed — TechCo A",
    bu: "AWQ Venture", capex: 200_000, irr: 38.0, roic: null, paybackMo: null,
    hurdle: 25, status: "approved",
    description: "Rodada seed com participação de 12% — retorno estimado 3.8x",
  },
  {
    id: "PRJ-006", name: "Seed — FinTech B",
    bu: "AWQ Venture", capex: 150_000, irr: 19.5, roic: null, paybackMo: null,
    hurdle: 25, status: "rejected",
    description: "IRR projetado abaixo do hurdle para Venture — risco não compensado",
  },
  {
    id: "PRJ-007", name: "Portfolio Series A",
    bu: "AWQ Venture", capex: 500_000, irr: 31.2, roic: null, paybackMo: null,
    hurdle: 25, status: "approved",
    description: "Follow-on em portfólio existente com tração comprovada",
  },
  {
    id: "PRJ-008", name: "Expansão Caza RJ",
    bu: "Caza Vision", capex: 280_000, irr: null, roic: null, paybackMo: null,
    hurdle: 20, status: "pending",
    description: "Análise em andamento — aguardando estudo de viabilidade de mercado",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR");
}

function fmtPct(n: number | null): string {
  return n !== null ? n.toFixed(1) + "%" : "—";
}

function spread(irr: number | null, hurdle: number): number | null {
  return irr !== null ? irr - hurdle : null;
}

const STATUS_CFG: Record<HurdleStatus, {
  label: string;
  icon:  React.ElementType;
  bg:    string;
  text:  string;
  border:string;
}> = {
  approved: { label: "Aprovado",    icon: CheckCircle2,   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  rejected: { label: "Reprovado",   icon: XCircle,        bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200"     },
  watch:    { label: "Atenção",     icon: AlertTriangle,  bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  pending:  { label: "Pendente",    icon: Info,           bg: "bg-gray-50",    text: "text-gray-500",    border: "border-gray-200"    },
};

// ─── Componentes ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HurdleStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function SpreadBar({ irr, hurdle }: { irr: number | null; hurdle: number }) {
  const sp = spread(irr, hurdle);
  if (sp === null) return <span className="text-gray-300 text-xs">—</span>;
  const color = sp >= 5 ? "bg-emerald-500" : sp >= 0 ? "bg-amber-400" : "bg-red-500";
  const width  = Math.min(Math.abs(sp) * 4, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${sp >= 0 ? "text-emerald-600" : "text-red-600"}`}>
        {sp >= 0 ? "+" : ""}{sp.toFixed(1)}pp
      </span>
    </div>
  );
}

function BuCard({ bu }: { bu: BuHurdle }) {
  const buProjects = PROJECTS.filter((p) => p.bu === bu.bu);
  const approved   = buProjects.filter((p) => p.status === "approved").length;
  const capex      = buProjects.reduce((s, p) => s + p.capex, 0);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-sm text-gray-900">{bu.bu}</div>
          <div className="text-xs text-gray-400 mt-0.5">{bu.projects} projetos · {fmtBRL(capex)} total</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold tabular-nums text-brand-600">{bu.hurdle}%</div>
          <div className="text-xs text-gray-400">hurdle rate</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-400 mb-0.5">WACC</div>
          <div className="font-semibold text-gray-800">{bu.wacc}%</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-400 mb-0.5">Prêmio Risco</div>
          <div className="font-semibold text-gray-800">+{bu.riskPremium}pp</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2">
          <div className="text-emerald-600 mb-0.5">Aprovados</div>
          <div className="font-semibold text-emerald-700">{approved}/{bu.projects}</div>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ p }: { p: ProjectEval }) {
  const sp = spread(p.irr, p.hurdle);
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <td className="py-3 pl-4 pr-2">
        <div className="font-medium text-sm text-gray-900">{p.name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{p.id} · {p.bu}</div>
        <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{p.description}</div>
      </td>
      <td className="py-3 px-3 text-right text-sm font-semibold tabular-nums text-gray-700">
        {fmtBRL(p.capex)}
      </td>
      <td className="py-3 px-3 text-right">
        <div className="text-sm font-semibold tabular-nums text-gray-900">{fmtPct(p.irr)}</div>
        <div className="text-xs text-gray-400">hurdle: {p.hurdle}%</div>
      </td>
      <td className="py-3 px-3">
        <SpreadBar irr={p.irr} hurdle={p.hurdle} />
      </td>
      <td className="py-3 px-3 text-right text-sm tabular-nums text-gray-600">
        {p.roic !== null ? fmtPct(p.roic) : "—"}
      </td>
      <td className="py-3 px-3 text-right text-sm tabular-nums text-gray-600">
        {p.paybackMo !== null ? `${p.paybackMo}m` : "—"}
      </td>
      <td className="py-3 pr-4 pl-3">
        <StatusBadge status={p.status} />
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HurdlePage() {
  const totalCapex    = PROJECTS.reduce((s, p) => s + p.capex, 0);
  const approved      = PROJECTS.filter((p) => p.status === "approved");
  const rejected      = PROJECTS.filter((p) => p.status === "rejected");
  const watchList     = PROJECTS.filter((p) => p.status === "watch");
  const approvedCapex = approved.reduce((s, p) => s + p.capex, 0);
  const approvalRate  = (approved.length / PROJECTS.filter((p) => p.status !== "pending").length) * 100;

  const avgIrr = (() => {
    const with_irr = approved.filter((p) => p.irr !== null);
    if (!with_irr.length) return null;
    return with_irr.reduce((s, p) => s + (p.irr as number), 0) / with_irr.length;
  })();

  return (
    <>
      <Header
        title="Hurdle Rate"
        subtitle="EPM · Avaliação de Projetos & BUs · Taxa Mínima de Retorno"
      />
      <div className="page-container">

        {/* ── Info banner ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs bg-brand-50 border border-brand-100 text-brand-700">
          <Percent size={12} className="shrink-0 mt-0.5" />
          <span>
            <strong>Hurdle Rate</strong> = WACC + Prêmio de Risco por BU.
            Projetos com IRR abaixo do hurdle destroem valor — devem ser reprovados
            ou reprojetados antes de aprovação de capital.
          </span>
        </div>

        {/* ── Summary KPIs ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Projetos Avaliados",  value: String(PROJECTS.length),      sub: `${approved.length} aprovados`,           icon: BarChart3,  color: "text-gray-700"    },
            { label: "Capex Aprovado",       value: fmtBRL(approvedCapex),        sub: `de ${fmtBRL(totalCapex)} total`,          icon: TrendingUp, color: "text-emerald-600" },
            { label: "Taxa de Aprovação",    value: `${approvalRate.toFixed(0)}%`, sub: `${rejected.length} reprovados`,          icon: Percent,    color: "text-brand-600"   },
            { label: "IRR Médio Aprovados",  value: avgIrr ? fmtPct(avgIrr) : "—", sub: `${watchList.length} em atenção`,        icon: TrendingUp, color: "text-emerald-600" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">{label}</span>
                <Icon size={13} className={color} />
              </div>
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-1">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Hurdle por BU ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Percent size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Hurdle por BU</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {BU_HURDLES.map((bu) => <BuCard key={bu.bu} bu={bu} />)}
          </div>
        </section>

        {/* ── Tabela de projetos ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Projetos — IRR vs Hurdle</span>
          </div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left py-2.5 pl-4 pr-2 text-xs font-semibold text-gray-500">Projeto</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">CAPEX</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">IRR</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500">Spread</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">ROIC</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Payback</th>
                  <th className="py-2.5 pr-4 pl-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Aprovados primeiro, depois atenção, reprovados, pendentes */}
                {(["approved", "watch", "rejected", "pending"] as HurdleStatus[]).flatMap((st) =>
                  PROJECTS.filter((p) => p.status === st).map((p) => <ProjectRow key={p.id} p={p} />)
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Spread = IRR − Hurdle Rate da BU. Positivo indica criação de valor acima do custo de capital.
          </p>
        </section>

        {/* ── Rejections watchlist ─────────────────────────────────────── */}
        {watchList.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Em Atenção</span>
            </div>
            <div className="space-y-2">
              {watchList.map((p) => (
                <div key={p.id} className="card p-3 border-amber-200 bg-amber-50/40 flex items-start gap-3">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm text-gray-900">{p.name} <span className="text-gray-400 font-normal text-xs">— {p.bu}</span></div>
                    <div className="text-xs text-gray-600 mt-0.5">{p.description}</div>
                    <div className="text-xs text-amber-700 mt-1">
                      IRR {fmtPct(p.irr)} · Hurdle {p.hurdle}% · Spread {spread(p.irr, p.hurdle) !== null ? (spread(p.irr, p.hurdle)! >= 0 ? "+" : "") + spread(p.irr, p.hurdle)!.toFixed(1) + "pp" : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Metodologia ─────────────────────────────────────────────── */}
        <section className="card p-4 bg-gray-50/60">
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Metodologia</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
            <div>
              <div className="font-semibold text-gray-700 mb-1">Hurdle Rate</div>
              <div className="font-mono bg-white border border-gray-200 rounded px-2 py-1 mb-1.5">
                Hurdle = WACC + Prêmio de Risco
              </div>
              <div className="text-gray-400">Cada BU tem seu perfil de risco refletido no prêmio adicional sobre o WACC do grupo.</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-1">Critério de Aprovação</div>
              <div className="font-mono bg-white border border-gray-200 rounded px-2 py-1 mb-1.5">
                IRR ≥ Hurdle → Aprovado
              </div>
              <div className="text-gray-400">Projetos com IRR marginalmente acima do hurdle (&lt;2pp) entram em watchlist para revisão trimestral.</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-1">Métricas Secundárias</div>
              <div className="text-gray-400 space-y-0.5">
                <div>• <strong>ROIC</strong> — Retorno sobre capital investido</div>
                <div>• <strong>Payback</strong> — Tempo de recuperação em meses</div>
                <div>• <strong>Spread</strong> — IRR menos hurdle em pp</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Navigation ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/budget" className="text-brand-600 hover:underline">Budget vs Actual →</Link>
          <Link href="/awq/epm/kpis"   className="text-brand-600 hover:underline">KPI Dashboard →</Link>
        </div>

      </div>
    </>
  );
}
