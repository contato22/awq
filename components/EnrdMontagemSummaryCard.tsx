"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench, CheckCircle2, AlertCircle, Users, ChevronRight, Sun } from "lucide-react";

type Summary = {
  ok: boolean;
  counts: { installations: number; clientes: number };
  kpis?: {
    total: number;
    concluido: number;
    emExecucao: number;
    atencao: number;
    placasTotais: number;
    geracaoEsperadaKwhAno: number;
  };
  lastSync?: { ran_at: string } | null;
};

// Card de resumo do Controle de Montagem na home /enrd. Lê GET da rota de sync
// (que consulta o espelho no banco AWQ). Some silenciosamente se não houver dados.
export default function EnrdMontagemSummaryCard() {
  const [data, setData] = useState<Summary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/enrd/montagem/sync")
      .then((r) => r.json())
      .then((j) => alive && setData(j))
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  // Não renderiza nada até carregar ou se não há instalações no espelho.
  if (!loaded || !data?.ok || (data.counts?.installations ?? 0) === 0) return null;

  const k = data.kpis;
  const stats = [
    { label: "Instalações", value: data.counts.installations, icon: Wrench, color: "text-orange-700", bg: "bg-orange-50" },
    { label: "Concluídas", value: k?.concluido ?? 0, icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Em execução", value: k?.emExecucao ?? 0, icon: Wrench, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Atenção", value: k?.atencao ?? 0, icon: AlertCircle, color: "text-red-700", bg: "bg-red-50" },
    { label: "Clientes", value: data.counts.clientes, icon: Users, color: "text-brand-700", bg: "bg-brand-50" },
  ];

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench size={14} className="text-orange-600" />
          <h2 className="text-base font-semibold text-gray-900">Controle de Montagem</h2>
          {data.lastSync && (
            <span className="text-xs text-gray-400">
              · sync {new Date(data.lastSync.ran_at).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        <Link
          href="/enrd/montagem"
          className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1 font-medium"
        >
          Abrir <ChevronRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={14} className={s.color} />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 leading-none">
                {s.value.toLocaleString("pt-BR")}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {k && k.geracaoEsperadaKwhAno > 0 && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-gray-500">
          <Sun size={12} className="text-orange-500" />
          {Math.round(k.geracaoEsperadaKwhAno).toLocaleString("pt-BR")} kWh/ano de geração esperada ·{" "}
          {k.placasTotais.toLocaleString("pt-BR")} placas
        </div>
      )}
    </section>
  );
}
