/**
 * Única decisão de rota pública (sem sessão), sempre no path cru.
 *
 * Next casa a rota com o path que chegou (%2F fica dentro de [id]).
 * Decodificar antes da decisão tratava /api/caza/clients/x%2F..%2F..%2Flogin
 * como /login e entregava o handler sem sessão. Se o path tem %, \, //,
 * ".." ou um segmento ".", não é público.
 *
 * Árvore: rest === prefix || rest.startsWith(prefix + "/").
 * Rota única: path exato, barra final opcional.
 * api/auth não entra na lista: só isLegitNextAuthPath.
 * leads/capture/?$ fica em isLeadCapturePath, também no path cru.
 */
import { isLegitNextAuthPath, isRawPathUnsafe } from "./middleware-request";

/** Subcaminhos legítimos (login próprio da área). */
const TREE_PREFIXES = ["patricia-canto", "api/patricia-canto"] as const;

/** Uma rota só. Sem /loginX, /api/healthcheck, /api/cora/cron-syncX. */
const EXACT_ROUTES = [
  "login",
  "api/health",
  "api/cora/audit-probe",
  "api/cora/sync-probe",
  "api/cora/cron-sync",
  "api/enrd/montagem/cron-sync",
  "api/live-shop/webhook",
  "api/live-shop/cron",
  "api/office/head/tick",
  "api/setup/seed-btg-extract-jun2026",
  "api/setup/seed-itau-extract-jun2026",
  "api/setup/backfill-snapshots",
  "api/enrd/debug-saldo",
] as const;

/** leads/capture/?$ — barra final opcional, fim do caminho, path cru. */
export const LEAD_CAPTURE_PUBLIC_PATH = /^\/leads\/capture\/?$/;

export function isLeadCapturePath(pathname: string): boolean {
  return LEAD_CAPTURE_PUBLIC_PATH.test(pathname);
}

export function isLegacyPublicPath(pathname: string): boolean {
  if (isRawPathUnsafe(pathname)) return false;
  if (isLegitNextAuthPath(pathname)) return true;
  const rest = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  for (const prefix of TREE_PREFIXES) {
    if (rest === prefix || rest.startsWith(`${prefix}/`)) return true;
  }
  for (const prefix of EXACT_ROUTES) {
    if (rest === prefix || rest === `${prefix}/`) return true;
  }
  return false;
}

export function isPublicRoute(pathname: string): boolean {
  if (isRawPathUnsafe(pathname)) return false;
  return isLeadCapturePath(pathname) || isLegacyPublicPath(pathname);
}
