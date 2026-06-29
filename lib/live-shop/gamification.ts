// ─── Live Shop — Gamificação de hosts ─────────────────────────────────────────
//
// Pontua hosts pelo desempenho das lives que apresentaram: XP, nível, badges e
// ranking. Fórmula transparente e determinística (abaixo). Interno.
//
// Atribuição: ls_live_session.host_id (migration 011) — no seed, todas as lives
// do piloto vão para o host placeholder (host real = "A definir").

import { erpAdmin, erpAnon } from "@/lib/supabase";
import { LIVE_SHOP_BU } from "./types";
import type { LiveSession } from "./types";
import { reais, type Money } from "./money";

export interface Host {
  id: string;
  name: string;
}

export const HOSTS_SEED: Host[] = [
  { id: "host-bless", name: "Host Bless Rio (a definir)" },
];

// ── Fórmula de XP (por live) ──────────────────────────────────────────────────
//   100  por live concluída
//   +1   por R$ 1 de GMV   (floor(gmv/100))
//   +1   a cada 50 views
//   +3   por espectador de pico
//   +250 se CTOR ≥ 3% (live de checkout saudável); +100 se ≥ 1,5%
function sessionXp(s: LiveSession): number {
  const ctorBps = s.clicks > 0 ? Math.round((s.funnelOrders / s.clicks) * 10_000) : 0;
  const ctorBonus = ctorBps >= 300 ? 250 : ctorBps >= 150 ? 100 : 0;
  return 100
    + Math.floor(s.gmv / 100)
    + Math.floor(s.views / 50)
    + s.peakCcv * 3
    + ctorBonus;
}

// ── Níveis ────────────────────────────────────────────────────────────────────
export interface Level { name: string; min: number }
export const LEVELS: Level[] = [
  { name: "Iniciante", min: 0 },
  { name: "Bronze", min: 500 },
  { name: "Prata", min: 1500 },
  { name: "Ouro", min: 3000 },
  { name: "Diamante", min: 6000 },
];

function levelFor(xp: number): { level: Level; next: Level | null; progressPct: number } {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
  const level = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progressPct = next ? Math.min(100, Math.round(((xp - level.min) / (next.min - level.min)) * 100)) : 100;
  return { level, next, progressPct };
}

// ── Badges ────────────────────────────────────────────────────────────────────
export interface BadgeDef { id: string; label: string; desc: string }
export interface HostStats {
  host: Host;
  lives: number;
  gmv: Money;
  totalViews: number;
  maxPeakCcv: number;
  totalDurationMin: number;
  bestCtorBps: number;
  xp: number;
  level: Level;
  nextLevel: Level | null;
  progressPct: number;
  badges: BadgeDef[];
}

const BADGES: { def: BadgeDef; earned: (s: HostStats) => boolean }[] = [
  { def: { id: "first", label: "Primeira live", desc: "Apresentou a 1ª live" }, earned: (s) => s.lives >= 1 },
  { def: { id: "consistente", label: "Consistente", desc: "5+ lives apresentadas" }, earned: (s) => s.lives >= 5 },
  { def: { id: "audiencia", label: "Audiência 10k", desc: "10.000+ views somados" }, earned: (s) => s.totalViews >= 10_000 },
  { def: { id: "vendedor", label: "Vendedor", desc: "R$ 2.000+ de GMV" }, earned: (s) => s.gmv >= reais(2000) },
  { def: { id: "engajador", label: "Engajador", desc: "Pico ao vivo ≥ 80" }, earned: (s) => s.maxPeakCcv >= 80 },
  { def: { id: "maratona", label: "Maratonista", desc: "10h+ no ar" }, earned: (s) => s.totalDurationMin >= 600 },
];

/** Estatísticas/gamificação de um host a partir das lives que apresentou. */
export function computeHostStats(host: Host, sessions: LiveSession[]): HostStats {
  const gmv = sessions.reduce((a, s) => a + s.gmv, 0);
  const totalViews = sessions.reduce((a, s) => a + s.views, 0);
  const maxPeakCcv = sessions.reduce((m, s) => Math.max(m, s.peakCcv), 0);
  const totalDurationMin = sessions.reduce((a, s) => a + s.durationMin, 0);
  const bestCtorBps = sessions.reduce((m, s) => {
    const c = s.clicks > 0 ? Math.round((s.funnelOrders / s.clicks) * 10_000) : 0;
    return Math.max(m, c);
  }, 0);
  const xp = sessions.reduce((a, s) => a + sessionXp(s), 0);
  const { level, next, progressPct } = levelFor(xp);

  const partial: HostStats = {
    host, lives: sessions.length, gmv, totalViews, maxPeakCcv, totalDurationMin,
    bestCtorBps, xp, level, nextLevel: next, progressPct, badges: [],
  };
  partial.badges = BADGES.filter((b) => b.earned(partial)).map((b) => b.def);
  return partial;
}

// ── Leaderboard (server) ──────────────────────────────────────────────────────
const db = erpAdmin ?? erpAnon;

async function getHosts(): Promise<Host[]> {
  if (!db) return HOSTS_SEED;
  try {
    const { data, error } = await db.from("ls_host").select("*").eq("bu_id", LIVE_SHOP_BU);
    if (error || !data || data.length === 0) return HOSTS_SEED;
    return data.map((r: any) => ({ id: r.id, name: r.name }));
  } catch {
    return HOSTS_SEED;
  }
}

/**
 * Ranking de hosts. Atribuição por ls_live_session.host_id; sem host_id (seed),
 * todas as lives vão para o 1º host (placeholder do piloto).
 */
export async function getLeaderboard(sessions: LiveSession[]): Promise<HostStats[]> {
  const hosts = await getHosts();
  const byHost = new Map<string, LiveSession[]>();
  const fallbackId = hosts[0]?.id;
  for (const s of sessions) {
    const hid = (s as { hostId?: string }).hostId ?? fallbackId;
    if (!hid) continue;
    (byHost.get(hid) ?? byHost.set(hid, []).get(hid)!).push(s);
  }
  return hosts
    .map((h) => computeHostStats(h, byHost.get(h.id) ?? []))
    .sort((a, b) => b.xp - a.xp);
}
