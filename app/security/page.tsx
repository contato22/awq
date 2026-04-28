// ─── AWQ Security — Painel de Segurança (v2 — cobertura ampliada) ─────────────

import { SENSITIVE_ROUTES, SENSITIVE_APIS } from "@/lib/security-registry";
import { SECURITY_ENFORCEMENT_MODE, getAllowedActions } from "@/lib/security-access";
import type { SecurityLayer, SecurityRole, SecurityAction } from "@/lib/security-types";

export const metadata = { title: "Segurança | AWQ" };

const LAYER_LABELS: Record<SecurityLayer, string> = { holding: "Holding", jacqes: "JACQES", caza_vision: "Caza Vision", awq_venture: "AWQ Venture", advisor: "Advisor", financeiro: "Financeiro", juridico: "Jurídico", dados_infra: "Dados & Infra", security: "Segurança", system: "Sistema", ai: "IA" };
const ACTION_SHORT: Record<SecurityAction, string> = { view: "view", create: "create", update: "update", delete: "delete", export: "export", import: "import", approve: "approve", manage_security: "mgmt_sec" };
const SENSITIVITY_COLOR: Record<string, string> = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700" };
const AUTH_COLOR: Record<string, string> = { "middleware-jwt": "bg-emerald-100 text-emerald-700", "internal-token-check": "bg-blue-100 text-blue-700", "middleware-only": "bg-amber-100 text-amber-700", "none": "bg-red-100 text-red-700" };
const GUARD_STATUS_COLOR: Record<string, string> = { guarded: "bg-emerald-100 text-emerald-700", audit_only: "bg-amber-100 text-amber-700", registered: "bg-gray-100 text-gray-500" };
const ROUTE_GUARD_COLOR: Record<string, string> = { ready_for_guard: "bg-blue-100 text-blue-700", registered: "bg-gray-100 text-gray-500", not_ready: "bg-amber-100 text-amber-700", guarded: "bg-emerald-100 text-emerald-700" };

const ENFORCEMENT_CONFIG = {
  audit_only: { label: "AUDIT ONLY", desc: "Loga tudo, nunca bloqueia", color: "text-amber-700 bg-amber-50 border-amber-200" },
  api_guarded: { label: "API GUARDED", desc: "APIs bloqueiam sem permissão — UI permanece permissiva", color: "text-blue-700 bg-blue-50 border-blue-200" },
  full: { label: "FULL ENFORCEMENT", desc: "Bloqueia API e UI (futuro v3)", color: "text-red-700 bg-red-50 border-red-200" },
};

const CANONICAL_ROLES: SecurityRole[] = ["owner", "admin", "finance", "operator", "viewer"];
const ALL_LAYERS: SecurityLayer[] = ["holding", "jacqes", "caza_vision", "awq_venture", "advisor", "financeiro", "juridico", "dados_infra", "security", "system", "ai"];

export default function SecurityPage() {
  const totalRoutes = SENSITIVE_ROUTES.length;
  const totalApis   = SENSITIVE_APIS.length;
  const guardedApis = SENSITIVE_APIS.filter(a => a.guardStatus === "guarded").length;
  const highRoutes  = SENSITIVE_ROUTES.filter(r => r.sensitivity === "high").length;
  const readyRoutes = SENSITIVE_ROUTES.filter(r => r.routeGuardStatus === "ready_for_guard").length;
  const modeConfig  = ENFORCEMENT_CONFIG[SECURITY_ENFORCEMENT_MODE];
  const coveragePct = totalApis > 0 ? Math.round((guardedApis / totalApis) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Segurança</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">Dados & Infra</span>
        </div>
        <p className="text-sm text-gray-500">Enforcement progressivo: APIs bloqueadas por RBAC · Audit log persistente (Neon) · Matriz de roles.</p>
        <p className="text-xs text-blue-600 mt-1">Compliance (LGPD, políticas, aceites) → <a href="/compliance" className="underline">/awq/compliance</a></p>
      </div>

      {/* ── Enforcement mode ─── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Modo de Enforcement</h2>
        <div className={`p-4 rounded-xl border ${modeConfig.color}`}>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold font-mono">{modeConfig.label}</span>
            <span className="text-sm opacity-80">{modeConfig.desc}</span>
          </div>
          <div className="mt-2 text-xs opacity-70 flex items-center gap-2">
            <span className={SECURITY_ENFORCEMENT_MODE === "audit_only" ? "font-bold underline" : ""}>audit_only</span><span>→</span>
            <span className={SECURITY_ENFORCEMENT_MODE === "api_guarded" ? "font-bold underline" : ""}>api_guarded ← atual</span><span>→</span>
            <span className={SECURITY_ENFORCEMENT_MODE === "full" ? "font-bold underline" : "opacity-50"}>full (v3)</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
          <StatusCard label="Cobertura API"    value={`${coveragePct}%`}      sub={`${guardedApis} de ${totalApis} guarded`}     color="text-emerald-700 bg-emerald-50 border-emerald-200" />
          <StatusCard label="Rotas sensíveis"  value={String(totalRoutes)}    sub={`${highRoutes} high · UI permissiva`}          color="text-gray-700 bg-gray-50 border-gray-200" />
          <StatusCard label="APIs registradas" value={String(totalApis)}      sub="no security registry"                          color="text-gray-700 bg-gray-50 border-gray-200" />
          <StatusCard label="Roles canônicos"  value="5"                      sub="owner admin finance operator viewer"            color="text-gray-700 bg-gray-50 border-gray-200" />
          <StatusCard label="Audit log"        value="DB + mem"              sub="Neon quando disponível; fallback in-memory"      color="text-blue-700 bg-blue-50 border-blue-200" />
        </div>
      </section>

      {/* ── Security Headers ─── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Hardening</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {[
            ["X-Content-Type-Options: nosniff", "Previne MIME sniffing"],
            ["X-Frame-Options: SAMEORIGIN", "Previne clickjacking via iframe"],
            ["Referrer-Policy: strict-origin-when-cross-origin", "Limita envio de referer"],
            ["Permissions-Policy: camera=(), microphone=(), geolocation=()", "Desabilita APIs de dispositivo"],
          ].map(([header, desc]) => (
            <div key={header} className="flex gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
              <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
              <div>
                <div className="font-mono text-xs font-medium text-emerald-700">{header}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role aliases ─── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Normalização de Roles</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold"><th className="px-3 py-2 text-left">JWT Role</th><th className="px-3 py-2 text-left">Canônico</th><th className="px-3 py-2 text-left">Usuário</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-3 py-2 font-mono text-amber-700">analyst</td><td className="px-3 py-2 font-mono text-blue-700">finance</td><td className="px-3 py-2 text-gray-600">p.nair@jacqes.com</td></tr>
              <tr><td className="px-3 py-2 font-mono text-amber-700">cs-ops</td><td className="px-3 py-2 font-mono text-blue-700">operator</td><td className="px-3 py-2 text-gray-600">danilo@jacqes.com</td></tr>
              <tr className="bg-gray-50/40"><td className="px-3 py-2 font-mono text-gray-500">anonymous</td><td className="px-3 py-2 text-red-600 font-semibold">bloqueado</td><td className="px-3 py-2 text-gray-400">sem JWT</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── RBAC Matrix ─── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Matriz RBAC</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="px-3 py-2 text-left font-semibold text-gray-600">Camada</th>{CANONICAL_ROLES.map(r => <th key={r} className="px-3 py-2 text-center font-semibold text-gray-600 capitalize">{r}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {ALL_LAYERS.map(layer => (
                <tr key={layer} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">{LAYER_LABELS[layer]}</td>
                  {CANONICAL_ROLES.map(role => {
                    const actions = getAllowedActions(role, layer);
                    return <td key={role} className="px-3 py-2 text-center">{actions.length === 0 ? <span className="text-gray-300">—</span> : <div className="flex flex-wrap gap-0.5 justify-center">{actions.map(a => <ActionBadge key={a} action={a} />)}</div>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── API Guard Status ─── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">APIs Sensíveis — Guard Status ({totalApis})</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold"><th className="px-3 py-2 text-left">Pattern</th><th className="px-3 py-2 text-left">Camada</th><th className="px-3 py-2 text-left">Guard</th><th className="px-3 py-2 text-left">Auth</th><th className="px-3 py-2 text-left">Ação</th><th className="px-3 py-2 text-left">Descrição</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {SENSITIVE_APIS.map(api => (
                <tr key={api.pattern} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">{api.pattern}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{LAYER_LABELS[api.layer] ?? api.layer}</td>
                  <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${GUARD_STATUS_COLOR[api.guardStatus]}`}>{api.guardStatus}</span></td>
                  <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${AUTH_COLOR[api.authEnforcement]}`}>{api.authEnforcement}</span></td>
                  <td className="px-3 py-2"><ActionBadge action={api.requiredAction} /></td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs">{api.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── UI Routes — v3 prep ─── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Rotas UI — Prontidão v3 ({totalRoutes})</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold"><th className="px-3 py-2 text-left">Path</th><th className="px-3 py-2 text-left">Camada</th><th className="px-3 py-2 text-left">Sensibilidade</th><th className="px-3 py-2 text-left">v3 Status</th><th className="px-3 py-2 text-left">Descrição</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {SENSITIVE_ROUTES.map(route => (
                <tr key={route.path} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">{route.path}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{LAYER_LABELS[route.layer] ?? route.layer}</td>
                  <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${SENSITIVITY_COLOR[route.sensitivity]}`}>{route.sensitivity}</span></td>
                  <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ROUTE_GUARD_COLOR[route.routeGuardStatus ?? "registered"]}`}>{route.routeGuardStatus ?? "registered"}</span></td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs">{route.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-1"><span className="text-blue-600 font-medium">ready_for_guard</span> = pronta para enforcement v3 · <span className="text-amber-600 font-medium">not_ready</span> = requer teste com roles · middleware permissivo até v3</p>
      </section>

      {/* ── Audit log ─── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Audit Log</h2>
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-800">
          <strong>v2: persistência em Neon quando DATABASE_URL disponível.</strong>{" "}
          Tabela <code className="font-mono bg-blue-100 px-1 rounded">awq_security_audit_log</code> criada automaticamente (idempotente).
          Fallback in-memory (100 eventos, reset no cold start) quando DB ausente.
          Consulta via <code className="font-mono bg-blue-100 px-1 rounded">GET /api/security/audit</code> (owner/admin only).
        </div>
        <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 text-center">
          Em static export (GitHub Pages), zero eventos capturados — não há servidor.
        </div>
      </section>

      {/* ── O que NÃO tem ─── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">O que esta versão NÃO tem</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {[
            ["Rotas UI bloqueadas", "Middleware permissivo — modo full é v3"],
            ["SIEM / exportação", "Sem Datadog, Splunk, CloudWatch (v4)"],
            ["MFA / 2FA enterprise", "Apenas JWT via next-auth (v5)"],
            ["WAF / rate-limit", "Sem brute-force ou DDoS protection (v4)"],
            ["CSP rígido", "Sem Content-Security-Policy (risco de quebrar Next.js assets)"],
            ["DLP", "Sem inspeção de payloads de resposta (v5)"],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-red-400 shrink-0 mt-0.5">✕</span>
              <div><div className="font-medium text-gray-700">{title}</div><div className="text-xs text-gray-500 mt-0.5">{desc}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roadmap ─── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Roadmap</h2>
        <div className="space-y-2 text-sm">
          {([
            ["v1", "RBAC matrix, guard loga, enforcement desligado"],
            ["v2 — atual", "api_guarded: 100% APIs guarded; audit log em Neon; security headers; cobertura ampliada; v3 prep"],
            ["v3", "Ativar full enforcement para rotas UI ready_for_guard; /api/security/audit com dashboard live"],
            ["v4", "SIEM, alertas Slack/e-mail, rate limiting, WAF"],
            ["v5", "MFA/passkeys, DLP, revisão periódica de permissões, SOC/MDR"],
          ] as const).map(([v, d]) => (
            <div key={v} className="flex gap-3 p-3 rounded-lg border border-gray-200">
              <span className={`font-mono font-semibold shrink-0 w-24 ${v.includes("atual") ? "text-blue-600" : "text-gray-500"}`}>{v}</span>
              <span className="text-gray-600">{d}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return <div className={`p-4 rounded-xl border ${color}`}><div className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">{label}</div><div className="text-xl font-bold">{value}</div><div className="text-xs mt-1 opacity-60">{sub}</div></div>;
}

const ACTION_COLORS: Record<SecurityAction, string> = { view: "bg-gray-100 text-gray-600", create: "bg-green-100 text-green-700", update: "bg-blue-100 text-blue-700", delete: "bg-red-100 text-red-700", export: "bg-violet-100 text-violet-700", import: "bg-amber-100 text-amber-700", approve: "bg-emerald-100 text-emerald-700", manage_security: "bg-rose-100 text-rose-700" };

function ActionBadge({ action }: { action: SecurityAction }) {
  return <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${ACTION_COLORS[action]}`}>{ACTION_SHORT[action]}</span>;
}
