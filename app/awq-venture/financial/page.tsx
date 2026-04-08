import Header from "@/components/Header";
import {
  DollarSign,
  TrendingUp,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// ─── /awq-venture/financial — AWQ Venture · Posição Empírica ─────────────────
//
// FONTE AUTORITATIVA: lib/awq-group-data.ts buData["venture"]
//   capitalAllocated: 15_762.62  — CDB DI Itaú Empresas (empirical, print 02/04/2026)
//   cashBalance:      15_762.62  — mesmo valor (saldo investido)
//   revenue:          0          — sem receita operacional de taxas confirmada
//   customers:        0          — sem portfólio de startups confirmado
//
// EMPIRICAL SOURCE: print bancário Itaú Empresas AWQ (02/04/2026)
//   CDB DI saldo investido:     R$ 15.762,62
//   Conta corrente (não invest): R$  1.193,58
//
// IMPORTANT: o portfólio anterior (TechFlow R$22.4M, Verde R$31.2M, Saúde Digital
// exit R$18.5M, etc.) era FICTÍCIO — R$40.5M investidos sem nenhum respaldo
// bancário. Removido completamente.

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(2) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Empirical data — sourced from bank print 02/04/2026 ─────────────────────
const cdbDI = {
  saldoInvestido:  15_762.62,   // CDB DI — confirmado por print Itaú Empresas
  contaCorrente:   1_193.58,    // saldo conta corrente — NÃO investido
  totalLiquidez:   16_956.20,   // CDB DI + conta corrente
  dataReferencia:  "02/04/2026",
  banco:           "Itaú Empresas",
  instrumento:     "CDB DI (renda fixa)",
};

export default function AwqVentureFinancialPage() {
  return (
    <>
      <Header
        title="Financial — AWQ Venture"
        subtitle="Posição empírica confirmada · CDB DI Itaú · Abr/2026"
      />
      <div className="page-container">

        {/* ── Empirical source notice ───────────────────────────────────────── */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-emerald-800">
              Dados empíricos — confirmados por print bancário Itaú Empresas (02/04/2026)
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Saldo CDB DI R$15.762,62 e conta corrente R$1.193,58 validados diretamente
              pelo extrato digital. Nenhum outro ativo confirmado.
            </p>
          </div>
        </div>

        {/* ── Position cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "CDB DI — Capital Investido",
              value: fmtR(cdbDI.saldoInvestido),
              sub:   `${cdbDI.banco} · ${cdbDI.instrumento}`,
              icon:  TrendingUp,
              color: "text-emerald-600",
              bg:    "bg-emerald-50",
              badge: "EMPÍRICO",
              badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
            },
            {
              label: "Conta Corrente (não investido)",
              value: fmtR(cdbDI.contaCorrente),
              sub:   "Saldo disponível em conta — NÃO investido",
              icon:  DollarSign,
              color: "text-brand-600",
              bg:    "bg-brand-50",
              badge: "EMPÍRICO",
              badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
            },
            {
              label: "Total de Liquidez",
              value: fmtR(cdbDI.totalLiquidez),
              sub:   `CDB DI + conta corrente · ref. ${cdbDI.dataReferencia}`,
              icon:  DollarSign,
              color: "text-amber-700",
              bg:    "bg-amber-50",
              badge: "EMPÍRICO",
              badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Position detail ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Posição Detalhada — {cdbDI.dataReferencia}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">EMPÍRICO</span>
          </h2>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Instrumento</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Banco</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Saldo</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="text-xs font-medium text-gray-900">CDB DI</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Renda fixa pós-fixada</div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-gray-500">{cdbDI.banco}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">Investimento</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">
                    {fmtR(cdbDI.saldoInvestido)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="badge badge-green">Ativo</span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="text-xs font-medium text-gray-900">Conta Corrente</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Saldo disponível</div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-gray-500">{cdbDI.banco}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">Caixa</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">
                    {fmtR(cdbDI.contaCorrente)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="badge badge-green">Disponível</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                  <td colSpan={2} />
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-amber-700">
                    {fmtR(cdbDI.totalLiquidez)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Portfolio pre-tese notice ─────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Portfólio de startups: nenhum ativo confirmado (pré-tese)
            </p>
            <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
              A BU Venture ainda não possui investimentos em startups confirmados por
              documentos ou extratos. O único capital alocado empiricamente verificado
              é o CDB DI acima. Quando um investimento for realizado e documentado,
              os detalhes aparecerão nesta tabela.
            </p>
            <p className="text-[11px] text-amber-600 mt-2">
              Fonte autoritativa:{" "}
              <code className="bg-amber-100 px-1 rounded text-[10px]">lib/awq-group-data.ts</code>
              {" "}→ buData["venture"].capitalAllocated = R$ 15.762,62
            </p>
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Capital Investido",   value: fmtR(cdbDI.saldoInvestido), sub: "CDB DI confirmado"  },
            { label: "Portfólio Startups",  value: "0",                         sub: "Sem aportes"       },
            { label: "Exits Realizados",    value: "0",                         sub: "Sem saídas"        },
            { label: "IRR / MOIC",          value: "—",                         sub: "Sem histórico"     },
          ].map((m) => (
            <div key={m.label} className="card p-5">
              <div className="text-2xl font-bold text-gray-900">{m.value}</div>
              <div className="text-xs font-medium text-gray-400 mt-0.5">{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-1">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Snapshot registry note ────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
          <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-500">
            <strong>Dados removidos:</strong> portfólio anterior de 6 empresas (TechFlow R$22.4M,
            Verde Energia R$31.2M, Saúde Digital exit R$18.5M, AgriSmart, FinBridge, Logística Plus)
            totalizando R$40.5M investidos e MOIC 2.4× eram <strong>fictícios</strong> — sem extrato
            bancário ou contrato de investimento. Mantê-los comprometia o P&L consolidado e
            enganava decisões da holding.
          </p>
        </div>

      </div>
    </>
  );
}
