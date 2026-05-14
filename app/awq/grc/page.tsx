"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, AlertTriangle, FileText, ClipboardList,
  Lock, Database, CheckCircle2, XCircle, Loader2,
} from "lucide-react";

const MODULES = [
  {
    href: "/awq/grc/risks",
    label: "Riscos",
    description: "Identifique, avalie e trate riscos corporativos",
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-50 group-hover:bg-orange-100",
  },
  {
    href: "/awq/grc/controls",
    label: "Controles",
    description: "Gerencie controles internos preventivos e detectivos",
    icon: Lock,
    color: "text-blue-500",
    bg: "bg-blue-50 group-hover:bg-blue-100",
  },
  {
    href: "/awq/grc/policies",
    label: "Políticas",
    description: "Centralize políticas corporativas e versões vigentes",
    icon: FileText,
    color: "text-purple-500",
    bg: "bg-purple-50 group-hover:bg-purple-100",
  },
  {
    href: "/awq/grc/audits",
    label: "Auditorias",
    description: "Planeje e acompanhe auditorias internas e externas",
    icon: ClipboardList,
    color: "text-green-500",
    bg: "bg-green-50 group-hover:bg-green-100",
  },
];

type SetupState = "idle" | "running" | "ok" | "error";

export default function GrcHubPage() {
  const [setup, setSetup] = useState<SetupState>("idle");
  const [detail, setDetail] = useState("");

  async function runSetup() {
    setSetup("running");
    setDetail("");
    try {
      const res = await fetch("/api/grc/setup");
      const json = await res.json();
      setSetup(json.ok ? "ok" : "error");
      setDetail(json.detail ?? "");
    } catch (e: unknown) {
      setSetup("error");
      setDetail(String(e instanceof Error ? e.message : e));
    }
  }

  async function runHealth() {
    setSetup("running");
    setDetail("Verificando leitura/escrita...");
    try {
      const res = await fetch("/api/grc/health");
      const json = await res.json();
      const ok = json.status === "ok";
      setSetup(ok ? "ok" : "error");
      const tableReport = Object.entries(json.tables as Record<string, { ok: boolean; error?: string }>)
        .map(([t, v]) => `${v.ok ? "✓" : "✗"} ${t}${v.error ? ` (${v.error})` : ""}`)
        .join(" · ");
      setDetail(tableReport);
    } catch (e: unknown) {
      setSetup("error");
      setDetail(String(e instanceof Error ? e.message : e));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <ShieldCheck size={20} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">GRC</h1>
            <p className="text-xs text-gray-500">Governance · Risk · Compliance</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
        {/* Módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODULES.map(({ href, label, description, icon: Icon, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all flex flex-col gap-4"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${bg}`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Painel operacional */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-gray-500" />
            <p className="text-sm font-semibold text-gray-900">Banco de Dados Supabase</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runSetup}
              disabled={setup === "running"}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {setup === "running" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Database size={14} />
              )}
              Inicializar / Migrar Schema
            </button>

            <button
              onClick={runHealth}
              disabled={setup === "running"}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {setup === "running" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              Verificar Conectividade
            </button>

            {setup === "ok" && (
              <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                <CheckCircle2 size={15} /> OK
              </span>
            )}
            {setup === "error" && (
              <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                <XCircle size={15} /> Falhou
              </span>
            )}
          </div>

          {detail && (
            <p className="mt-3 text-xs text-gray-500 font-mono bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              {detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
