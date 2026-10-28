// Escopo de API por role BU. Extraído do middleware para poder ser testado
// (scripts/test-access-rules.ts). O middleware aplica isApiAllowedForRole().
import type { Role } from "@/lib/auth-users";

// API allow-list por role BU-scoped. Qualquer outra rota /api/* retorna 403.
// Mantém Holding-only surfaces (bpm, epm, admin, ingest, supervisor, agents,
// ma, security, setup, chat, internal, financial-link, erp) fora do alcance
// dessas roles. Roles permissivas (owner/admin/analyst/cs-ops) não passam por
// este filtro.
export const BU_API_ALLOW_LIST: Record<string, RegExp[]> = {
  jacqes: [
    /^\/api\/crm(\/|$)/,
    /^\/api\/ppm(\/|$)/,
    /^\/api\/jacqes(\/|$)/,
    /^\/api\/cora\/(sync|audit|debug)(\/|$|$)/,
  ],
  caza: [
    /^\/api\/crm(\/|$)/,
    /^\/api\/caza(\/|$)/,
  ],
  "live-shop": [
    /^\/api\/live-shop(\/|$)/,
  ],
  // Convidados: NENHUMA API (lista vazia → bloqueia todo /api/*).
  "live-guest": [],
  "jacqes-guest": [],
  enrd: [
    /^\/api\/crm(\/|$)/,
    /^\/api\/ppm(\/|$)/,
    /^\/api\/enrd(\/|$)/,
    /^\/api\/conciliacao(\/|$)/,
  ],
};

/** Roles sem entrada na lista (owner/admin/analyst/cs-ops) não são filtradas. */
export function isApiAllowedForRole(role: Role | string, pathname: string): boolean {
  const allow = BU_API_ALLOW_LIST[role];
  return !allow || allow.some((re) => re.test(pathname));
}
