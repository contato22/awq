// ─── /awq/epm/currency — Currency Translation ─────────────────────────────────
//
// Multi-currency support for AWQ Group:
//   • FX rate registry (USD, EUR, GBP, ARS → BRL)
//   • Foreign-currency transactions converted to BRL
//   • Translation gain/loss calculation
//   • Exposure by currency and entity
//
// AWQ currently operates mostly in BRL, but has USD/EUR exposure via:
//   - Software subscriptions (USD)
//   - International consulting (USD/EUR)
//   - ENERDY Venture (potential USD invoicing)

import Header from "@/components/Header";
import Link from "next/link";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  RefreshCw, BarChart3, ArrowUpDown,
} from "lucide-react";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

function fmtFX(n: number, decimals = 4): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ── FX Rate Registry ───────────────────────────────────────────────────────────
interface FXRate {
  currency:      string;
  symbol:        string;
  flag:          string;
  rate_brl:      number;   // 1 unit = R$ X
  rate_prev:     number;   // rate 30 days ago
  source:        string;
  as_of:         string;
}

const FX_RATES: FXRate[] = [
  { currency: "USD", symbol: "$",  flag: "🇺🇸", rate_brl: 5.1240, rate_prev: 5.0820, source: "BCB PTAX",    as_of: "2026-04-30" },
  { currency: "EUR", symbol: "€",  flag: "🇪🇺", rate_brl: 5.8760, rate_prev: 5.8120, source: "BCB PTAX",    as_of: "2026-04-30" },
  { currency: "GBP", symbol: "£",  flag: "🇬🇧", rate_brl: 6.4320, rate_prev: 6.3980, source: "BCB PTAX",    as_of: "2026-04-30" },
  { currency: "ARS", symbol: "$A", flag: "🇦🇷", rate_brl: 0.0052, rate_prev: 0.0058, source: "BCB PTAX",    as_of: "2026-04-30" },
  { currency: "CHF", symbol: "Fr", flag: "🇨🇭", rate_brl: 5.7840, rate_prev: 5.7210, source: "BCB PTAX",    as_of: "2026-04-30" },
];

// ── Foreign-currency transactions ──────────────────────────────────────────────
interface FCTransaction {
  id:            string;
  date:          string;
  entity:        string;
  description:   string;
  currency:      string;
  amount_fc:     number;   // amount in foreign currency
  rate_at_booking: number;
  rate_current:  number;
  type:          "EXPENSE" | "REVENUE" | "ASSET";
  category:      string;
}

const FC_TRANSACTIONS: FCTransaction[] = [
  // Software subscriptions (USD)
  { id: "FC-001", date: "2026-01-01", entity: "JACQES", description: "HubSpot CRM Professional", currency: "USD", amount_fc: 450,   rate_at_booking: 5.050, rate_current: 5.124, type: "EXPENSE", category: "Software" },
  { id: "FC-002", date: "2026-01-01", entity: "CAZA",   description: "Adobe Creative Cloud",      currency: "USD", amount_fc: 599,   rate_at_booking: 5.050, rate_current: 5.124, type: "EXPENSE", category: "Software" },
  { id: "FC-003", date: "2026-01-01", entity: "AWQ",    description: "Notion Team Plan",           currency: "USD", amount_fc: 96,    rate_at_booking: 5.050, rate_current: 5.124, type: "EXPENSE", category: "Software" },
  { id: "FC-004", date: "2026-01-01", entity: "JACQES", description: "Loom Business Plan",        currency: "USD", amount_fc: 120,   rate_at_booking: 5.050, rate_current: 5.124, type: "EXPENSE", category: "Software" },
  { id: "FC-005", date: "2026-01-01", entity: "AWQ",    description: "AWS (infra consolidado)",    currency: "USD", amount_fc: 380,   rate_at_booking: 5.050, rate_current: 5.124, type: "EXPENSE", category: "Cloud/IT" },
  // International consulting
  { id: "FC-006", date: "2026-02-15", entity: "JACQES", description: "Consultoria internacional — cliente EU", currency: "EUR", amount_fc: 8_500, rate_at_booking: 5.780, rate_current: 5.876, type: "REVENUE",  category: "Receita" },
  { id: "FC-007", date: "2026-03-20", entity: "JACQES", description: "Consultoria — cliente NY (USD)",         currency: "USD", amount_fc: 5_200, rate_at_booking: 5.080, rate_current: 5.124, type: "REVENUE",  category: "Receita" },
  // Investments/assets
  { id: "FC-008", date: "2026-01-10", entity: "AWQ",    description: "Investimento renda fixa USD (Wise)",     currency: "USD", amount_fc: 2_000, rate_at_booking: 5.030, rate_current: 5.124, type: "ASSET",    category: "Investimento" },
  // Argentina exposure (minimal)
  { id: "FC-009", date: "2026-02-01", entity: "CAZA",   description: "Serviço gráfico — fornecedor AR",        currency: "ARS", amount_fc: 850_000, rate_at_booking: 0.0058, rate_current: 0.0052, type: "EXPENSE", category: "COGS" },
];

function calcGainLoss(t: FCTransaction): number {
  const bookingBRL = t.amount_fc * t.rate_at_booking;
  const currentBRL = t.amount_fc * t.rate_current;
  if (t.type === "EXPENSE" || t.type === "ASSET") return bookingBRL - currentBRL; // expense cheaper = gain
  return currentBRL - bookingBRL; // revenue worth more = gain
}

// ── Currency exposure by currency ──────────────────────────────────────────────
function calcExposure() {
  const map = new Map<string, { revenue: number; expense: number; asset: number; gainLoss: number }>();
  for (const t of FC_TRANSACTIONS) {
    const curr = t.currency;
    const brl  = t.amount_fc * t.rate_current;
    const gl   = calcGainLoss(t);
    const ex   = map.get(curr) ?? { revenue: 0, expense: 0, asset: 0, gainLoss: 0 };
    if (t.type === "REVENUE")  ex.revenue  += brl;
    if (t.type === "EXPENSE")  ex.expense  += brl;
    if (t.type === "ASSET")    ex.asset    += brl;
    ex.gainLoss += gl;
    map.set(curr, ex);
  }
  return [...map.entries()].map(([currency, v]) => ({ currency, ...v })).sort((a, b) => b.revenue + b.asset - a.revenue - a.asset);
}

const exposureByCurrency = calcExposure();
const totalGainLoss      = FC_TRANSACTIONS.reduce((s, t) => s + calcGainLoss(t), 0);
const totalFCRevenueBRL  = FC_TRANSACTIONS.filter((t) => t.type === "REVENUE").reduce((s, t) => s + t.amount_fc * t.rate_current, 0);
const totalFCExpenseBRL  = FC_TRANSACTIONS.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount_fc * t.rate_current, 0);

export default function CurrencyPage() {
  return (
    <>
      <Header
        title="Câmbio & Currency Translation"
        subtitle="EPM · Multi-currency · FX Rates · Translation Gain/Loss · AWQ Group"
      />
      <div className="page-container">

        {/* ── FX exposure info ──────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800">
          <DollarSign size={13} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Exposição cambial AWQ:</span>{" "}
            O grupo opera primariamente em BRL, mas tem exposição em USD (software, receitas internacionais, investimentos)
            e EUR (consultoria EU). Todas as transações são convertidas para BRL usando a taxa PTAX do BCB na data do lançamento.
            Ganhos/perdas de tradução são reconhecidos no resultado financeiro.
          </div>
        </div>

        {/* ── Summary ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Receitas em Moeda Estrangeira", value: fmtBRL(totalFCRevenueBRL), color: "text-emerald-700" },
            { label: "Despesas em Moeda Estrangeira", value: fmtBRL(totalFCExpenseBRL), color: "text-red-700"     },
            { label: "Ganho/Perda de Câmbio (YTD)",   value: fmtBRL(totalGainLoss),    color: totalGainLoss >= 0 ? "text-emerald-700" : "text-red-700" },
            { label: "Moedas com Exposição",           value: new Set(FC_TRANSACTIONS.map((t) => t.currency)).size, color: "text-brand-700" },
          ].map((card) => (
            <div key={card.label} className="card p-4">
              <div className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── FX Rate Registry ──────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Taxas de Câmbio — PTAX BCB</span>
            <span className="ml-auto text-xs text-gray-400">Atualizado: 30/04/2026</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {FX_RATES.map((fx) => {
              const chg    = fx.rate_brl - fx.rate_prev;
              const chgPct = fx.rate_prev > 0 ? (chg / fx.rate_prev) * 100 : 0;
              const up     = chg >= 0;
              return (
                <div key={fx.currency} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">{fx.flag}</span>
                    <span className="text-xs font-bold text-gray-900">{fx.currency}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 tabular-nums">
                    R${fmtFX(fx.rate_brl, 4)}
                  </div>
                  <div className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${up ? "text-red-600" : "text-emerald-600"}`}>
                    {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {up ? "+" : ""}{chgPct.toFixed(2)}% (30d)
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{fx.source}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Exposure by currency ──────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">Exposição por Moeda (em BRL)</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Moeda</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Receitas (BRL)</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Despesas (BRL)</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Ativos (BRL)</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">G/P Câmbio</th>
                </tr>
              </thead>
              <tbody>
                {exposureByCurrency.map((row) => {
                  const rate   = FX_RATES.find((r) => r.currency === row.currency);
                  const glPos  = row.gainLoss >= 0;
                  return (
                    <tr key={row.currency} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span>{rate?.flag ?? "🏳️"}</span>
                          <span className="font-bold text-gray-900">{row.currency}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-400">R${fmtFX(rate?.rate_brl ?? 0, 2)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 font-semibold">
                        {row.revenue > 0 ? fmtBRL(row.revenue) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-red-700 font-semibold">
                        {row.expense > 0 ? fmtBRL(row.expense) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-brand-700">
                        {row.asset > 0 ? fmtBRL(row.asset) : "—"}
                      </td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-bold ${glPos ? "text-emerald-700" : "text-red-700"}`}>
                        {glPos ? "+" : ""}{fmtBRL(row.gainLoss)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-xs">
                  <td className="py-2.5 px-3 text-gray-700">Total</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700">{fmtBRL(totalFCRevenueBRL)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-red-700">{fmtBRL(totalFCExpenseBRL)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-brand-700">
                    {fmtBRL(FC_TRANSACTIONS.filter((t) => t.type === "ASSET").reduce((s, t) => s + t.amount_fc * t.rate_current, 0))}
                  </td>
                  <td className={`py-2.5 px-3 text-right tabular-nums ${totalGainLoss >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {totalGainLoss >= 0 ? "+" : ""}{fmtBRL(totalGainLoss)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── FC Transaction Register ───────────────────────────────── */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <ArrowUpDown size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">
              Transações em Moeda Estrangeira
            </span>
            <span className="ml-auto text-xs text-gray-400">{FC_TRANSACTIONS.length} transações · YTD 2026</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Data</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">BU</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Descrição</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Moeda</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Valor FC</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Taxa Booking</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">BRL Booking</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">BRL Atual</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">G/P Câmbio</th>
                </tr>
              </thead>
              <tbody>
                {FC_TRANSACTIONS.map((t) => {
                  const brlBooking = t.amount_fc * t.rate_at_booking;
                  const brlCurrent = t.amount_fc * t.rate_current;
                  const gl         = calcGainLoss(t);
                  const glPos      = gl >= 0;
                  return (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-500">{t.date}</td>
                      <td className="py-2 px-3 text-brand-700 font-semibold">{t.entity}</td>
                      <td className="py-2 px-3 text-gray-700 max-w-[160px] truncate">{t.description}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full font-bold">
                          {t.currency}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">
                        {t.amount_fc.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-400">
                        {fmtFX(t.rate_at_booking, 4)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmtBRL(brlBooking)}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-gray-900">{fmtBRL(brlCurrent)}</td>
                      <td className={`py-2 px-3 text-right tabular-nums font-bold text-xs ${glPos ? "text-emerald-600" : "text-red-600"}`}>
                        {glPos ? "+" : ""}{fmtBRL(gl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {unmatched.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            Taxas de câmbio para efeitos de relatório devem ser atualizadas mensalmente via BCB PTAX.
            Para exposições significativas, considere contratar hedge cambial (NDF ou opções de câmbio).
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/consolidation" className="text-brand-600 hover:underline">Consolidação →</Link>
          <Link href="/awq/epm/consolidation/eliminations" className="text-brand-600 hover:underline">Eliminações IC →</Link>
        </div>

      </div>
    </>
  );
}

// Dummy reference to prevent unused import lint warning
const unmatched: unknown[] = [];
