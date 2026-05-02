"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";
import { fetchVentureCRM } from "@/lib/venture-crm-query";
import type { VentureCrmInteraction } from "@/lib/venture-crm-db";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const SIGNAL_COLORS: Record<string, string> = {
  "Positivo": "text-emerald-400",
  "Neutro":   "text-gray-400",
  "Negativo": "text-red-400",
};

export default function VentureCrmInteracoesPage() {
  const [ints,    setInts]    = useState<VentureCrmInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVentureCRM<VentureCrmInteraction>("interactions").then((data) => {
      const sorted = [...data].sort((a, b) => b.data.localeCompare(a.data));
      setInts(sorted);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <Header title="Interações — AWQ Venture" subtitle="Histórico de engajamento com founders" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/awq-venture/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft size={12} /> CRM
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-gray-400">Interações</span>
        </div>

        <div className="card p-5">
          <SectionHeader icon={<Activity size={15} />} title={`Interações (${ints.length})`} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : ints.length === 0 ? (
            <EmptyState compact icon={<Activity size={16} className="text-gray-400" />}
              title="Nenhuma interação registrada" description="As interações aparecerão aqui após serem cadastradas." />
          ) : (
            <div className="space-y-3">
              {ints.map((i) => (
                <div key={i.id} className="flex items-start gap-3 p-4 rounded-xl bg-gray-800/40 border border-gray-800 hover:border-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                    <Activity size={14} className="text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-bold text-gray-200">{i.tipo}</span>
                      <span className="text-[10px] text-gray-600">{fmtDate(i.data)}</span>
                      {i.signal !== "Neutro" && (
                        <span className={`text-[10px] font-semibold ${SIGNAL_COLORS[i.signal] ?? ""}`}>
                          ● {i.signal}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-300 leading-relaxed mb-2">{i.resumo}</p>
                    {i.proximo_passo && (
                      <div className="text-[11px] text-brand-400">→ {i.proximo_passo}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-[10px] text-gray-600">{i.responsavel}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
