"use client";

// Botão de setup do banco da Live Shop (migrations 006–010). Owner/admin.
// Tenta aplicar via POST; se não houver connection string, instrui a usar o SQL.

import { useState } from "react";
import { Database, Loader2, Check, AlertTriangle, Copy } from "lucide-react";

export default function LiveShopSetupButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  async function apply() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/live-shop/setup", { method: "POST" });
      const j = await r.json();
      if (r.ok) setMsg({ kind: "ok", text: j.message ?? "Aplicado." });
      else setMsg({ kind: "info", text: `${j.error ?? "Falha"} ${j.hint ?? ""}`.trim() });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Falha" });
    } finally { setBusy(false); }
  }

  async function copySql() {
    const r = await fetch("/api/live-shop/setup");
    const j = await r.json();
    if (j.sql) {
      await navigator.clipboard.writeText(j.sql);
      setMsg({ kind: "info", text: "SQL copiado — cole no Supabase (ERP) → SQL Editor → Run." });
    }
  }

  return (
    <div className="rounded-lg border border-gray-200/80 bg-surface-subtle p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Database size={14} className="text-gray-400" />
        <span className="text-xs text-gray-500">Banco da Live Shop não configurado? Rode o setup (migrations 006–010, idempotente).</span>
        <div className="ml-auto flex gap-2">
          <button onClick={copySql} className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-white">
            <Copy size={12} /> Copiar SQL
          </button>
          <button onClick={apply} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />} Aplicar setup
          </button>
        </div>
      </div>
      {msg && (
        <div className={`mt-2 flex items-start gap-1.5 text-xs ${msg.kind === "ok" ? "text-emerald-700" : msg.kind === "err" ? "text-red-700" : "text-gray-600"}`}>
          {msg.kind === "ok" ? <Check size={13} className="mt-0.5 shrink-0" /> : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
