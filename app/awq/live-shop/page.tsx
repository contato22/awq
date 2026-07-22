// ─── /awq/live-shop — Cockpit da BU Live Shop ─────────────────────────────────
//
// Mini-P&L por sessão, funil, unit economics e ROIC vs hurdle (§7/§8). SSR com
// try/catch (regra de ouro CLAUDE.md): erro de DB → banner âmbar, nunca crash.
// Fonte: getLiveSessions() (DB ls_live_session ?? seed Anexo B).
//
// Live Shop é receita TRANSACIONAL (GMV/MC), NÃO MRR (§8) — sinalizado abaixo.

import Link from "next/link";
import Header from "@/components/Header";
import {
  Radio, TrendingUp, AlertTriangle, Target, Layers, Activity, Tag, ShoppingCart, ChevronRight, History, Trophy,
  DollarSign, Wallet, CheckCircle2, XCircle, Eye, ShoppingBag, MousePointerClick, Boxes,
} from "lucide-react";
import { getLiveSessions } from "@/lib/live-shop/db";
import { getBrands } from "@/lib/live-shop/brands";
import {
  aggregateFunnel, unitEconKpis, gmvConcentrationBps, roicKpis,
  AOV_MODELED_LOW,
} from "@/lib/live-shop/kpis";
import { computeCascade } from "@/lib/live-shop/ledger";
import { selectSchedule } from "@/lib/live-shop/fee-engine";
import { FEE_SCHEDULES, TIKTOK_CHANNEL } from "@/lib/live-shop/fee-schedules";
import { evaluateGate } from "@/lib/live-shop/governance";
import { gmvMaxAllocation, DEFAULT_GMV_MAX } from "@/lib/live-shop/reconciliation";
import { applyBps, fmtBRL, fmtPct, reais, type Bps, type Money } from "@/lib/live-shop/money";
import type { LiveSession } from "@/lib/live-shop/types";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

const TODAY = "2026-06-25"; // currentDate do contexto

function Card({ label, value, sub, danger, good, icon }: { label: string; value: string; sub?: string; danger?: boolean; good?: boolean; icon?: React.ReactNode }) {
  const color = danger ? "text-red-600" : good ? "text-emerald-600" : "text-gray-900";
  return (
    <div className="card card-hover p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {icon && <span className="text-gray-400">{icon}</span>}{label}
      </p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// Card de destaque (hero) — maior, com tom de cor.
function Highlight({ icon, label, value, foot, tone = "brand" }: { icon: React.ReactNode; label: string; value: string; foot?: string; tone?: "brand" | "good" | "bad" }) {
  const ring = tone === "bad" ? "ring-red-100" : tone === "good" ? "ring-emerald-100" : "ring-brand-100";
  const chip = tone === "bad" ? "bg-red-50 text-red-600" : tone === "good" ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600";
  const val = tone === "bad" ? "text-red-600" : tone === "good" ? "text-emerald-600" : "text-gray-900";
  return (
    <div className={`card p-4 ring-1 ${ring}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${chip}`}>{icon}</span>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-bold ${val}`}>{value}</p>
      {foot && <p className="mt-0.5 text-xs text-gray-400">{foot}</p>}
    </div>
  );
}

// Barra ROIC × hurdle (marcadores na mesma trilha).
function HurdleBar({ roicBps, hurdleBps, selicBps }: { roicBps: number; hurdleBps: number; selicBps: number }) {
  const max = Math.max(hurdleBps, roicBps, selicBps) * 1.15;
  const pos = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const below = roicBps < hurdleBps;
  return (
    <div className="mt-1">
      <div className="relative h-2.5 w-full rounded-full bg-gray-100">
        <div className={`absolute left-0 top-0 h-full rounded-full ${below ? "bg-red-400" : "bg-emerald-500"}`} style={{ width: pos(roicBps) }} />
        {/* hurdle marker */}
        <div className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-gray-700" style={{ left: pos(hurdleBps) }} title="Hurdle" />
        {/* selic marker */}
        <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-amber-500" style={{ left: pos(selicBps) }} title="Selic" />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className={`inline-block h-1.5 w-1.5 rounded-full ${below ? "bg-red-400" : "bg-emerald-500"}`} /> ROIC {(roicBps / 100).toFixed(1)}%</span>
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> Selic {(selicBps / 100).toFixed(2)}%</span>
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-700" /> Hurdle {(hurdleBps / 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default async function LiveShopPage() {
  let sessions: LiveSession[] = [];
  let loadError: string | null = null;
  try {
    sessions = await getLiveSessions();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const hasData = sessions.length > 0;
  const funnel = aggregateFunnel(sessions);
  const ue = unitEconKpis(sessions, AOV_MODELED_LOW);
  const concBps = gmvConcentrationBps(sessions, 2);
  const roic = roicKpis(1090); // baseline do business case (§2)

  // Revenue share da estrutura A — taxa REAL por marca (parâmetro, não constante).
  // Piloto = Bless Rio (5%). Fallback 10% se a marca não trouxer a taxa.
  const brands = await getBrands();
  const pilot = brands.find((b) => b.isPilot) ?? null;
  const revShareBps = pilot?.revenueShareBps || 1000;
  const revenueShare: Money = applyBps(ue.gmv, revShareBps);

  // Cascata representativa (estrutura A) — receita = revenue share; sem CMV
  // (Bless é o seller no piloto); rateio Caza ~28% da depreciação mensal.
  const cazaAllocMonthly: Money = applyBps(reais(794.66), 2800);
  const cascade = computeCascade({
    gmv: ue.gmv, commission: 0, fixed: 0, shipping: 0, payment: 0, affiliate: 0, returns: 0,
    retainer: revenueShare, productionFee: 0, cmv: 0, host: 0, operator: 0, set: 0,
    adSpend: 0, gmvMaxAds: 0, cazaDepreciation: cazaAllocMonthly, labor: 0, dasSimples: 0,
  });

  // Fee version vigente + alerta de flip 15/07.
  const schedule = selectSchedule(FEE_SCHEDULES, TIKTOK_CHANNEL.id, TODAY);
  const flipPending = TODAY < "2026-07-15";
  const gmvMaxNow = gmvMaxAllocation(ue.gmv, TODAY);

  // Gate pilot → validated (§9) — com os dados do piloto (não passa, por design).
  const gate = evaluateGate({
    ownProductUnitsSold: 0,
    mcPctBpsBySession: sessions.map(() => 0),
    ctorBps: funnel.ctorBps,
    client2Signed: false,
    daysSinceFirstLive: 9,
  });

  const milli = ue.itemsPerOrderMilli;
  const itemsPerOrder = (Math.round(milli / 10) / 100).toFixed(2);
  const gatePassed = gate.criteria.filter((c) => c.pass).length;
  const gateTotal = gate.criteria.length;

  return (
    <>
      <Header title="Live Shop" subtitle="Live commerce · piloto Bless Rio · infra Caza Vision" />
      <main className="px-6 lg:px-8 py-6 space-y-6">
        {/* Banner de estágio + provenance */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          <Radio size={13} className="shrink-0" />
          <strong>Estágio: pilot</strong>
          <span className="text-blue-400">|</span>
          <span>Receita <strong>transacional</strong> (GMV/MC) — não somar a MRR recorrente (§8)</span>
          <span className="text-blue-400">|</span>
          <span>Modelagem de equity/cap-table travada até <code>validated</code> (§9)</span>
        </div>

        {/* Sub-navegação da BU */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/awq/live-shop/marcas"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50"
          >
            <ShoppingCart size={14} className="text-brand-600" /> Marcas
            <ChevronRight size={14} className="text-gray-400" />
          </Link>
          <Link
            href="/awq/live-shop/historico"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50"
          >
            <History size={14} className="text-brand-600" /> Histórico de resultados
            <ChevronRight size={14} className="text-gray-400" />
          </Link>
          <Link
            href="/awq/live-shop/gamificacao"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50"
          >
            <Trophy size={14} className="text-brand-600" /> Gamificação
            <ChevronRight size={14} className="text-gray-400" />
          </Link>
          <a
            href="/awq/live-shop/publico"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50"
          >
            <Radio size={14} className="text-brand-600" /> Portal da marca
            <ChevronRight size={14} className="text-gray-400" />
          </a>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            <span>Erro ao ler dados — exibindo vazio. <span className="font-mono">{loadError}</span></span>
          </div>
        )}

        {!hasData ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Aguardando sessões de live (seed Anexo B ou ingestão TikTok).
          </div>
        ) : (
          <>
            {/* Hero — destaques da BU */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Highlight icon={<DollarSign size={15} />} label="GMV atribuído" value={fmtBRL(ue.gmv)} foot={`${sessions.length} lives · piloto`} />
              <Highlight icon={<Wallet size={15} />} label="Net to AWQ / semana" value={fmtBRL(cascade.netToAwq)} foot="estrutura A" tone={cascade.netToAwq > 0 ? "good" : "bad"} />
              <Highlight icon={<Target size={15} />} label="ROIC vs hurdle" value={fmtPct(roic.roicBps, 1)} foot={`hurdle ${fmtPct(roic.hurdleBps, 0)} · gap ${fmtPct(roic.hurdleGapBps, 1)}`} tone={roic.belowHurdle ? "bad" : "good"} />
              <Highlight icon={<Trophy size={15} />} label="Gate validated" value={`${gatePassed}/${gateTotal}`} foot={gate.passed ? "atingido" : "em pilot"} tone={gate.passed ? "good" : "brand"} />
            </div>

            {/* KPIs unit econ + funil */}
            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Activity size={15} className="text-gray-400" /> Unit economics &amp; funil ({sessions.length} sessões)
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                <Card icon={<DollarSign size={12} />} label="GMV atribuído" value={fmtBRL(ue.gmv)} sub="provisório ~7 dias" />
                <Card icon={<ShoppingBag size={12} />} label="AOV" value={fmtBRL(ue.aov)} sub={`gap ${fmtPct(ue.aovGapBps, 0)} do modelado`} danger={ue.aovGapBps < 5000} />
                <Card icon={<Boxes size={12} />} label="Itens / pedido" value={itemsPerOrder} sub="cross-sell ≈ zero" />
                <Card icon={<Layers size={12} />} label="Concentração L1+L2" value={fmtPct(concBps, 1)} sub="risco de cauda curta" danger={concBps > 8000} />
                <Card icon={<MousePointerClick size={12} />} label="CTR" value={fmtPct(funnel.ctrBps, 1)} sub="cliques / views" />
                <Card icon={<Target size={12} />} label="CTOR" value={fmtPct(funnel.ctorBps, 2)} sub="pedidos / cliques — vazamento checkout" danger={funnel.ctorBps < 300} />
                <Card icon={<ShoppingBag size={12} />} label="Pedidos pagos" value={String(ue.paidOrders)} />
                <Card icon={<Eye size={12} />} label="Views" value={funnel.views.toLocaleString("pt-BR")} />
              </div>
            </section>

            {/* Mini-P&L (estrutura A) */}
            <section className="card p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Layers size={15} className="text-gray-400" /> Mini-P&amp;L — estrutura A (AWQ {fmtPct(revShareBps, 0)} GMV; Bless banca host)
              </div>
              <dl className="space-y-1.5 text-sm">
                <Row label="GMV bruto (referência)" value={fmtBRL(cascade.gmv)} muted />
                <Row label={`(+) Revenue share ${fmtPct(revShareBps, 0)} GMV`} value={fmtBRL(revenueShare)} />
                <Row label="(−) Rateio depreciação Caza (28%/mês)" value={`(${fmtBRL(cazaAllocMonthly)})`} />
                <Row label="Margem de Contribuição" value={fmtBRL(cascade.contributionMargin)} bold />
                <Row label="(−) DAS/Simples" value="(fora do repasse — seller)" muted />
                <Row label="Net to AWQ (semana)" value={fmtBRL(cascade.netToAwq)} bold />
              </dl>
              <p className="mt-3 text-[11px] text-gray-400">
                Standalone com 1 cliente <strong>não paga</strong> (breakeven econômico ≈ R$ 11.834/mês).
                Alavanca = verticalização (produto próprio, CMV ~20–30%) — gate §9.
              </p>
            </section>

            {/* ROIC vs hurdle */}
            <section className="card p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Target size={15} className="text-gray-400" /> Capital allocation — ROIC vs hurdle
              </div>
              <HurdleBar roicBps={roic.roicBps} hurdleBps={roic.hurdleBps} selicBps={roic.selicBps} />
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Card label="ROIC (anualizado)" value={fmtPct(roic.roicBps, 1)} danger={roic.belowHurdle} />
                <Card label="Hurdle (build-up)" value={fmtPct(roic.hurdleBps, 1)} />
                <Card label="Prêmio de risco (ROIC − Selic)" value={fmtPct(roic.riskPremiumBps, 2)} danger={roic.riskPremiumBps < 0} />
                <Card label="Gap vs hurdle" value={fmtPct(roic.hurdleGapBps, 1)} danger={roic.hurdleGapBps < 0} />
              </div>
              <p className="mt-3 text-[11px] text-gray-400">
                Hurdle sem tax shield (Simples). Hoje <strong>abaixo</strong> do hurdle → marcado.
              </p>
            </section>

            {/* Fee version + flip 15/07 + GMV Max */}
            <section className="card p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Tag size={15} className="text-gray-400" /> Tabela de fees vigente
              </div>
              <p className="text-sm text-gray-700">
                Versão <code className="rounded bg-gray-100 px-1">{schedule.id}</code> ({schedule.source})
                {!schedule.confirmed && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700">confirmed=false</span>}
              </p>
              {flipPending && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle size={12} /> Flip 15/07/2026: comissão progressiva (item &lt; R$50 → 10%) eleva take-rate.
                  Recompute de snapshots + alerta de delta serão emitidos na virada (§9.4).
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                GMV Max (jul/2026, {DEFAULT_GMV_MAX.confirmed ? "confirmado" : "a confirmar"}):
                {" "}{gmvMaxNow > 0 ? `${fmtBRL(gmvMaxNow)} alocados` : "ainda não obrigatório nesta data"}.
              </p>
            </section>

            {/* Gate pilot → validated */}
            <section className="card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <TrendingUp size={15} className="text-gray-400" /> Gate pilot → validated (falsificável, §9)
                </div>
                <span className="text-xs font-medium text-gray-500">{gatePassed}/{gateTotal} critérios</span>
              </div>
              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${gate.passed ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${(gatePassed / gateTotal) * 100}%` }} />
              </div>
              <ul className="space-y-2 text-sm">
                {gate.criteria.map((c) => (
                  <li key={c.key} className="flex items-start gap-2.5">
                    {c.pass
                      ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      : <XCircle size={16} className="mt-0.5 shrink-0 text-gray-300" />}
                    <span className="flex-1">
                      <span className={c.pass ? "text-gray-900" : "text-gray-700"}>{c.label}</span>
                      <span className="ml-1.5 text-xs text-gray-400">— {c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className={`mt-4 rounded-lg px-3 py-2 text-xs font-medium ${gate.passed ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"}`}>
                {gate.passed ? "Gate ATINGIDO — habilitar verticalização/formalização." : "Gate não atingido — BU segue em pilot."}
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-gray-100 pb-1.5 ${bold ? "font-semibold text-gray-900" : muted ? "text-gray-400" : "text-gray-700"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
