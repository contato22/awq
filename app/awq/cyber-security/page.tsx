import Header from "@/components/Header";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Database,
  Server,
  Key,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  MinusCircle,
  Activity,
  Building2,
  Clock,
  FileWarning,
  ChevronRight,
  ExternalLink,
  Zap,
  Radio,
} from "lucide-react";
import {
  dataSourceRegistry,
  secretRegistry,
  accessRegistry,
  riskRegister,
  monitoringCapabilities,
  actionQueue,
} from "@/lib/security/registry";
import { computeSecurityKPIs, computePostureScore } from "@/lib/security/audit";
import {
  SEVERITY_CONFIG,
  TRUST_CONFIG,
  MONITORING_CONFIG,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  RISK_CATEGORY_LABELS,
} from "@/lib/security/constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : score >= 60
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`text-lg font-bold px-3 py-1 rounded-xl border ${color}`}>
      {score}/100
    </span>
  );
}

function TrustBadge({ level }: { level: string }) {
  const cfg = TRUST_CONFIG[level as keyof typeof TRUST_CONFIG] ?? TRUST_CONFIG.not_verifiable;
  const Icon =
    level === "confirmed" ? CheckCircle
    : level === "probable" ? AlertTriangle
    : level === "ambiguous" ? HelpCircle
    : MinusCircle;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <Icon size={10} />
      {cfg.labelPt}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.info;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function MonitoringDot({ state }: { state: string }) {
  const cfg = MONITORING_CONFIG[state as keyof typeof MONITORING_CONFIG] ?? MONITORING_CONFIG.not_available;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CyberSecurityPage() {
  const kpis = computeSecurityKPIs();
  const posture = computePostureScore();
  const sortedRisks = [...riskRegister].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });
  const sortedActions = [...actionQueue].sort((a, b) => {
    const order = { p0_immediate: 0, p1_urgent: 1, p2_standard: 2, p3_improvement: 3 };
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
  });

  return (
    <>
      <Header
        title="Cyber Security — AWQ Group"
        subtitle="Seguranca operacional · Governanca de acessos · Monitoramento continuo"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── A) Executive Security Header ───────────────────────────────────── */}
        <div className="card p-5 border-l-4 border-l-red-500">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-200">
                <Shield size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Security Posture — AWQ Group</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Avaliacao baseada em analise estatica do repositorio. Nao substitui pentest ou auditoria externa.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ScoreBadge score={posture.overall} />
              <div className="text-right">
                <div className="text-[10px] text-gray-400">Ultima avaliacao</div>
                <div className="text-[11px] font-semibold text-gray-600">{posture.lastAssessed}</div>
              </div>
            </div>
          </div>

          {/* Sub-scores */}
          <div className="grid grid-cols-2 xl:grid-cols-7 gap-3 mt-4">
            {[
              { label: "Autenticacao",  score: posture.authentication,       icon: Lock    },
              { label: "Autorizacao",   score: posture.authorization,        icon: Key     },
              { label: "Segredos",      score: posture.secretManagement,     icon: EyeOff  },
              { label: "Dados",         score: posture.dataProtection,       icon: Database},
              { label: "Isolamento BU", score: posture.buIsolation,          icon: Building2},
              { label: "Dependencias",  score: posture.dependencyHealth,     icon: ExternalLink},
              { label: "Configuracao",  score: posture.configurationHygiene, icon: Server  },
            ].map((item) => {
              const Icon = item.icon;
              const color = item.score >= 80 ? "text-emerald-600" : item.score >= 60 ? "text-amber-700" : "text-red-600";
              return (
                <div key={item.label} className="text-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <Icon size={14} className={`mx-auto ${color} mb-1`} />
                  <div className={`text-lg font-bold ${color}`}>{item.score}</div>
                  <div className="text-[10px] text-gray-400 leading-tight">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── B) Security KPI Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { label: "Riscos Criticos",       value: kpis.criticalRisks + kpis.highRisks,
              sub: `${kpis.highRisks} alto`,  icon: ShieldX,    color: "text-red-600",    bg: "bg-red-50"    },
            { label: "Riscos Abertos",        value: kpis.openRisks,
              sub: `de ${kpis.totalRisks} total`, icon: ShieldAlert, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Fontes Seguras",        value: kpis.secureDataSources,
              sub: `de ${kpis.totalDataSources} fontes`, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Segredos Expostos",     value: kpis.exposedSecrets,
              sub: `de ${kpis.totalSecrets} total`,  icon: Eye,       color: "text-red-600",    bg: "bg-red-50"    },
            { label: "Posture Score",         value: `${kpis.postureScore}/100`,
              sub: "Score geral",                    icon: Shield,    color: posture.overall >= 60 ? "text-amber-700" : "text-red-600",
              bg: posture.overall >= 60 ? "bg-amber-50" : "bg-red-50" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-[11px] font-medium text-gray-400 mt-0.5 leading-tight">{card.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── C) Risk Register ────────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-600" />
                <h2 className="text-sm font-semibold text-gray-900">Risk Register</h2>
                <span className="badge badge-red">{kpis.highRisks} alto</span>
                <span className="badge badge-yellow">{kpis.mediumRisks} medio</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {sortedRisks.map((risk) => {
                const sev = SEVERITY_CONFIG[risk.severity];
                return (
                  <div key={risk.id} className={`flex items-start gap-3 p-3 rounded-lg ${sev.bg} border ${sev.border}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${sev.dot} shrink-0 mt-1.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900">{risk.title}</span>
                        <SeverityBadge severity={risk.severity} />
                        <StatusBadge status={risk.status} />
                        <TrustBadge level={risk.trustLevel} />
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">{risk.description}</div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-gray-400">
                          <span className="font-semibold">BU:</span> {risk.bu}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          <span className="font-semibold">Modulo:</span> {risk.module}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          <span className="font-semibold">Categoria:</span> {RISK_CATEGORY_LABELS[risk.category] ?? risk.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        <span className="font-semibold">Evidencia:</span> {risk.evidence}
                      </div>
                      <div className={`text-[10px] font-semibold ${sev.color} mt-1`}>
                        <AlertTriangle size={9} className="inline mr-1" />
                        {risk.recommendation}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── D) Security Actions Queue ───────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-amber-700" />
              <h2 className="text-sm font-semibold text-gray-900">Action Queue</h2>
            </div>
            <div className="space-y-2">
              {sortedActions.map((action) => {
                const pri = PRIORITY_CONFIG[action.priority];
                return (
                  <div key={action.id} className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${pri.bg} ${pri.color}`}>
                        {pri.label}
                      </span>
                      <SeverityBadge severity={action.severity} />
                    </div>
                    <div className="text-xs font-semibold text-gray-900 mt-1">{action.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{action.description}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400">Owner: {action.suggestedOwner}</span>
                      <span className="text-[10px] text-gray-400">Esforco: {action.estimatedEffort}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── E) Data Source Security Map ─────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-900">Data Source Security Map</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Fonte</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">BU</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Dep. Ext.</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Segredo</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Exposicao</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Confianca</th>
                </tr>
              </thead>
              <tbody>
                {dataSourceRegistry.map((ds) => (
                  <tr key={ds.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="text-xs font-semibold text-gray-900">{ds.name}</div>
                      <div className="text-[10px] text-gray-400">{ds.filePath}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {ds.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-600">{ds.bu}</td>
                    <td className="py-2.5 px-3 text-center">
                      {ds.hasExternalDependency
                        ? <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Sim</span>
                        : <span className="text-[10px] text-gray-400">Nao</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {ds.requiresSecret
                        ? ds.secretExposed
                          ? <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Exposto</span>
                          : <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Protegido</span>
                        : <span className="text-[10px] text-gray-400">N/A</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {ds.secretExposed
                        ? <Unlock size={12} className="mx-auto text-red-600" />
                        : <Lock size={12} className="mx-auto text-emerald-600" />}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <TrustBadge level={ds.trustLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── F) Access & Credentials Panel ──────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={14} className="text-violet-600" />
            <h2 className="text-sm font-semibold text-gray-900">Access & Credentials Panel</h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Access Audit */}
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Controle de Acesso</div>
              <div className="space-y-2">
                {accessRegistry.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900">{a.area}</span>
                      <SeverityBadge severity={a.severity} />
                      <TrustBadge level={a.trustLevel} />
                    </div>
                    <div className="text-[11px] text-gray-500">{a.description}</div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px]">
                        {a.hasAuthentication
                          ? <><CheckCircle size={10} className="text-emerald-600" /> <span className="text-emerald-600 font-semibold">Auth</span></>
                          : <><MinusCircle size={10} className="text-red-600" /> <span className="text-red-600 font-semibold">Sem Auth</span></>}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px]">
                        {a.rbacEnforced
                          ? <><CheckCircle size={10} className="text-emerald-600" /> <span className="text-emerald-600 font-semibold">RBAC Ativo</span></>
                          : <><MinusCircle size={10} className="text-amber-700" /> <span className="text-amber-700 font-semibold">RBAC Inativo</span></>}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px]">
                        {a.buIsolation
                          ? <><CheckCircle size={10} className="text-emerald-600" /> <span className="text-emerald-600 font-semibold">BU Isolada</span></>
                          : <><MinusCircle size={10} className="text-amber-700" /> <span className="text-amber-700 font-semibold">Sem Isolamento</span></>}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">{a.notes}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Secret Audit */}
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Segredos & Credenciais</div>
              <div className="space-y-2">
                {secretRegistry.map((s) => {
                  const isRisky = s.exposureRisk === "client_risk" || s.exposureRisk === "hardcoded";
                  return (
                    <div key={s.id} className={`p-3 rounded-lg border ${isRisky ? "border-red-200 bg-red-50/50" : "border-gray-200"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {isRisky ? <Unlock size={12} className="text-red-600" /> : <Lock size={12} className="text-emerald-600" />}
                        <span className="text-xs font-semibold text-gray-900">{s.name}</span>
                        <TrustBadge level={s.trustLevel} />
                      </div>
                      <div className="text-[11px] text-gray-500">{s.notes}</div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-gray-400">Env: <span className="font-mono">{s.envVariable}</span></span>
                        <span className={`text-[10px] font-bold ${isRisky ? "text-red-600" : "text-emerald-600"}`}>
                          {s.exposureRisk === "server_only" ? "Server-only" : s.exposureRisk === "client_risk" ? "Client Risk" : s.exposureRisk === "hardcoded" ? "Hardcoded" : s.exposureRisk}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── G) 24h Monitoring / Readiness Panel ────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Radio size={14} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-900">Monitoramento Continuo & Readiness 24h</h2>
          </div>
          <p className="text-[11px] text-gray-400 mb-4">
            Estado real das capacidades de monitoramento. Itens marcados como &quot;Planejado&quot; ou &quot;Indisponivel&quot; ainda nao estao ativos.
            O monitoramento 24h e um objetivo de maturidade, nao uma promessa de SOC ativo.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {monitoringCapabilities.map((cap) => {
              const cfg = MONITORING_CONFIG[cap.state];
              return (
                <div key={cap.id} className={`p-3 rounded-lg border border-gray-200 ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-900">{cap.name}</span>
                    <MonitoringDot state={cap.state} />
                  </div>
                  <div className="text-[11px] text-gray-500">{cap.description}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{cap.notes}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── H) Methodology & Trust Layer ────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileWarning size={14} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Metodologia & Camada de Confianca</h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Niveis de Confianca</div>
              <div className="space-y-2">
                {(Object.entries(TRUST_CONFIG) as [string, typeof TRUST_CONFIG[keyof typeof TRUST_CONFIG]][]).map(([key, cfg]) => {
                  const Icon = key === "confirmed" ? CheckCircle : key === "probable" ? AlertTriangle : key === "ambiguous" ? HelpCircle : MinusCircle;
                  return (
                    <div key={key} className={`flex items-center gap-3 p-2.5 rounded-lg border ${cfg.bg}`}>
                      <Icon size={14} className={cfg.color} />
                      <div>
                        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.labelPt}</span>
                        <span className="text-[10px] text-gray-400 ml-2">
                          {key === "confirmed" && "Verificavel diretamente no repositorio"}
                          {key === "probable" && "Evidencia forte, mas nao totalmente provavel"}
                          {key === "ambiguous" && "Evidencia parcial, requer investigacao"}
                          {key === "not_verifiable" && "Nao determinavel por analise estatica"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Metodologia do Score</div>
              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="text-[11px] text-gray-500 leading-relaxed">{posture.methodology}</p>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={12} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-amber-700">Aviso de Transparencia</div>
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      A seguranca exibida nesta pagina depende do que o repositorio permite validar estaticamente.
                      Riscos de runtime, rede, infraestrutura e engenharia social nao estao cobertos.
                      Este painel nao substitui auditoria de seguranca profissional ou pentest.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
