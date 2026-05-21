"use client";

import { useState } from "react";
import { BarChart3, BookOpen, ClipboardList, ExternalLink, TrendingDown } from "lucide-react";
import Link from "next/link";
import APEntryForm from "./APEntryForm";
import APEntriesTable from "./APEntriesTable";
import APPainel from "./APPainel";
import COABrowser from "./COABrowser";
import type { APEntry, APSummary } from "@/lib/ap-shared";

interface Props {
  entries: APEntry[];
  summary: APSummary | null;
}

type Tab = "painel" | "cadastro" | "plano";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "painel",   label: "Painel",          icon: <BarChart3 size={15} /> },
  { id: "cadastro", label: "Cadastro",         icon: <ClipboardList size={15} /> },
  { id: "plano",    label: "Plano de Contas",  icon: <BookOpen size={15} /> },
];

export default function APRegistroTab({ entries: initial, summary: initialSummary }: Props) {
  const [tab, setTab] = useState<Tab>("painel");
  const [entries, setEntries] = useState<APEntry[]>(initial);

  function handleCreated(entry: APEntry) {
    setEntries(prev => [entry, ...prev]);
  }

  function handleUpdated(updated: APEntry) {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
  }

  function handleDeleted(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Integration banner */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs text-gray-500 font-medium self-center">Integrado com:</span>
        <Link href="/awq/conciliacao" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors shadow-sm">
          <TrendingDown size={12} /> Conciliação
          <ExternalLink size={10} className="opacity-50" />
        </Link>
        <Link href="/awq/financial" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors shadow-sm">
          <BarChart3 size={12} /> DRE
          <ExternalLink size={10} className="opacity-50" />
        </Link>
        <Link href="/awq/cashflow" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors shadow-sm">
          <BarChart3 size={12} /> DFC
          <ExternalLink size={10} className="opacity-50" />
        </Link>
        <Link href="/awq/contabilidade" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors shadow-sm">
          <BookOpen size={12} /> Balanço
          <ExternalLink size={10} className="opacity-50" />
        </Link>
      </div>

      {/* Tab content */}
      {tab === "painel" && (
        <APPainel entries={entries} summary={initialSummary} />
      )}

      {tab === "cadastro" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1">
            <APEntryForm onCreated={handleCreated} />
          </div>
          <div className="xl:col-span-2">
            <APEntriesTable
              entries={entries}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          </div>
        </div>
      )}

      {tab === "plano" && (
        <COABrowser />
      )}
    </div>
  );
}
