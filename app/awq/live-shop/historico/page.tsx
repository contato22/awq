// ─── /awq/live-shop/historico — Histórico de resultados por live (§7.4) ───────
// Série/cohort por live (interno, autenticado): GMV, AOV, pedidos, itens/pedido,
// CTR, CTOR, take-rate (engine) e Net AWQ (revenue share). Flag pré/pós-15/07.
// Dados puxados das sessões já existentes (Anexo B / ls_live_session). SSR.

import Link from "next/link";
import Header from "@/components/Header";
import { ArrowLeft, History, AlertTriangle } from "lucide-react";
import { getLiveSessions } from "@/lib/live-shop/db";
import { getPilotBrandId, getBrand } from "@/lib/live-shop/brands";
import { computeSessionResults, type SessionResult } from "@/lib/live-shop/session-results";
import { fmtBRL, fmtPct, toReais } from "@/lib/live-shop/money";
import LiveShopResultsTrend, { type TrendPoint } from "@/components/LiveShopResultsTrend";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export default async function LiveShopHistoryPage() {
  let results: SessionResult[] = [];
  let loadError: string | null = null;
  try {
    const sessions = await getLiveSessions();
    const pilotId = await getPilotBrandId();
    const pilot = pilotId ? await getBrand(pilotId) : null;
    const revShareBps = pilot?.revenueShareBps || 1000;
    results = computeSessionResults(sessions, revShareBps);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  // tendência em ordem cronológica
  const trend: TrendPoint[] = [...results].reverse().map((r) => ({
    name: new Date(r.startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    aov: toReais(r.aov),
    takeRate: r.takeRateBps / 100,
  }));

  const fmtMilli = (m: number) => (m / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <Header title="Live Shop · Histórico de resultados" subtitle="Cohort por live (§7.4)" />
      <main className="px-6 lg:px-8 py-6 space-y-5">
        <Link href="/awq/live-shop" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
          <ArrowLeft size={13} /> Voltar ao cockpit
        </Link>

        {loadError && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            <span>Erro ao ler dados. <span className="font-mono">{loadError}</span></span>
          </div>
        )}

        {results.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Sem lives no histórico ainda.
          </div>
        ) : (
          <>
            {/* Tabela por live */}
            <section className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 p-4 text-sm font-semibold text-gray-900">
                <History size={15} className="text-gray-400" /> Resultados por live
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                    <th className="px-4 py-2 font-medium">Live</th>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 text-right font-medium">GMV</th>
                    <th className="px-4 py-2 text-right font-medium">Pedidos</th>
                    <th className="px-4 py-2 text-right font-medium">AOV</th>
                    <th className="px-4 py-2 text-right font-medium">Itens/ped.</th>
                    <th className="px-4 py-2 text-right font-medium">CTR</th>
                    <th className="px-4 py-2 text-right font-medium">CTOR</th>
                    <th className="px-4 py-2 text-right font-medium">Take-rate</th>
                    <th className="px-4 py-2 text-right font-medium">Net AWQ</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {r.id}
                        {!r.preFlip && <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] text-amber-700">pós-15/07</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-500">{new Date(r.startedAt).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtBRL(r.gmv)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.paidOrders}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtBRL(r.aov)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtMilli(r.itemsPerOrderMilli)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtPct(r.ctrBps, 1)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${r.ctorBps < 300 ? "text-red-600" : ""}`}>{fmtPct(r.ctorBps, 2)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtPct(r.takeRateBps, 1)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtBRL(r.netAwq)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="p-3 text-[11px] text-gray-400">
                Take-rate = fees de plataforma estimados pela fee engine sobre o preço médio da live.
                Net AWQ = revenue share da marca sobre o GMV. Todas as lives até 14/07 usam a tabela pré-flip.
              </p>
            </section>

            {/* Tendência */}
            <section className="rounded-xl border border-gray-200/80 bg-white p-5">
              <div className="mb-3 text-sm font-semibold text-gray-900">Tendência — AOV &amp; take-rate por live</div>
              <LiveShopResultsTrend points={trend} />
            </section>
          </>
        )}
      </main>
    </>
  );
}
