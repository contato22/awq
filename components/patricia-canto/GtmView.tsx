"use client";

import { useMemo } from "react";
import type { Channel, Lead } from "@/lib/patricia-canto/leads";
import { CHANNELS } from "@/lib/patricia-canto/leads";

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
  const byChannel = useMemo(() => {
    return CHANNELS.map((c) => {
      const channelLeads = leads.filter((l) => l.origem === c.id);
      const won = channelLeads.filter((l) => l.stage === "ganho");
      const inv = investment[c.id];
      return {
        ...c,
        total: channelLeads.length,
        won: won.length,
        conversao: channelLeads.length > 0 ? (won.length / channelLeads.length) * 100 : null,
        cac: inv != null && channelLeads.length > 0 ? inv / channelLeads.length : null,
      };
    });
  }, [leads, investment]);

  const semOrigem = leads.filter((l) => !l.origem).length;
  const pctSemOrigem = leads.length > 0 ? (semOrigem / leads.length) * 100 : 0;

  const slaHoras = useMemo(() => {
    const pares = leads
      .filter((l) => l.dataPrimeiroContato)
      .map((l) => (new Date(l.dataPrimeiroContato!).getTime() - new Date(l.dataEntrada).getTime()) / 3_600_000)
      .filter((h) => h >= 0);
    return pares.length > 0 ? pares.reduce((a, b) => a + b, 0) / pares.length : null;
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Leads sem origem preenchida" value={`${semOrigem} (${pctSemOrigem.toFixed(0)}%)`} warn={pctSemOrigem > 20} />
        <Stat label="SLA médio de 1º contato" value={slaHoras == null ? "— (sem dados)" : `${slaHoras.toFixed(1)}h`} />
        <Stat label="Meta de SLA" value="< 1h em horário comercial" />
      </div>

      <div className="rounded-xl border border-canto-200 bg-white p-4">
        <h3 className="font-canto-serif text-base font-semibold text-canto-900">Canais de aquisição</h3>
        <p className="mt-1 text-xs text-canto-500">
          Preencha o investimento do período (opcional) para calcular o CAC por canal. Sem esse dado, o CAC fica
          em branco — não estimamos valores.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-canto-200 text-left text-xs uppercase tracking-wide text-canto-500">
                <th className="py-2 pr-3">Canal</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Leads</th>
                <th className="py-2 pr-3">Conversão</th>
                <th className="py-2 pr-3">Investimento (R$)</th>
                <th className="py-2 pr-3">CAC</th>
              </tr>
            </thead>
            <tbody>
              {byChannel.map((c) => (
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

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${warn ? "border-amber-300 bg-amber-50" : "border-canto-200 bg-canto-50"}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-canto-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${warn ? "text-amber-700" : "text-canto-900"}`}>{value}</p>
    </div>
  );
}
