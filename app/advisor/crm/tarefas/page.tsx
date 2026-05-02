"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { ClipboardList, ArrowLeft, CheckCircle2 } from "lucide-react";
import { fetchAdvisorCRM } from "@/lib/advisor-crm-query";
import type { AdvisorCrmTask } from "@/lib/advisor-crm-db";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const PRIO_COLORS: Record<string, string> = {
  "Crítica": "text-white bg-red-600",
  "Alta":    "text-red-700 bg-red-100 border border-red-200",
  "Média":   "text-amber-700 bg-amber-100 border border-amber-200",
  "Baixa":   "text-gray-500 bg-gray-100 border border-gray-200",
};

const STATUS_COLORS: Record<string, string> = {
  "Aberta":        "text-blue-400 bg-blue-500/10",
  "Em Andamento":  "text-amber-400 bg-amber-500/10",
  "Concluída":     "text-emerald-400 bg-emerald-500/10",
  "Bloqueada":     "text-red-400 bg-red-500/10",
  "Vencida":       "text-red-400 bg-red-900/20",
};

export default function AdvisorCrmTarefasPage() {
  const [tasks,   setTasks]   = useState<AdvisorCrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<string>("abertas");

  const TODAY = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchAdvisorCRM<AdvisorCrmTask>("tasks").then((data) => {
      setTasks(data);
      setLoading(false);
    });
  }, []);

  const filtered = tasks.filter((t) => {
    if (filter === "abertas") return t.status !== "Concluída";
    if (filter === "vencidas") return t.status !== "Concluída" && t.prazo && t.prazo < TODAY;
    if (filter === "concluidas") return t.status === "Concluída";
    return true;
  });

  return (
    <>
      <Header title="Tarefas — Advisor" subtitle="Follow-ups e ações pendentes" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/advisor/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft size={12} /> CRM
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-gray-400">Tarefas</span>
        </div>

        <div className="flex gap-1.5">
          {[
            { key: "abertas",    label: "Abertas" },
            { key: "vencidas",   label: "Vencidas" },
            { key: "concluidas", label: "Concluídas" },
            { key: "all",        label: "Todas" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                filter === f.key
                  ? "bg-brand-500/20 text-brand-400 border-brand-500/40"
                  : "bg-gray-800/40 text-gray-500 border-gray-700 hover:text-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="card p-5">
          <SectionHeader icon={<ClipboardList size={15} />} title={`Tarefas (${filtered.length})`} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState compact icon={<CheckCircle2 size={16} className="text-emerald-400" />}
              title="Nenhuma tarefa encontrada" description="Tudo limpo!" />
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => {
                const isVencida = t.prazo && t.prazo < TODAY && t.status !== "Concluída";
                return (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${isVencida ? "bg-red-900/10 border-red-900/40" : "bg-gray-800/40 border-gray-800"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIO_COLORS[t.prioridade] ?? ""}`}>
                          {t.prioridade}
                        </span>
                        <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-md">{t.categoria}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[t.status] ?? "text-gray-400 bg-gray-500/10"}`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-[12px] font-medium text-gray-200 leading-snug">{t.titulo}</p>
                      {t.bloqueio && (
                        <p className="text-[11px] text-red-400 mt-1">⚠ {t.bloqueio}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-[11px] font-medium ${isVencida ? "text-red-400" : "text-gray-500"}`}>
                        {isVencida ? "Vencida" : "Prazo"}: {fmtDate(t.prazo)}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{t.responsavel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
