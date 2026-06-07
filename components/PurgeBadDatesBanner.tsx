"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  badCount: number;
}

export default function PurgeBadDatesBanner({ badCount }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirming" | "purging" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<number | null>(null);

  if (badCount === 0 && state !== "done") return null;

  async function runPurge() {
    setState("purging");
    setErrMsg(null);
    try {
      const res = await fetch("/api/enrd/purge-invalid-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "PURGE" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setState("error");
        setErrMsg(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      setDeleted(json?.deletedCount ?? null);
      setState("done");
      router.refresh();
    } catch (e) {
      setState("error");
      setErrMsg(String(e));
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
        <span className="text-emerald-600 shrink-0 mt-0.5">✓</span>
        <div className="text-sm text-emerald-800">
          <p className="font-semibold">Purge concluído</p>
          <p className="text-xs mt-0.5">
            {deleted !== null ? `${deleted} txn(s) com transactionDate inválido removida(s).` : "Linhas removidas."}
            {" "}Recarregue a página pra ver o estado atualizado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
      <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-800">
          {badCount} transação{badCount === 1 ? "" : "ões"} com <span className="font-mono">transactionDate = &quot;Invalid Date&quot;</span>
        </p>
        <p className="text-xs text-red-700 mt-1 leading-relaxed">
          Essas linhas vieram de um sync antigo do Cora com bug no <span className="font-mono">parseDate</span> (já corrigido).
          Elas não aparecem no chart porque não têm data válida — só ocupam espaço. Purgar é seguro:
          se o Cora ENERDY for re-sincronizado, txns válidas voltam.
        </p>
        {errMsg && (
          <p className="text-xs text-red-700 mt-2 font-mono">Erro: {errMsg}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          {state === "idle" && (
            <button
              onClick={() => setState("confirming")}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              Purgar {badCount} linha{badCount === 1 ? "" : "s"}
            </button>
          )}
          {state === "confirming" && (
            <>
              <span className="text-xs text-red-800 font-semibold">Confirma?</span>
              <button
                onClick={runPurge}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Sim, apagar
              </button>
              <button
                onClick={() => setState("idle")}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </>
          )}
          {state === "purging" && (
            <span className="flex items-center gap-2 text-xs text-red-700 font-semibold">
              <Loader2 size={12} className="animate-spin" /> Apagando…
            </span>
          )}
          {state === "error" && (
            <button
              onClick={() => setState("idle")}
              className="px-3 py-1.5 rounded-lg border border-red-300 bg-white text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
            >
              Tentar de novo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
