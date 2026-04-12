// ─── AWQ Security — Painel de Segurança (v2 — api_guarded) ───────────────────
//
// ESCOPO: Dados & Infra → visualização da camada de segurança.
// NÃO É COMPLIANCE. Compliance (LGPD, políticas, aceites) → /awq/compliance
//
// COMPATIBILIDADE:
//   Static export (GitHub Pages): exibe matriz RBAC + registry estático — OK
//   SSR (Vercel): exibe também audit log in-memory (acumula por cold start)

import {
  SENSITIVE_ROUTES,
  SENSITIVE_APIS,
} from "@/lib/security-registry";
import {
  SECURITY_ENFORCEMENT_MODE,
  getAllowedActions,
} from "@/lib/security-access";
import type { SecurityLayer, SecurityRole, SecurityAction } from "@/lib/security-types";

export const metadata = {
  title: "Segurança | AWQ",
};

// ── Labels ────────────────────────────────────────────────────────────────────

const LAYER_LABELS: Record<SecurityLayer, string> = {
  holding:     "Holding",
  jacqes:      "JACQES",
  caza_vision: "Caza Vision",
  awq_venture: "AWQ Venture",
  advisor:     "Advisor",
  financeiro:  "Financeiro",
  juridico:    "Jurídico",
  dados_infra: "Dados & Infra",
  security:    "Segurança",
  system:      "Sistema",
  ai:          "IA",
};

const ACTION_SHORT: Record<SecurityAction, string> = {
  view:            "view",
  create:          "create",
  update:          "update",
  delete:          "delete",
  export:          "export",
  import:          "import",
  approve:         "approve",
  manage_security: "mgmt_sec",
};

const SENSITIVITY_COLOR: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-emerald-100 text-emerald-700",
};

const AUTH_COLOR: Record<string, string> = {
  "middleware-jwt":        "bg-emerald-100 text-emerald-700",
  "internal-token-check": "bg-blue-100 text-blue-700",
  "middleware-only":       "bg-amber-100 text-amber-700",
  "none":                  "bg-red-100 text-red-700",
};

const GUARD_STATUS_COLOR: Record<string, string> = {
  guarded:    "bg-emerald-100 text-emerald-700",
  audit_only: "bg-amber-100 text-amber-700",
  registered: "bg-gray-100 text-gray-500",
};

const ENFORCEMENT_CONFIG = {
  audit_only: {
    label: "AUDIT ONLY",
    desc:  "Loga tudo, nunca bloqueia",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  api_guarded: {
    label: "API GUARDED",
    desc:  "APIs bloqueiam sem permissão — UI permanece permissiva",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  full: {
    label: "FULL ENFORCEMENT",
    desc:  "Bloqueia API e UI (futuro v3)",
    color: "text-red-700 bg-red-50 border-red-200",
  },
};

const CANONICAL_ROLES: SecurityRole[] = ["owner", "admin", "finance", "operator", "viewer"];
const ALL_LAYERS: SecurityLayer[] = [
  "holding", "jacqes", "caza_vision", "awq_venture", "advisor",
  "financeiro", "juridico", "dados_infra", "security", "system", "ai",
];

// ─────────────────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const totalRoutes  = SENSITIVE_ROUTES.length;
  const totalApis    = SENSITIVE_APIS.length;
  const guardedApis  = SENSITIVE_APIS.filter(a => a.guardStatus === "guarded").length;
  const highRoutes   = SENSITIVE_ROUTES.filter(r => r.sensitivity === "high").length;
  const modeConfig   = ENFORCEMENT_CONFIG[SECURITY_ENFORCEMENT_MODE];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Segurança</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">
            Dados & Infra
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Enforcement progressivo: APIs bloqueadas por RBAC · Audit log in-memory · Matriz de roles.
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Compliance (LGPD, políticas, aceites) →{" "}
          <a href="/awq/compliance" className="underline">/awq/compliance</a>
        </p>
      </div>

      {/* ── Enforcement mode ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Modo de Enforcement
        </h2>
        <div className={`p-4 rounded-xl border ${modeConfig.color}`}>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold font-mono">{modeConfig.label}</span>
            <span className="text-sm opacity-80">{modeConfig.desc}</span>
          </div>
          <div className="mt-2 text-xs opacity-70 flex items-center gap-2">
            <span className={SECURITY_ENFORCEMENT_MODE === "audit_only" ? "font-bold underline" : ""}>audit_only</span>
            <span>→</span>
            <span className={SECURITY_ENFORCEMENT_MODE === "api_guarded" ? "font-bold underline" : ""}>api_guarded ← atual</span>
            <span>→</span>
            <span className={SECURITY_ENFORCEMENT_MODE === "full" ? "font-bold underline" : "opacity-50"}>full (futuro)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <StatusCard label="Rotas sensíveis"   value={String(totalRoutes)} sub={`${highRoutes} high · UI permissiva`}     color="text-gray-700 bg-gray-50 border-gray-200" />
          <StatusCard label="APIs registradas"  value={String(totalApis)}   sub="no security registry"                     color="text-gray-700 bg-gray-50 border-gray-200" />
          <StatusCard label="APIs com guard"    value={String(guardedApis)} sub={`de ${totalApis} registradas`}            color="text-emerald-700 bg-emerald-50 border-emerald-200" />
          <StatusCard label="Roles canônicos"   value="5"                   sub="owner · admin · finance · operator · viewer" color="text-gray-700 bg-gray-50 border-gray-200" />
        </div>
      </section>

      {/* ── Role aliases ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Normalização de Roles — Aliases Legados
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="px-3 py-2 text-left">Role no JWT</th>
                <th className="px-3 py-2 text-left">Normalizado para</th>
                <th className="px-3 py-2 text-left">Usuário atual</th>
                <th className="px-3 py-2 text-left">Razão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50/60">
                <td className="px-3 py-2 font-mono text-amber-700">analyst</td>
                <td className="px-3 py-2 font-mono text-blue-700">finance</td>
                <td className="px-3 py-2 text-gray-600">p.nair@jacqes.com (Priya Nair)</td>
                <td className="px-3 py-2 text-gray-500">Analista financeiro → role canônico finance</td>
              </tr>
              <tr className="hover:bg-gray-50/60">
                <td className="px-3 py-2 font-mono text-amber-700">cs-ops</td>
                <td className="px-3 py-2 font-mono text-blue-700">operator</td>
                <td className="px-3 py-2 text-gray-600">danilo@jacqes.com (Danilo)</td>
                <td className="px-3 py-2 text-gray-500">CS Ops → role canônico operator</td>
              </tr>
              <tr className="bg-gray-50/40">
                <td className="px-3 py-2 font-mono text-gray-500">anonymous</td>
                <td className="px-3 py-2 text-red-600 font-semibold">bloqueado (sem fallback)</td>
                <td className="px-3 py-2 text-gray-400">— sem JWT válido —</td>
                <td className="px-3 py-2 text-gray-500">Sem autenticação → negado em todas as APIs</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Fonte: <code>lib/security-access.ts · normalizeRole()</code>
        </p>
      </section>

      {/* ── Matriz RBAC ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Matriz RBAC — Role × Camada → Ações
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">Camada</th>
                {CANONICAL_ROLES.map((r) => (
                  <th key={r} className="px-3 py-2 text-center font-semibold text-gray-600 whitespace-nowrap capitalize">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ALL_LAYERS.map((layer) => (
                <tr key={layer} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                    {LAYER_LABELS[layer]}
                  </td>
                  {CANONICAL_ROLES.map((role) => {
                    const actions = getAllowedActions(role, layer);
                    return (
                      <td key={role} className="px-3 py-2 text-center">
                        {actions.length === 0 ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {actions.map((a) => <ActionBadge key={a} action={a} />)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Fonte: <code>lib/security-access.ts · PERMISSION_MATRIX</code> · analyst/cs-ops normalizados para finance/operator
        </p>
      </section>

      {/* ── APIs com guard status ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          APIs Sensíveis — Guard Status ({totalApis})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="px-3 py-2 text-left">Pattern</th>
                <th className="px-3 py-2 text-left">Camada</th>
                <th className="px-3 py-2 text-left">Guard</th>
                <th className="px-3 py-2 text-left">Auth</th>
                <th className="px-3 py-2 text-left">Ação mínima</th>
                <th className="px-3 py-2 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SENSITIVE_APIS.map((api) => (
                <tr key={api.pattern} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">{api.pattern}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {LAYER_LABELS[api.layer] ?? api.layer}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${GUARD_STATUS_COLOR[api.guardStatus]}`}>
                      {api.guardStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${AUTH_COLOR[api.authEnforcement]}`}>
                      {api.authEnforcement}
                    </span>
                  </td>
                  <td className="px-3 py-2"><ActionBadge action={api.requiredAction} /></td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs">{api.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          <span className="text-emerald-600 font-medium">guarded</span> = guard() bloqueia sem permissão ·{" "}
          <span className="text-gray-500 font-medium">registered</span> = apenas registrado, sem guard interno ainda
        </p>
      </section>

      {/* ── Rotas sensíveis ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Rotas Sensíveis — UI ({totalRoutes}) — middleware permissivo (modo full = futuro)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="px-3 py-2 text-left">Path</th>
                <th className="px-3 py-2 text-left">Camada</th>
                <th className="px-3 py-2 text-left">Sensibilidade</th>
                <th className="px-3 py-2 text-left">Ação mínima</th>
                <th className="px-3 py-2 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SENSITIVE_ROUTES.map((route) => (
                <tr key={route.path} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">{route.path}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {LAYER_LABELS[route.layer] ?? route.layer}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${SENSITIVITY_COLOR[route.sensitivity]}`}>
                      {route.sensitivity}
                    </span>
                  </td>
                  <td className="px-3 py-2"><ActionBadge action={route.requiredAction} /></td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs">{route.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Audit log ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Audit Log
        </h2>
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-800">
          <strong>Ring buffer in-memory — sem persistência em v2.</strong>{" "}
          Máximo 100 eventos por instância. Reset em cold start (Vercel).
          Em static export (GitHub Pages), zero eventos capturados.{" "}
          v3 → persistir em Neon{" "}
          <code className="font-mono bg-blue-100 px-1 rounded">awq_security_audit_log</code>{" "}
          + endpoint{" "}
          <code className="font-mono bg-blue-100 px-1 rounded">/api/security/audit</code>.
        </div>
        <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 text-center">
          Visualização de eventos requer endpoint SSR — não disponível em static export.
          <br />
          <code className="font-mono text-xs">lib/security-audit.ts · getRecentAuditEvents()</code>
        </div>
      </section>

      {/* ── O que esta versão NÃO tem ───────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          O que esta versão NÃO tem
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {[
            ["Rotas UI bloqueadas",      "Middleware permanece permissivo — modo full é futuro (v3)"],
            ["Audit log persistente",    "Ring buffer in-memory (100 eventos · sem banco · v3)"],
            ["SIEM / exportação",        "Sem Datadog, Splunk, CloudWatch (v4)"],
            ["MFA / 2FA enterprise",     "Apenas JWT de sessão via next-auth (v5)"],
            ["WAF / rate-limit",         "Sem proteção contra brute-force ou DDoS (v4)"],
            ["DLP",                      "Sem inspeção de payloads de resposta (v5)"],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-red-400 shrink-0 mt-0.5">✕</span>
              <div>
                <div className="font-medium text-gray-700">{title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roadmap ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Roadmap</h2>
        <div className="space-y-2 text-sm">
          {([
            ["v1 — concluído", "RBAC matrix, guard loga, enforcement desligado, registry de rotas/APIs"],
            ["v2 — atual",     "api_guarded: guard() bloqueia APIs críticas; roles canônicos; aliases legados; 58 testes passando"],
            ["v3",             "Ativar modo full para UI, persistir audit log em Neon, /api/security/audit"],
            ["v4",             "SIEM, alertas Slack/e-mail, rate limiting por role, WAF"],
            ["v5",             "MFA enterprise, DLP, revisão periódica de permissões, SOC/MDR"],
          ] as const).map(([version, desc]) => (
            <div key={version} className="flex gap-3 p-3 rounded-lg border border-gray-200">
              <span className={`font-mono font-semibold shrink-0 w-24 ${version.includes("atual") ? "text-blue-600" : "text-gray-500"}`}>
                {version}
              </span>
              <span className="text-gray-600">{desc}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function StatusCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className={`p-4 rounded-xl border ${color}`}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-60">{sub}</div>
    </div>
  );
}

const ACTION_COLORS: Record<SecurityAction, string> = {
  view:            "bg-gray-100 text-gray-600",
  create:          "bg-green-100 text-green-700",
  update:          "bg-blue-100 text-blue-700",
  delete:          "bg-red-100 text-red-700",
  export:          "bg-violet-100 text-violet-700",
  import:          "bg-amber-100 text-amber-700",
  approve:         "bg-emerald-100 text-emerald-700",
  manage_security: "bg-rose-100 text-rose-700",
};

function ActionBadge({ action }: { action: SecurityAction }) {
  return (
    <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${ACTION_COLORS[action]}`}>
      {ACTION_SHORT[action]}
    </span>
  );
}
