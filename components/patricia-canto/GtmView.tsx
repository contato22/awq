"use client";

import { useMemo } from "react";
import type { Channel, Lead } from "@/lib/patricia-canto/leads";
import { CHANNELS } from "@/lib/patricia-canto/leads";
import { computeGtmMetrics } from "@/lib/patricia-canto/metrics";
import StatTile from "./StatTile";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function GtmView({
  leads,
  investment,
  onInvestmentChange,
}: {
  leads: Lead[];
  investment: Partial<Record<Channel, number>>;
  onInvestmentChange: (channel: Channel, value: number | null) => void;
}) {
  const metrics = useMemo(() => computeGtmMetrics(leads, investment), [leads, investment]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Leads sem origem preenchida"
          value={`${metrics.semOrigem} (${metrics.pctSemOrigem.toFixed(0)}%)`}
          variant={metrics.pctSemOrigem > 20 ? "warn" : "default"}
        />
        <StatTile
          label="SLA médio de 1º contato"
          value={metrics.slaHoras == null ? "— (sem dados)" : `${metrics.slaHoras.toFixed(1)}h`}
        />
        <StatTile label="Meta de SLA" value="< 1h em horário comercial" />
      </div>

      <div className="rounded-xl border border-canto-200 bg-white p-4">
        <h3 className="font-canto-serif text-base font-semibold text-canto-900">Canais de aquisição</h3>
        <p className="mt-1 text-xs text-canto-500">
          Preencha o investimento do período (opcional) para calcular CAC e ROI por canal. Sem esse dado, os dois
          ficam em branco — não estimamos valores. ROI usa receita realizada (honorários de leads já fechados),
          não o pipeline em aberto.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-canto-200 text-left text-xs uppercase tracking-wide text-canto-500">
                <th className="py-2 pr-3">Canal</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Leads</th>
                <th className="py-2 pr-3">Conversão</th>
                <th className="py-2 pr-3">Investimento (R$)</th>
                <th className="py-2 pr-3">CAC</th>
                <th className="py-2 pr-3">Receita fechada</th>
                <th className="py-2 pr-3">ROI</th>
              </tr>
            </thead>
            <tbody>
              {metrics.byChannel.map((c) => (
                <tr key={c.id} className="border-b border-canto-100 last:border-0">
                  <td className="py-2 pr-3 font-medium text-canto-900">{c.id}</td>
                  <td className="py-2 pr-3 text-canto-500">{c.tipo}</td>
                  <td className="py-2 pr-3 text-canto-700">{c.total}</td>
                  <td className="py-2 pr-3 text-canto-700">{c.conversao == null ? "—" : `${c.conversao.toFixed(0)}%`}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={investment[c.id] ?? ""}
                      onChange={(e) =>
                        onInvestmentChange(c.id, e.target.value === "" ? null : Number(e.target.value))
                      }
                      placeholder="0,00"
                      className="w-28 rounded-md border border-canto-200 px-2 py-1 text-sm outline-none focus:border-canto-500"
                    />
                  </td>
                  <td className="py-2 pr-3 font-semibold text-canto-800">{c.cac == null ? "—" : currency(c.cac)}</td>
                  <td className="py-2 pr-3 text-canto-700">{currency(c.receita)}</td>
                  <td
                    className={`py-2 pr-3 font-semibold ${
                      c.roi == null ? "text-canto-800" : c.roi >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {c.roi == null ? "—" : `${c.roi >= 0 ? "+" : ""}${c.roi.toFixed(0)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 space-y-0.5 text-[11px] text-canto-400">
          {CHANNELS.map((c) => (
            <li key={c.id}>
              <span className="font-medium text-canto-500">{c.id}:</span> {c.observacao}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
