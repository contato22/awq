/**
 * Rotas que não exigem sessão.
 *
 * A única página pública nova é exatamente /leads/capture ou /leads/capture/
 * (`leads/capture/?$`). Subcaminhos, maiúsculas e /api/public não entram:
 * não há handler de escrita, então o prefixo não fica aberto.
 *
 * Os demais prefixos repetem o que o matcher já isentava antes desta página.
 */

const LEGACY_PUBLIC_PREFIXES = [
  "login",
  "patricia-canto",
  "api/patricia-canto",
  "api/auth",
  "api/health",
  "api/debug/version",
  "api/cora/audit-probe",
  "api/cora/sync-probe",
  "api/cora/cron-sync",
  "api/enrd/montagem/cron-sync",
  "api/live-shop/webhook",
  "api/live-shop/cron",
  "api/office/head/tick",
  "api/setup/seed-santander-extracts",
  "api/setup/seed-btg-extract-jun2026",
  "api/setup/seed-itau-extract-jun2026",
  "api/setup/backfill-snapshots",
  "api/enrd/debug-saldo",
] as const;

/** leads/capture/?$ — barra final opcional, fim do caminho. */
export const LEAD_CAPTURE_PUBLIC_PATH = /^\/leads\/capture\/?$/;

export function isLeadCapturePath(pathname: string): boolean {
  return LEAD_CAPTURE_PUBLIC_PATH.test(pathname);
}

export function isLegacyPublicPath(pathname: string): boolean {
  const rest = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return LEGACY_PUBLIC_PREFIXES.some((prefix) => rest.startsWith(prefix));
}

export function isPublicRoute(pathname: string): boolean {
  return isLeadCapturePath(pathname) || isLegacyPublicPath(pathname);
}
