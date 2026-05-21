// ─── /awq/ap — Cadastro de Contas a Pagar ─────────────────────────────────────
// SSR page. force-dynamic para dados frescos em cada request.
// Erros de DB são capturados — página monta com estado vazio em vez de crashar.

import Header from "@/components/Header";
import APRegistroTab from "@/components/ap/APRegistroTab";
import { getAllAPEntries, getAPSummary } from "@/lib/ap-db";
import type { APEntry, APSummary } from "@/lib/ap-shared";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export default async function APPage() {
  let entries: APEntry[] = [];
  let summary: APSummary | null = null;
  let dbError: string | null = null;

  try {
    [entries, summary] = await Promise.all([
      getAllAPEntries(),
      getAPSummary("all"),
    ]);
  } catch (err) {
    dbError = String(err);
    console.error("[AP] falha ao carregar dados:", err);
  }

  const openLiability = entries
    .filter(e => e.status !== "pago" && e.status !== "cancelado")
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Contas a Pagar (AP)"
        subtitle={`Plano de contas 2.x · Regime de competência · Passivo Circulante: ${fmtBRL(openLiability)}`}
      />

      {dbError && (
        <div className="mx-6 lg:mx-8 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          Base de dados indisponível — exibindo dados locais. ({dbError})
        </div>
      )}

      <div className="px-6 lg:px-8 py-6">
        <APRegistroTab entries={entries} summary={summary} />
      </div>
    </div>
  );
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
