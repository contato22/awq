"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { Activity, ArrowLeft, Phone, Mail, MessageSquare, Repeat2, FileText, Users, BookOpen } from "lucide-react";
import { fetchAdvisorCRM } from "@/lib/advisor-crm-query";
import type { AdvisorCrmInteraction } from "@/lib/advisor-crm-db";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function InteractionIcon({ tipo }: { tipo: string }) {
  const cls = "w-8 h-8 rounded-xl flex items-center justify-center shrink-0";
  if (tipo === "Ligação")           return <div className={`${cls} bg-emerald-500/10`}><Phone size={14} className="text-emerald-400" /></div>;
  if (tipo === "Reunião")           return <div className={`${cls} bg-violet-500/10`}><Users size={14} className="text-violet-400" /></div>;
  if (tipo === "Workshop")          return <div className={`${cls} bg-brand-500/10`}><BookOpen size={14} className="text-brand-400" /></div>;
  if (tipo === "WhatsApp")          return <div className={`${cls} bg-green-500/10`}><MessageSquare size={14} className="text-green-400" /></div>;
  if (tipo === "E-mail")            return <div className={`${cls} bg-blue-500/10`}><Mail size={14} className="text-blue-400" /></div>;
  if (tipo === "Follow-up")         return <div className={`${cls} bg-amber-500/10`}><Repeat2 size={14} className="text-amber-400" /></div>;
  if (tipo === "Proposta Enviada" || tipo === "Apresentação")
                                    return <div className={`${cls} bg-orange-500/10`}><FileText size={14} className="text-orange-400" /></div>;
  return <div className={`${cls} bg-gray-500/10`}><Activity size={14} className="text-gray-400" /></div>;
}

export default function AdvisorCrmInteracoesPage() {
  const [ints,    setInts]    = useState<AdvisorCrmInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdvisorCRM<AdvisorCrmInteraction>("interactions").then((data) => {
      const sorted = [...data].sort((a, b) => b.data.localeCompare(a.data));
      setInts(sorted);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <Header title="Interações — Advisor" subtitle="Histórico de relacionamento" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/advisor/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
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
                  <InteractionIcon tipo={i.tipo} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-bold text-gray-200">{i.tipo}</span>
                      {i.canal && <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-md">{i.canal}</span>}
                      <span className="text-[10px] text-gray-600">{fmtDate(i.data)}</span>
                      {i.risco_percebido !== "Baixo" && (
                        <span className={`text-[10px] font-semibold ${i.risco_percebido === "Alto" ? "text-red-400" : "text-amber-400"}`}>
                          ⚠ Risco {i.risco_percebido}
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
