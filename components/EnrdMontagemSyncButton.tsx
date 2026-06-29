"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// Dispara POST /api/enrd/montagem/sync (lê o portal gestão e grava no banco AWQ)
// e recarrega a página SSR ao concluir.
export default function EnrdMontagemSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      // Best-effort: atualiza o backup no espelho. A visão da página é AO VIVO,
      // então mesmo se o espelho falhar (sem migração) o refresh abaixo atualiza.
      const res = await fetch("/api/enrd/montagem/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setMsg(`${json.synced.installations} instalações · ${json.synced.clientes} clientes`);
      } else if (json.error) {
        setErr(`espelho não atualizado: ${json.error}`);
      }
    } catch (e) {
      setErr(`espelho não atualizado: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      router.refresh(); // sempre re-lê a página (ao vivo)
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-emerald-700">{msg}</span>}
      {err && <span className="text-xs text-red-600 max-w-xs truncate" title={err}>{err}</span>}
      <button
        onClick={sync}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-60"
      >
        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        {loading ? "Sincronizando…" : "Sincronizar do gestão"}
      </button>
    </div>
  );
}
