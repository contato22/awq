// ─── /awq/assets/strategic — Strategic Non-Recognized Asset Layer ─────────────
//
// DATA SOURCE: lib/asset-data.ts via lib/asset-query.ts
// SCOPE: strategic_non_recognized assets ONLY — these are NEVER included in
//        consolidated equity (total_asset_net). This panel is for strategic
//        context and organizational intelligence only.
// AWQ Holding reads/consolidates only — never originates or edits asset records.

import Header from "@/components/Header";
import Link from "next/link";
import {
  Sparkles,
  Info,
  Building2,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  buildHoldingAssetConsolidated,
  buildBuStrategicView,
  fmtBRL,
  BU_LABELS,
  STRATEGIC_CLASS_LABELS,
} from "@/lib/asset-query";
import type { BuId } from "@/lib/asset-types";

// ─── Exclusion Banner (prominent — this is legally important) ─────────────────

function ExclusionBanner() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border-2 border-amber-400 text-sm text-amber-800">
      <Sparkles size={16} className="shrink-0 mt-0.5 text-amber-600" />
      <div>
        <p className="font-bold text-amber-900">
          Camada Estratégica — Ativos Não Reconhecidos Contabilmente
        </p>
        <p className="text-xs mt-1 leading-relaxed">
          Este painel <strong>NÃO compõe o patrimônio líquido consolidado</strong> da AWQ Group.
          Os ativos aqui listados possuem{" "}
          <code className="font-mono bg-amber-100 px-1 rounded text-[10px]">recognition_type: strategic_non_recognized</code>{" "}
          e são excluídos de todos os cálculos de{" "}
          <code className="font-mono bg-amber-100 px-1 rounded text-[10px]">total_asset_net</code>,{" "}
          <code className="font-mono bg-amber-100 px-1 rounded text-[10px]">total_tangible_net</code>{" "}
          e <code className="font-mono bg-amber-100 px-1 rounded text-[10px]">total_intangible_recognized_net</code>.
          Eles representam capital estratégico mapeado para gestão organizacional e decisões de alocação —
          não possuem reconhecimento contábil formal neste período.
        </p>
      </div>
    </div>
  );
}

// ─── Why Strategic Assets Exist ───────────────────────────────────────────────

function StrategicContext() {
  return (
    <div className="card p-5 border border-amber-100 bg-amber-50/30">
      <h2 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
        <Info size={15} className="text-amber-600" />
        Por que mapeamos ativos estratégicos não reconhecidos?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-xs text-gray-700">
        {[
          {
            title: "Capital Humano & Talentos",
            desc:  "Conhecimento especializado, times-chave e relacionamentos com clientes são ativos reais para decisões de retenção e investimento — mesmo sem reconhecimento GAAP.",
          },
          {
            title: "Brand Equity & Posicionamento",
            desc:  "O valor de marca construído organicamente não é capitalizado contabilmente em estágio inicial, mas influencia diretamente o valuation e as decisões de precificação.",
          },
          {
            title: "Metodologias & Propriedade Intelectual",
            desc:  "Processos proprietários, frameworks e metodologias desenvolvidos internamente entram aqui até que possam ser formalmente reconhecidos via contrato ou licença.",
          },
          {
            title: "Posição Estratégica & Network",
            desc:  "Relacionamentos institucionais, posição de mercado e acesso a oportunidades são mapeados para análise de competitividade — não são ativos contábeis.",
          },
          {
            title: "Modelos Proprietários",
            desc:  "Algoritmos, sistemas de scoring e modelos de negócio desenvolvidos internamente que ainda não foram formalmente avaliados por terceiros.",
          },
          {
            title: "Decisões de Alocação",
            desc:  "O mapeamento da camada estratégica permite ao AWQ Group priorizar investimentos (CAPEX e P&D) onde o valor estratégico justifica formalização contábil futura.",
          },
        ].map((item) => (
          <div key={item.title} className="bg-white rounded-lg border border-amber-100 p-3">
            <div className="font-semibold text-amber-800 mb-1">{item.title}</div>
            <div className="text-gray-600 leading-relaxed">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BU Strategic Card ────────────────────────────────────────────────────────

interface BuStrategicView {
  bu_id:       BuId;
  bu_name:     string;
  total_count: number;
  by_class:    Array<{ class: string; count: number; estimated_value: number | null }>;
}

function BuStrategicCard({ view }: { view: BuStrategicView }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-gray-900">
            {BU_LABELS[view.bu_id] ?? view.bu_id}
          </div>
          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{view.bu_id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" />
          <span className="text-lg font-bold text-amber-700">{view.total_count}</span>
          <span className="text-[10px] text-gray-400">ativo(s)</span>
        </div>
      </div>

      {view.by_class.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">
          Nenhum ativo estratégico mapeado neste BU.
        </p>
      ) : (
        <div className="space-y-2">
          {view.by_class.map((row) => (
            <div key={row.class} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <Eye size={11} className="text-amber-400 shrink-0" />
                <span className="text-xs text-gray-700 truncate">
                  {STRATEGIC_CLASS_LABELS[row.class] ?? row.class}
                </span>
                <span className="text-[10px] text-gray-400 font-mono shrink-0">
                  {row.count}x
                </span>
              </div>
              {row.estimated_value !== null ? (
                <span className="text-xs text-amber-700 font-semibold tabular-nums shrink-0 ml-2">
                  ~{fmtBRL(row.estimated_value)}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 shrink-0 ml-2">Não avaliado</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <Link
          href={`/${view.bu_id}/assets`}
          className="flex items-center gap-1 text-[11px] text-brand-600 hover:underline font-medium"
        >
          <ChevronRight size={11} /> Ver subledger completo ({view.bu_name})
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqAssetsStrategicPage() {
  const consolidated = await buildHoldingAssetConsolidated();
  const strategicViews = await buildBuStrategicView();

  return (
    <>
      <Header
        title="Camada Estratégica — AWQ Group"
        subtitle={`Ativos não reconhecidos contabilmente · ${consolidated.period} · excluído do PL`}
      />
      <div className="page-container">

        <ExclusionBanner />

        {/* ── Back link ────────────────────────────────────────────────────── */}
        <div>
          <Link
            href="/awq/assets"
            className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
          >
            <ChevronRight size={11} className="rotate-180" /> Voltar ao Consolidado Patrimonial
          </Link>
        </div>

        {/* ── Total strategic summary ───────────────────────────────────────── */}
        <div className="card p-5 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <Sparkles size={24} className="text-amber-500" />
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-700 tabular-nums">
              {consolidated.total_strategic_assets}
            </div>
            <div className="text-sm font-medium text-gray-600 mt-0.5">
              ativos estratégicos mapeados no grupo
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Distribuídos em {strategicViews.filter((v) => v.total_count > 0).length} BU(s) ·
              {" "}Excluídos do patrimônio líquido consolidado
            </div>
          </div>
        </div>

        {/* ── Strategic context explanation ─────────────────────────────────── */}
        <StrategicContext />

        {/* ── Per-BU strategic breakdown ────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Building2 size={14} className="text-brand-400" />
            Ativos Estratégicos por BU
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {strategicViews.map((view) => (
              <BuStrategicCard key={view.bu_id} view={view} />
            ))}
          </div>
        </div>

        {/* ── Pathway to recognition ────────────────────────────────────────── */}
        <div className="card p-5 border border-brand-100 bg-brand-50/30">
          <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <ChevronRight size={15} className="text-brand-500" />
            Caminho para Reconhecimento Contábil
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Ativos estratégicos podem migrar para{" "}
            <code className="font-mono bg-brand-50 px-1 rounded text-[10px]">intangible_recognized</code>{" "}
            quando um dos critérios abaixo for atendido:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { label: "Avaliação por terceiro independente", desc: "Laudo de empresa especializada confere base para reconhecimento via IAS 38." },
              { label: "Contrato ou licença formal",          desc: "Direitos contratuais sobre PI, marca ou metodologia permitem capitalização." },
              { label: "Transação de referência",             desc: "M&A, aporte ou joint venture com precificação do ativo como base para fair value." },
              { label: "Teste de separabilidade IFRS",        desc: "O ativo pode ser vendido, licenciado ou transferido separadamente da entidade." },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2 bg-white rounded-lg border border-brand-100 p-3">
                <ChevronRight size={12} className="text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-800">{item.label}</div>
                  <div className="text-gray-500 mt-0.5 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Methodology note ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Camada Estratégica AWQ</span> —
            Ativos com{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">recognition_type: strategic_non_recognized</code>{" "}
            são gerenciados por{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">lib/asset-query.ts</code>{" "}
            como camada separada. Eles NUNCA entram no{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">total_asset_net</code>{" "}
            da holding — a invariância é verificada em cada execução de{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">buildHoldingAssetConsolidated()</code>.
            Os valores estimados apresentados são indicativos e não auditados.
          </p>
        </div>

      </div>
    </>
  );
}
