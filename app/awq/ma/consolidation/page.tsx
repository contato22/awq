"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import {
  BarChart3, TrendingUp, ArrowUpDown, Building2,
  CheckCircle2, AlertTriangle, DollarSign, Layers,
} from "lucide-react";
import { SEED_CONSOLIDATED, SEED_INTERCOMPANY } from "@/lib/ma-seed-data";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsolidatedSnapshot {
  equity_portfolio: {
    total_invested: number;
    total_current_value: number;
    unrealized_gain: number;
    avg_multiple: number;
  };
  intercompany: {
    total_transactions: number;
    total_eliminated: number;
    pending_elimination: number;
  };
  media_obligations: {
    total_committed: number;
    total_delivered: number;
    total_remaining: number;
    delivery_pct: number;
  };
}

interface IcTransaction {
  ic_transaction_id: string;
  transaction_date: string;
  transaction_type?: string;
  from_entity_name?: string;
  to_entity_name?: string;
  amount: number;
  elimination_status: string;
  description?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n?: number | null) {
  if (n == null) return "R$0";
  if (Math.abs(n) >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const elimColors: Record<string, string> = {
  eliminated: "bg-green-500/10 text-green-400",
  pending:    "bg-amber-500/10 text-amber-400",
  excluded:   "bg-gray-700 text-gray-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsolidationPage() {
  const [snapshot, setSnapshot] = useState<ConsolidatedSnapshot | null>(null);
  const [transactions, setTransactions] = useState<IcTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_STATIC) {
      setSnapshot(SEED_CONSOLIDATED as ConsolidatedSnapshot);
      setTransactions(SEED_INTERCOMPANY as IcTransaction[]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [consRes, icRes] = await Promise.all([
          fetch("/api/ma/consolidated"),
          fetch("/api/ma/intercompany"),
        ]);
        const [consJson, icJson] = await Promise.all([consRes.json(), icRes.json()]);
        if (consJson.success) setSnapshot(consJson.data as ConsolidatedSnapshot);
        if (icJson.success) setTransactions(icJson.data as IcTransaction[]);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const eliminated = transactions.filter(t => t.elimination_status === "eliminated");
  const pending = transactions.filter(t => t.elimination_status === "pending");

  return (
    <>
      <Header
        title="Consolidação & Intercompany"
        subtitle="Demonstrações Financeiras Consolidadas — Holding AWQ"
      />
      <div className="px-6 py-6 space-y-6">

        {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-3">{error}</div>}
        {loading && <div className="text-gray-400 text-sm">Carregando dados de consolidação...</div>}

        {/* Portfolio Equity Snapshot */}
        {snapshot && (
          <>
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Portfólio de Equity (Marcação a Mercado)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Investido", value: fmtR(snapshot.equity_portfolio.total_invested), icon: DollarSign, color: "text-blue-400" },
                  { label: "Valor Atual", value: fmtR(snapshot.equity_portfolio.total_current_value), icon: TrendingUp, color: "text-green-400" },
                  { label: "Ganho Não Realizado", value: fmtR(snapshot.equity_portfolio.unrealized_gain), icon: BarChart3, color: "text-purple-400" },
                  { label: "Múltiplo Médio", value: snapshot.equity_portfolio.avg_multiple.toFixed(2) + "×", icon: Layers, color: "text-amber-400" },
                ].map(c => {
                  const Icon = c.icon;
                  return (
                    <div key={c.label} className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className={c.color} />
                        <span className="text-xs text-gray-500">{c.label}</span>
                      </div>
                      <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Intercompany Summary */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Eliminações Intercompany
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpDown size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Total Transações IC</span>
                  </div>
                  <div className="text-xl font-bold text-white">{fmtR(snapshot.intercompany.total_transactions)}</div>
                </div>
                <div className="bg-green-500/5 rounded-xl border border-green-700/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-green-400" />
                    <span className="text-xs text-gray-500">Eliminado</span>
                  </div>
                  <div className="text-xl font-bold text-green-400">{fmtR(snapshot.intercompany.total_eliminated)}</div>
                </div>
                <div className="bg-amber-500/5 rounded-xl border border-amber-700/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <span className="text-xs text-gray-500">Pendente Eliminação</span>
                  </div>
                  <div className="text-xl font-bold text-amber-400">{fmtR(snapshot.intercompany.pending_elimination)}</div>
                </div>
              </div>
            </div>

            {/* Media Obligations */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Compromisso de Mídia (M4E)
              </h2>
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Comprometido</div>
                    <div className="text-lg font-bold text-white">{fmtR(snapshot.media_obligations.total_committed)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Entregue</div>
                    <div className="text-lg font-bold text-green-400">{fmtR(snapshot.media_obligations.total_delivered)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Restante</div>
                    <div className="text-lg font-bold text-orange-400">{fmtR(snapshot.media_obligations.total_remaining)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">% Entregue</div>
                    <div className="text-lg font-bold text-blue-400">{snapshot.media_obligations.delivery_pct.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(snapshot.media_obligations.delivery_pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* IC Transactions Table */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Transações Intercompany
            </h2>
            <div className="flex gap-2">
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                {eliminated.length} eliminadas
              </span>
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                {pending.length} pendentes
              </span>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    {["Data", "Tipo", "De", "Para", "Valor", "Status", "Descrição"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {transactions.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                        Nenhuma transação intercompany registrada
                      </td>
                    </tr>
                  )}
                  {transactions.map(t => (
                    <tr key={t.ic_transaction_id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-400">{fmtDate(t.transaction_date)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{t.transaction_type ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{t.from_entity_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{t.to_entity_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white text-right">{fmtR(t.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${elimColors[t.elimination_status] ?? "bg-gray-700 text-gray-400"}`}>
                          {t.elimination_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{t.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Accounting Note */}
        <div className="bg-blue-500/5 border border-blue-700/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <Building2 size={14} />
            Nota Contábil — Equity Method (IFRS / CPC 18)
          </h3>
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Investimentos em coligadas (participação ≥ 20%) registrados pelo Método de Equivalência Patrimonial (MEP).</p>
            <p>• Ganhos de valuation (mark-to-market) reconhecidos no Ativo Não Circulante (1.2.03) — Investimentos/Aplicações LP.</p>
            <p>• Receitas intercompany (entrega de mídia JACQES → Enerdy) eliminadas na consolidação.</p>
            <p>• Compromisso de mídia registrado como Passivo Circulante / Não-Circulante (serviços a prestar).</p>
          </div>
        </div>

      </div>
    </>
  );
}
