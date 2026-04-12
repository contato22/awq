// ─── AWQ Security — Painel de Segurança v1 ───────────────────────────────────
//
// ESCOPO: Dados & Infra → visualização da camada de segurança.
// NÃO É COMPLIANCE. Compliance (LGPD, políticas, aceites) → /awq/compliance
//
// COMPATIBILIDADE:
//   Static export (GitHub Pages): exibe matriz RBAC + registry estático — OK
//   SSR (Vercel): exibe também audit log in-memory (acumula por cold start)
//
// Dados desta página: 100% de lib/security-*.ts — zero snapshot/financeiro.

import {
  SENSITIVE_ROUTES,
  SENSITIVE_APIS,
} from "@/lib/security-registry";
import {
  PERMISSION_MATRIX,
  ENFORCEMENT_ACTIVE,
  getAllowedActions,
} from "@/lib/security-access";
import type { SecurityLayer, SecurityRole, SecurityAction } from "@/lib/security-types";

// ── Metadados ─────────────────────────────────────────────────────────────────
export const metadata = {
  title: "Segurança | AWQ",
};

// ── Helpers de exibição ───────────────────────────────────────────────────────

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

const ROLE_LABELS: Record<SecurityRole, string> = {
  owner:   "Owner",
  admin:   "Admin",
  analyst: "Analyst",
  "cs-ops": "CS Ops",
};

const ACTION_SHORT: Record<SecurityAction, string> = {
  view:            "view",
  create:          "create",
  update:          "update",
  delete:          "delete",
  export:          "export",
  import:          "import",
  approve:         "approve",
  manage_security: "manage_sec",
};

const SENSITIVITY_COLOR: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-emerald-100 text-emerald-700",
};

const AUTH_COLOR: Record<string, string> = {
  "middleware-jwt":       "bg-emerald-100 text-emerald-700",
  "internal-token-check": "bg-blue-100 text-blue-700",
  "middleware-only":      "bg-amber-100 text-amber-700",
  "none":                 "bg-red-100 text-red-700",
};

const ALL_ROLES: SecurityRole[]  = ["owner", "admin", "analyst", "cs-ops"];
const ALL_LAYERS: SecurityLayer[] = [
  "holding", "jacqes", "caza_vision", "awq_venture", "advisor",
  "financeiro", "juridico", "dados_infra", "security", "system", "ai",
];
const ALL_ACTIONS: SecurityAction[] = [
  "view", "create", "update", "delete", "export", "import", "approve", "manage_security",
];

// ─────────────────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const totalRoutes = SENSITIVE_ROUTES.length;
  const totalApis   = SENSITIVE_APIS.length;
  const highRoutes  = SENSITIVE_ROUTES.filter((r) => r.sensitivity === "high").length;

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
          Matriz RBAC, rotas e APIs protegidas, e audit log de eventos de acesso.
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Compliance (LGPD, políticas, aceites) →{" "}
          <a href="/awq/compliance" className="underline">
            /awq/compliance
          </a>
        </p>
      </div>

      {/* ── Status do enforcement ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Status v1
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatusCard
            label="Enforcement"
            value={ENFORCEMENT_ACTIVE ? "ATIVO" : "PERMISSIVE"}
            sub={ENFORCEMENT_ACTIVE ? "Bloqueia acessos não autorizados" : "Loga mas nunca bloqueia (MVP)"}
            color={ENFORCEMENT_ACTIVE ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200"}
          />
          <StatusCard
            label="Rotas sensíveis"
            value={String(totalRoutes)}
            sub={`${highRoutes} sensibilidade alta`}
            color="text-gray-700 bg-gray-50 border-gray-200"
          />
          <StatusCard
            label="APIs sensíveis"
            value={String(totalApis)}
            sub="incluindo wildcard patterns"
            color="text-gray-700 bg-gray-50 border-gray-200"
          />
          <StatusCard
            label="Roles definidos"
            value="4"
            sub="owner · admin · analyst · cs-ops"
            color="text-gray-700 bg-gray-50 border-gray-200"
          />
        </div>

        {!ENFORCEMENT_ACTIVE && (
          <div className="mt-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
            <strong>Permissive mode ativo.</strong> O guard loga eventos mas nunca bloqueia.
            Para ativar enforcement: definir{" "}
            <code className="font-mono bg-amber-100 px-1 rounded">ENFORCEMENT_ACTIVE = true</code>{" "}
            em <code className="font-mono bg-amber-100 px-1 rounded">lib/security-access.ts</code> —
            somente após validar todos os roles e testar UI em cada perfil.
          </div>
        )}
      </section>

      {/* ── Limites honestos v1 ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Limites v1 — O que esta versão NÃO tem
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {[
            ["Audit log persistente", "Ring buffer in-memory (100 eventos · reset no cold start · sem banco)"],
            ["SIEM / exportação", "Sem integração com Datadog, Splunk, CloudWatch ou similares"],
            ["MFA / 2FA enterprise", "Apenas JWT de sessão via next-auth"],
            ["WAF / rate-limit", "Sem proteção contra brute-force ou DDoS a nível de infra"],
            ["DLP (Data Loss Prevention)", "Sem inspeção de payloads de resposta"],
            ["Alertas em tempo real", "Sem notificação por e-mail ou Slack em eventos bloqueados"],
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

      {/* ── Matriz de permissões ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Matriz RBAC — Role × Camada → Ações permitidas
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                  Camada
                </th>
                {ALL_ROLES.map((r) => (
                  <th key={r} className="px-3 py-2 text-center font-semibold text-gray-600 whitespace-nowrap">
                    {ROLE_LABELS[r]}
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
                  {ALL_ROLES.map((role) => {
                    const actions = getAllowedActions(role, layer);
                    return (
                      <td key={role} className="px-3 py-2 text-center">
                        {actions.length === 0 ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {actions.map((a) => (
                              <ActionBadge key={a} action={a} />
                            ))}
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
        <p className="text-xs text-gray-400 mt-2">
          Fonte: <code>lib/security-access.ts · PERMISSION_MATRIX</code>
        </p>
      </section>

      {/* ── Rotas sensíveis ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Rotas sensíveis ({totalRoutes})
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
                  <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">
                    {route.path}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {LAYER_LABELS[route.layer] ?? route.layer}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${SENSITIVITY_COLOR[route.sensitivity]}`}>
                      {route.sensitivity}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <ActionBadge action={route.requiredAction} />
                  </td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs">
                    {route.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Fonte: <code>lib/security-registry.ts · SENSITIVE_ROUTES</code>
        </p>
      </section>

      {/* ── APIs sensíveis ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          APIs sensíveis ({totalApis})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="px-3 py-2 text-left">Pattern</th>
                <th className="px-3 py-2 text-left">Camada</th>
                <th className="px-3 py-2 text-left">Auth enforcement</th>
                <th className="px-3 py-2 text-left">Recurso</th>
                <th className="px-3 py-2 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SENSITIVE_APIS.map((api) => (
                <tr key={api.pattern} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">
                    {api.pattern}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {LAYER_LABELS[api.layer] ?? api.layer}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${AUTH_COLOR[api.authEnforcement]}`}>
                      {api.authEnforcement}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {api.resource}
                  </td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs">
                    {api.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Fonte: <code>lib/security-registry.ts · SENSITIVE_APIS</code>
        </p>
      </section>

      {/* ── Audit log ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Audit Log
        </h2>
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-800">
          <strong>Limitação v1 — sem persistência.</strong> O audit log é um ring buffer
          in-memory de até 100 eventos por instância de servidor. Em deployments SSR
          (Vercel), eventos acumulam até o próximo cold start. Em static export (GitHub
          Pages), nenhum evento é capturado — não há servidor. Para visualização de
          eventos em tempo real, use a API interna:{" "}
          <code className="font-mono bg-blue-100 px-1 rounded">/api/security/audit</code>{" "}
          (a implementar em v2). Em v2, os eventos serão persistidos em tabela Neon e
          exportados para SIEM.
        </div>
        <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 text-center">
          Visualização de eventos requer endpoint SSR — não disponível em static export.
          <br />
          Consulte <code className="font-mono">lib/security-audit.ts · getRecentAuditEvents()</code> para
          acesso programático.
        </div>
      </section>

      {/* ── Roadmap ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Roadmap
        </h2>
        <div className="space-y-2 text-sm">
          {[
            ["v1 — atual",  "RBAC matrix definida, guard loga, enforcement desligado, registry de rotas e APIs"],
            ["v2",          "Ativar ENFORCEMENT_ACTIVE, persistir audit log em Neon (awq_security_audit_log), endpoint /api/security/audit"],
            ["v3",          "Exportar para SIEM, alertas Slack/e-mail em bloqueios, rate limiting por role"],
            ["v4",          "MFA enterprise, WAF, DLP, revisão periódica de permissões com evidência"],
          ].map(([version, desc]) => (
            <div key={version} className="flex gap-3 p-3 rounded-lg border border-gray-200">
              <span className="font-mono font-semibold text-gray-500 shrink-0 w-20">{version}</span>
              <span className="text-gray-600">{desc}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function StatusCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className={`p-4 rounded-xl border ${color}`}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">
        {label}
      </div>
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
    <span
      className={`inline-block px-1 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${ACTION_COLORS[action]}`}
    >
      {ACTION_SHORT[action]}
    </span>
  );
}
