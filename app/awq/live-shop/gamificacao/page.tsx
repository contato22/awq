// ─── /awq/live-shop/gamificacao — Gamificação de hosts (ranking + níveis) ─────
// Ranking dos apresentadores por XP, com nível, progresso e badges. Derivado do
// desempenho das lives (ls_live_session / Anexo B). Interno. SSR com try/catch.

import Link from "next/link";
import Header from "@/components/Header";
import { ArrowLeft, Trophy, Star, Award, Eye, Clock, AlertTriangle } from "lucide-react";
import { getLiveSessions } from "@/lib/live-shop/db";
import { getLeaderboard, LEVELS, type HostStats } from "@/lib/live-shop/gamification";
import { fmtBRL } from "@/lib/live-shop/money";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

function HostCard({ s, rank }: { s: HostStats; rank: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg">{MEDALS[rank] ?? `#${rank + 1}`}</div>
          <div>
            <p className="font-semibold text-gray-900">{s.host.name}</p>
            <p className="text-xs text-gray-400">{s.lives} lives · melhor CTOR {(s.bestCtorBps / 100).toFixed(2)}%</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-brand-700">{s.xp.toLocaleString("pt-BR")} XP</p>
          <p className="inline-flex items-center gap-1 text-xs font-medium text-gray-500"><Star size={11} className="text-amber-500" fill="currentColor" /> {s.level.name}</p>
        </div>
      </div>

      {/* Progresso de nível */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11px] text-gray-400">
          <span>{s.level.name}</span>
          <span>{s.nextLevel ? `${s.progressPct}% → ${s.nextLevel.name}` : "Nível máximo"}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${s.progressPct}%` }} />
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-surface-subtle py-2"><p className="font-semibold text-gray-900">{fmtBRL(s.gmv)}</p><p className="text-gray-400">GMV</p></div>
        <div className="rounded-lg bg-surface-subtle py-2"><p className="font-semibold text-gray-900 inline-flex items-center gap-1"><Eye size={11} /> {s.totalViews.toLocaleString("pt-BR")}</p><p className="text-gray-400">views</p></div>
        <div className="rounded-lg bg-surface-subtle py-2"><p className="font-semibold text-gray-900 inline-flex items-center gap-1"><Clock size={11} /> {Math.round(s.totalDurationMin / 60)}h</p><p className="text-gray-400">no ar</p></div>
      </div>

      {/* Badges */}
      {s.badges.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400"><Award size={12} /> Badges ({s.badges.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {s.badges.map((b) => (
              <span key={b.id} title={b.desc} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                {b.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function LiveShopGamificationPage() {
  let board: HostStats[] = [];
  let loadError: string | null = null;
  try {
    board = await getLeaderboard(await getLiveSessions());
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <>
      <Header title="Live Shop · Gamificação" subtitle="Ranking de hosts por desempenho" />
      <main className="px-6 lg:px-8 py-6 space-y-5">
        <Link href="/awq/live-shop" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
          <ArrowLeft size={13} /> Voltar ao cockpit
        </Link>

        <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800">
          <Trophy size={14} className="shrink-0" />
          <span>XP por live = 100 base + R$1 de GMV + 1/50 views + 3×pico + bônus de CTOR. Níveis: {LEVELS.map((l) => l.name).join(" · ")}.</span>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            <AlertTriangle size={13} /> <span>Erro ao ler dados. <span className="font-mono">{loadError}</span></span>
          </div>
        )}

        {board.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Nenhum host com lives ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {board.map((s, i) => <HostCard key={s.host.id} s={s} rank={i} />)}
          </div>
        )}
      </main>
    </>
  );
}
