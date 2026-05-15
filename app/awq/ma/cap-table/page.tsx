"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  Users, PieChart, TrendingUp, Calendar, ChevronRight,
  Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { SEED_PORTCOS, SEED_CAP_TABLE } from "@/lib/ma-seed-data";
import { formatBRL } from "@/lib/utils";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapEntry {
  cap_table_id: string;
  portco_id: string;
  shareholder_name: string;
  shareholder_type: string;
  shareholder_entity?: string;
  share_class: string;
  shares_held: number;
  ownership_pct: number;
  vesting_schedule?: string;
  vesting_start_date?: string;
  vesting_cliff_date?: string;
  vesting_end_date?: string;
  shares_vested: number;
  shares_unvested?: number;
  cost_per_share?: number;
  total_cost_basis?: number;
  acquisition_date?: string;
  is_active: boolean;
}

interface Portco {
  portco_id: string;
  portco_code: string;
  legal_name: string;
  trade_name?: string;
  awq_ownership_pct?: number;
  total_shares_outstanding?: number;
  current_valuation?: number;
  entry_valuation?: number;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

function fmtPct(n?: number | null) {
  if (n == null) return "—";
  return n.toFixed(1) + "%";
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const typeColors: Record<string, string> = {
  founder:  "bg-amber-500/10 text-amber-400",
  investor: "bg-blue-500/10 text-blue-400",
  employee: "bg-green-500/10 text-green-400",
  advisor:  "bg-purple-500/10 text-purple-400",
};

const classColors: Record<string, string> = {
  common:    "bg-gray-700 text-gray-300",
  preferred: "bg-violet-500/10 text-violet-400",
  options:   "bg-orange-500/10 text-orange-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CapTablePage() {
  const [portcos, setPortcos] = useState<Portco[]>([]);
  const [selectedPortco, setSelectedPortco] = useState<string>("");
  const [capTable, setCapTable] = useState<CapEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load portfolio companies
  useEffect(() => {
    if (IS_STATIC) {
      const active = SEED_PORTCOS.filter(p => p.status === "active") as Portco[];
      setPortcos(active);
      if (active.length > 0) setSelectedPortco(active[0].portco_id);
      return;
    }
    fetch("/api/ma/portfolio")
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const active = (j.data as Portco[]).filter(p => p.status === "active");
          setPortcos(active);
          if (active.length > 0) setSelectedPortco(active[0].portco_id);
        }
      })
      .catch(e => setError(String(e)));
  }, []);

  const loadCapTable = useCallback(async (portco_id: string) => {
    if (!portco_id) return;
    if (IS_STATIC) {
      setCapTable(SEED_CAP_TABLE.filter(c => c.portco_id === portco_id) as unknown as CapEntry[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/ma/cap-table?portco_id=${portco_id}`);
      const j = await r.json();
      if (j.success) setCapTable(j.data as unknown as CapEntry[]);
      else setError(j.error);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPortco) loadCapTable(selectedPortco);
  }, [selectedPortco, loadCapTable]);

  const currentPortco = portcos.find(p => p.portco_id === selectedPortco);

  // Dilution model: if Enerdy raises a round
  const [dilutionNewShares, setDilutionNewShares] = useState(0);
  const dilutedTotal = (currentPortco?.total_shares_outstanding ?? 1000000) + dilutionNewShares;
  const awqEntry = capTable.find(e => e.shareholder_name === "AWQ Group");
  const awqDilutedPct = awqEntry ? (awqEntry.shares_held / dilutedTotal) * 100 : 0;

  const totalValue = currentPortco?.current_valuation ?? 0;

  return (
    <>
      <Header title="Cap Table" subtitle="Gestão de Participações — AWQ Group" />
      <div className="px-6 py-6 space-y-6">

        {/* Portco selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Empresa Investida:</label>
          <select
            value={selectedPortco}
            onChange={e => setSelectedPortco(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {portcos.map(p => (
              <option key={p.portco_id} value={p.portco_id}>
                {p.legal_name} ({p.portco_code})
              </option>
            ))}
          </select>
          {currentPortco && (
            <Link href="/awq/ma/deals" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              Ver Deal <ChevronRight size={12} />
            </Link>
          )}
        </div>

        {/* Summary cards */}
        {currentPortco && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Participação AWQ", value: fmtPct(currentPortco.awq_ownership_pct), icon: PieChart, color: "text-blue-400" },
              { label: "Total Shares", value: fmtNum(currentPortco.total_shares_outstanding), icon: Users, color: "text-green-400" },
              { label: "Valuation Atual", value: formatBRL(currentPortco.current_valuation), icon: TrendingUp, color: "text-purple-400" },
              { label: "Valor Stake AWQ", value: formatBRL((currentPortco.awq_ownership_pct ?? 0) / 100 * (currentPortco.current_valuation ?? 0)), icon: PieChart, color: "text-amber-400" },
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
        )}

        {/* Error / Loading */}
        {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-3">{error}</div>}
        {loading && <div className="text-gray-400 text-sm">Carregando cap table...</div>}

        {/* Cap Table */}
        {!loading && capTable.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="font-semibold text-white">Tabela de Capitalização</h2>
              <span className="text-xs text-gray-500">{capTable.length} acionistas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    {["Acionista", "Tipo", "Classe", "Ações", "Participação", "Vested", "Não-Vested", "Custo/Ação", "Custo Total", "Data Aquisição"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {capTable.map(entry => (
                    <tr key={entry.cap_table_id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{entry.shareholder_name}</div>
                        {entry.shareholder_entity && (
                          <div className="text-xs text-gray-500">{entry.shareholder_entity}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[entry.shareholder_type] ?? "bg-gray-700 text-gray-400"}`}>
                          {entry.shareholder_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${classColors[entry.share_class] ?? "bg-gray-700 text-gray-400"}`}>
                          {entry.share_class}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">{fmtNum(entry.shares_held)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-400 text-right">{fmtPct(entry.ownership_pct)}</td>
                      <td className="px-4 py-3 text-sm text-green-400 text-right">{fmtNum(entry.shares_vested)}</td>
                      <td className="px-4 py-3 text-sm text-orange-400 text-right">{fmtNum(entry.shares_unvested)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 text-right">
                        {entry.cost_per_share != null ? `R$${entry.cost_per_share.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatBRL(entry.total_cost_basis)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{fmtDate(entry.acquisition_date)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-700 bg-gray-900/50">
                  <tr>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-400" colSpan={3}>TOTAL</td>
                    <td className="px-4 py-3 text-sm font-bold text-white text-right">
                      {fmtNum(capTable.reduce((s, e) => s + (e.shares_held || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-400 text-right">
                      {fmtPct(capTable.reduce((s, e) => s + (e.ownership_pct || 0), 0))}
                    </td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Vesting Schedule */}
        {capTable.some(e => e.vesting_schedule) && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-amber-400" />
              Vesting Schedules
            </h3>
            <div className="space-y-3">
              {capTable.filter(e => e.vesting_schedule).map(entry => {
                const vestedPct = entry.shares_held > 0 ? (entry.shares_vested / entry.shares_held) * 100 : 0;
                return (
                  <div key={entry.cap_table_id} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">{entry.shareholder_name}</span>
                      <span className="text-xs text-gray-500">{entry.vesting_schedule}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${vestedPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right">{vestedPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Cliff: {fmtDate(entry.vesting_cliff_date)}</span>
                      <span>Fim: {fmtDate(entry.vesting_end_date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dilution Modeler */}
        {currentPortco && awqEntry && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-400" />
              Modelagem de Diluição
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm text-gray-400">Novas ações emitidas (simulação):</label>
              <input
                type="number"
                value={dilutionNewShares}
                onChange={e => setDilutionNewShares(Number(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm w-36"
                placeholder="0"
                min={0}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">AWQ Atual</div>
                <div className="text-lg font-bold text-blue-400">{fmtPct(awqEntry.ownership_pct)}</div>
                <div className="text-xs text-gray-500">{fmtNum(awqEntry.shares_held)} ações</div>
              </div>
              <div className="flex items-center justify-center text-gray-600">→</div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">AWQ Pós-Diluição</div>
                <div className={`text-lg font-bold ${awqDilutedPct < (awqEntry.ownership_pct ?? 0) ? "text-orange-400" : "text-blue-400"}`}>
                  {awqDilutedPct.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">{fmtNum(dilutedTotal)} total ações</div>
              </div>
            </div>
            {dilutionNewShares > 0 && (
              <div className="mt-3 p-3 bg-orange-500/10 rounded-lg">
                <p className="text-xs text-orange-400">
                  Diluição de {fmtPct((awqEntry.ownership_pct ?? 0) - awqDilutedPct)} na participação AWQ.
                  Valor stake: {formatBRL(awqDilutedPct / 100 * totalValue)} ({fmtPct(awqDilutedPct)})
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
