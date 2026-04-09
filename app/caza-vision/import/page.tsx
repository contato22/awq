"use client";

import { useState } from "react";
import Header from "@/components/Header";
import {
  Download,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  SkipForward,
  RefreshCw,
  Database,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportSummary {
  projects_imported: number;
  projects_skipped:  number;
  projects_conflicts:number;
  clients_imported:  number;
  clients_skipped:   number;
  errors:            string[];
  imported_at:       string;
  dry_run:           boolean;
}

type ImportState = "idle" | "running" | "done" | "error";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaImportPage() {
  const [state,   setState]   = useState<ImportState>("idle");
  const [dryRun,  setDryRun]  = useState(true);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errMsg,  setErrMsg]  = useState<string | null>(null);

  async function runImport() {
    setState("running");
    setSummary(null);
    setErrMsg(null);

    try {
      const res = await fetch("/api/caza/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });

      if (res.status === 503) {
        const body = await res.json() as { error?: string };
        setErrMsg(body.error ?? "Serviço indisponível (banco de dados ou token Notion não configurado).");
        setState("error");
        return;
      }

      if (!res.ok) {
        setErrMsg(`Erro HTTP ${res.status}`);
        setState("error");
        return;
      }

      const data = await res.json() as ImportSummary;
      setSummary(data);
      setState("done");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Erro desconhecido");
      setState("error");
    }
  }

  return (
    <>
      <Header
        title="Importar do Notion"
        subtitle="Sincronização única · Notion → Base interna AWQ"
      />
      <div className="page-container">

        {/* Info banner */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-800">
                Importação manual — Notion é fonte de referência, não fonte operacional.
              </p>
              <p className="text-[11px] text-blue-600 mt-0.5">
                Os dados importados são gravados na base interna AWQ (Neon Postgres).
                Após a importação, edições devem ser feitas diretamente na base interna.
                O token Notion é lido de <code className="bg-blue-100 px-1 rounded">NOTION_TOKEN</code> no ambiente do servidor — nunca exposto ao cliente.
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Configurar Importação</h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Dry run toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setDryRun(d => !d)}
                className={`relative w-10 h-5 rounded-full transition-colors ${dryRun ? "bg-amber-400" : "bg-emerald-500"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${dryRun ? "left-0.5" : "left-5"}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {dryRun ? "Dry Run (simulação)" : "Importação real"}
              </span>
            </label>

            <p className="text-xs text-gray-500 flex-1">
              {dryRun
                ? "Dry Run: simula a importação sem gravar nada. Use para auditar antes de confirmar."
                : "Importação real: projetos e clientes serão gravados na base interna AWQ."}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={runImport}
              disabled={state === "running"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state === "running" ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : dryRun ? (
                <Play size={14} />
              ) : (
                <Download size={14} />
              )}
              {state === "running"
                ? "Importando…"
                : dryRun
                  ? "Simular Importação"
                  : "Importar Agora"}
            </button>

            {state === "done" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 size={14} /> Concluído
              </span>
            )}
            {state === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <XCircle size={14} /> Falhou
              </span>
            )}
          </div>
        </div>

        {/* Error display */}
        {state === "error" && errMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
            <XCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-800">Erro na importação</p>
              <p className="text-[11px] text-red-600 mt-0.5">{errMsg}</p>
              <p className="text-[11px] text-red-500 mt-1">
                Verifique se <code className="bg-red-100 px-1 rounded">NOTION_TOKEN</code> está configurado no ambiente Vercel
                e se os IDs dos bancos de dados Notion estão corretos.
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              {summary.dry_run ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700 font-semibold">
                  <Play size={10} /> Simulação (Dry Run)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                  <CheckCircle2 size={10} /> Importado em {new Date(summary.imported_at).toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
              {[
                { label: "Projetos importados", value: summary.projects_imported, color: "text-emerald-600", icon: CheckCircle2 },
                { label: "Projetos ignorados",  value: summary.projects_skipped,  color: "text-gray-500",   icon: SkipForward  },
                { label: "Conflitos",           value: summary.projects_conflicts, color: "text-amber-700", icon: AlertTriangle },
                { label: "Clientes importados", value: summary.clients_imported,  color: "text-emerald-600",icon: Database      },
                { label: "Clientes ignorados",  value: summary.clients_skipped,   color: "text-gray-500",   icon: SkipForward  },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <Icon size={14} className={`${s.color} mx-auto mb-1`} />
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                );
              })}
            </div>

            {summary.errors.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> {summary.errors.length} erro(s) encontrado(s)
                </p>
                <ul className="space-y-1">
                  {summary.errors.map((e, i) => (
                    <li key={i} className="text-[11px] text-red-600 font-mono">{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.errors.length === 0 && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-500" />
                Nenhum erro encontrado.
                {summary.dry_run && " Execute novamente sem Dry Run para gravar na base interna."}
              </p>
            )}
          </div>
        )}

        {/* Architecture note */}
        <div className="card p-5 bg-gray-50 border-gray-200">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Arquitetura de dados</h3>
          <div className="space-y-1 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
              <span><strong>Notion</strong> — fonte de referência / importação (nunca consultado em tempo real)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span><strong>Base interna AWQ</strong> — fonte canônica operacional (Neon Postgres)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
              <span><strong>UI Caza Vision</strong> — lê exclusivamente da base interna</span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
