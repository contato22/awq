"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReactNode, FormEvent } from "react";
import Header from "@/components/Header";
import {
  HeartPulse, ThumbsUp, ThumbsDown, Minus, Star,
  AlertTriangle, CheckCircle2, TrendingDown, TrendingUp,
  Users, Send, X, Plus, RefreshCw, MessageSquare,
  Calendar, Activity, ChevronRight, BarChart3,
} from "lucide-react";
import type {
  NpsSurvey, CsatSurvey, AccountHealthSummary, NpsCategory,
} from "@/lib/crm-types";
import {
  SEED_NPS_SURVEYS, SEED_CSAT_SURVEYS, SEED_ACCOUNTS,
} from "@/lib/crm-db";
import { formatDateBR } from "@/lib/utils";

// ─── Config ───────────────────────────────────────────────────────────────────

const NPS_CAT: Record<NpsCategory, { label: string; icon: ReactNode; color: string; bg: string; border: string }> = {
  promoter:  { label: "Promotor",   icon: <ThumbsUp size={12} />,   color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  passive:   { label: "Neutro",     icon: <Minus size={12} />,      color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"   },
  detractor: { label: "Detrator",   icon: <ThumbsDown size={12} />, color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200"     },
};

const CHURN_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: "Baixo",  color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  medium: { label: "Médio",  color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"   },
  high:   { label: "Alto",   color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200"     },
};

function fmtDt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ScoreBar({ score, max = 10, color = "bg-blue-500" }: { score: number; max?: number; color?: string }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-800 w-8 text-right">{score}</span>
    </div>
  );
}

function HealthRing({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const r = 28; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}

// ─── Send Survey Modal ────────────────────────────────────────────────────────

type SurveyType = "nps" | "csat";

function SendSurveyModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [type, setType] = useState<SurveyType>("nps");
  const [accountId, setAccountId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const accounts = SEED_ACCOUNTS.filter(a => a.account_type === "customer");

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!accountId) { setError("Selecione uma conta"); return; }
    setSending(true);
    try {
      const action = type === "nps" ? "create_nps" : "create_csat";
      const res = await fetch("/api/crm/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, account_id: accountId, sent_by: "Miguel" }),
      });
      const json = await res.json();
      if (json.success) { onSent(); }
      else setError(json.error ?? "Erro ao enviar");
    } catch { setError("Erro de conexão"); }
    finally { setSending(false); }
  }

  const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Enviar Pesquisa</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
        </div>
        <form onSubmit={handleSend} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Tipo de pesquisa</label>
            <div className="grid grid-cols-2 gap-2">
              {(["nps", "csat"] as SurveyType[]).map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setType(t)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    type === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {t === "nps" ? "NPS (0–10)" : "CSAT (1–5)"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Conta *</label>
            <select className={`${inputCls} cursor-pointer`} value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">Selecionar conta…</option>
              {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
            </select>
          </div>
          {type === "nps" && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              <strong>NPS:</strong> "Em uma escala de 0 a 10, qual a probabilidade de você recomendar a AWQ para um amigo ou colega?"
            </div>
          )}
          {type === "csat" && (
            <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 text-xs text-violet-800">
              <strong>CSAT:</strong> "Como você avalia a satisfação com nosso trabalho nos últimos 30 dias? (1 = Muito insatisfeito, 5 = Muito satisfeito)"
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSend as unknown as React.MouseEventHandler} disabled={sending}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
            {sending ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
            Enviar pesquisa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Respond Modal ────────────────────────────────────────────────────────────

function RespondModal({ survey, type, onClose, onSaved }: {
  survey: NpsSurvey | CsatSurvey; type: "nps" | "csat";
  onClose: () => void; onSaved: () => void;
}) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const max = type === "nps" ? 10 : 5;
  const scores = Array.from({ length: max + (type === "nps" ? 1 : 0) }, (_, i) => i + (type === "csat" ? 1 : 0));

  function scoreColor(s: number) {
    if (type === "nps") {
      if (s >= 9) return "bg-emerald-500 text-white border-emerald-500";
      if (s >= 7) return "bg-amber-400 text-white border-amber-400";
      return "bg-red-500 text-white border-red-500";
    }
    if (s >= 4) return "bg-emerald-500 text-white border-emerald-500";
    if (s === 3) return "bg-amber-400 text-white border-amber-400";
    return "bg-red-500 text-white border-red-500";
  }

  async function handleSave() {
    if (score === null) return;
    setSaving(true);
    try {
      const action = type === "nps" ? "respond_nps" : "respond_csat";
      const res = await fetch("/api/crm/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, survey_id: survey.survey_id, score, comment: comment || undefined }),
      });
      const json = await res.json();
      if (json.success) { onSaved(); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Registrar resposta — {type.toUpperCase()}</h3>
            <p className="text-[11px] text-gray-500">{survey.account_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">
              {type === "nps" ? "Score (0 = muito improvável · 10 = certamente indicaria)" : "Score (1 = muito insatisfeito · 5 = muito satisfeito)"}
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {scores.map(s => (
                <button
                  key={s} type="button"
                  onClick={() => setScore(s)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold border-2 transition-all ${
                    score === s ? scoreColor(s) : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {score !== null && type === "nps" && (
              <p className={`text-[11px] mt-2 font-semibold ${score >= 9 ? "text-emerald-700" : score >= 7 ? "text-amber-600" : "text-red-600"}`}>
                {score >= 9 ? "Promotor — vai indicar a AWQ" : score >= 7 ? "Neutro — satisfeito mas não indica ativamente" : "Detrator — risco de churn e críticas"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Comentário (opcional)</label>
            <textarea rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              placeholder="O que o cliente disse…" value={comment} onChange={e => setComment(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={score === null || saving}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={14} />}
            Salvar resposta
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Account Health Card ──────────────────────────────────────────────────────

function HealthCard({ summary }: { summary: AccountHealthSummary }) {
  const churn = CHURN_CFG[summary.churn_risk] ?? CHURN_CFG.low;
  const npsCat = summary.nps_category ? NPS_CAT[summary.nps_category] : null;
  const score = summary.health_score;
  const ringColor = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <HealthRing score={score} />
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${ringColor}`}>{score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{summary.account_name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${churn.bg} ${churn.color} ${churn.border}`}>
              Churn {churn.label}
            </span>
            {npsCat && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${npsCat.bg} ${npsCat.color} ${npsCat.border}`}>
                {npsCat.icon}NPS {summary.latest_nps}
              </span>
            )}
            {summary.latest_csat !== null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Star size={9} />CSAT {summary.latest_csat}/5
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><Activity size={9} />Ops abertas: {summary.open_opps}</span>
            {summary.renewal_date && (
              <span className="flex items-center gap-1"><Calendar size={9} />Renova: {formatDateBR(summary.renewal_date)}</span>
            )}
            {summary.last_activity_at && (
              <span className="flex items-center gap-1 col-span-2"><CheckCircle2 size={9} />Última atividade: {fmtDt(summary.last_activity_at)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "nps" | "csat";

export default function HealthPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [summaries, setSummaries] = useState<AccountHealthSummary[]>([]);
  const [nps, setNps] = useState<NpsSurvey[]>([]);
  const [csat, setCsat] = useState<CsatSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [respondTarget, setRespondTarget] = useState<{ survey: NpsSurvey | CsatSurvey; type: "nps" | "csat" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, nRes, cRes] = await Promise.all([
        fetch("/api/crm/health"),
        fetch("/api/crm/health?resource=nps"),
        fetch("/api/crm/health?resource=csat"),
      ]);
      const [sJson, nJson, cJson] = await Promise.all([sRes.json(), nRes.json(), cRes.json()]);
      if (sJson.success && sJson.data.length) setSummaries(sJson.data);
      else {
        // Build summaries from seed
        const accounts = (await import("@/lib/crm-db")).SEED_ACCOUNTS
          .filter(a => a.account_type === "customer")
          .map(a => ({
            account_id: a.account_id, account_name: a.account_name,
            health_score: a.health_score, churn_risk: a.churn_risk,
            latest_nps: null, nps_category: null, latest_csat: null,
            open_opps: 0, last_activity_at: null, renewal_date: a.renewal_date ?? null,
          } as AccountHealthSummary));
        setSummaries(accounts);
      }
      setNps(nJson.success ? nJson.data : SEED_NPS_SURVEYS);
      setCsat(cJson.success ? cJson.data : SEED_CSAT_SURVEYS);
    } catch {
      setNps(SEED_NPS_SURVEYS);
      setCsat(SEED_CSAT_SURVEYS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── NPS KPIs ──
  const responded = nps.filter(n => n.response_score !== null);
  const promoters  = responded.filter(n => n.category === "promoter").length;
  const detractors = responded.filter(n => n.category === "detractor").length;
  const npsScore   = responded.length > 0
    ? Math.round((promoters - detractors) / responded.length * 100)
    : null;
  const csatAvg    = csat.filter(c => c.response_score !== null).length > 0
    ? +(csat.filter(c => c.response_score !== null).reduce((s, c) => s + (c.response_score ?? 0), 0) /
        csat.filter(c => c.response_score !== null).length).toFixed(1)
    : null;
  const responseRate = nps.length > 0 ? Math.round(responded.length / nps.length * 100) : 0;

  const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: "overview", label: "Visão Geral",  icon: <HeartPulse size={14} /> },
    { key: "nps",      label: `NPS (${nps.length})`,   icon: <ThumbsUp size={14} /> },
    { key: "csat",     label: `CSAT (${csat.length})`, icon: <Star size={14} /> },
  ];

  return (
    <>
      <Header title="Account Health — CRM AWQ" subtitle="NPS, CSAT e risco de churn" />

      {showSend && <SendSurveyModal onClose={() => setShowSend(false)} onSent={() => { setShowSend(false); load(); }} />}
      {respondTarget && (
        <RespondModal
          survey={respondTarget.survey}
          type={respondTarget.type}
          onClose={() => setRespondTarget(null)}
          onSaved={() => { setRespondTarget(null); load(); }}
        />
      )}

      <div className="page-container">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div />
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={() => setShowSend(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Send size={14} />Enviar pesquisa
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "NPS Score",
              value: npsScore !== null ? (npsScore > 0 ? `+${npsScore}` : String(npsScore)) : "—",
              sub: `${promoters} promotores · ${detractors} detratores`,
              icon: <ThumbsUp size={15} className={npsScore !== null && npsScore >= 50 ? "text-emerald-600" : npsScore !== null && npsScore >= 0 ? "text-amber-600" : "text-gray-400"} />,
              bg: npsScore !== null && npsScore >= 50 ? "bg-emerald-50" : npsScore !== null && npsScore >= 0 ? "bg-amber-50" : "bg-gray-50",
              valColor: npsScore !== null && npsScore >= 50 ? "text-emerald-700" : npsScore !== null && npsScore >= 0 ? "text-amber-700" : "text-gray-500",
            },
            {
              label: "CSAT Médio",
              value: csatAvg !== null ? `${csatAvg}/5` : "—",
              sub: `${csat.filter(c => c.response_score !== null).length} respostas`,
              icon: <Star size={15} className="text-blue-600" />, bg: "bg-blue-50", valColor: "text-blue-700",
            },
            {
              label: "Taxa de Resposta",
              value: `${responseRate}%`,
              sub: `${responded.length} de ${nps.length} NPS`,
              icon: <BarChart3 size={15} className="text-violet-600" />, bg: "bg-violet-50", valColor: "text-violet-700",
            },
            {
              label: "Risco Alto de Churn",
              value: summaries.filter(s => s.churn_risk === "high").length,
              sub: `de ${summaries.length} clientes`,
              icon: <TrendingDown size={15} className="text-red-600" />, bg: "bg-red-50", valColor: "text-red-700",
            },
          ].map(k => (
            <div key={k.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>{k.icon}</div>
              <div>
                <div className={`text-lg font-bold ${k.valColor}`}>{k.value}</div>
                <div className="text-[10px] text-gray-500">{k.label}</div>
                <div className="text-[9px] text-gray-400">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === "overview" && (
              <div className="space-y-4">
                {/* Churn risk matrix */}
                <div className="grid grid-cols-3 gap-3">
                  {(["high", "medium", "low"] as const).map(risk => {
                    const cfg = CHURN_CFG[risk];
                    const accs = summaries.filter(s => s.churn_risk === risk);
                    return (
                      <div key={risk} className={`card p-4 border ${cfg.border}`}>
                        <div className={`text-xs font-bold mb-2 ${cfg.color}`}>Risco {cfg.label} ({accs.length})</div>
                        <div className="space-y-1.5">
                          {accs.length === 0 ? (
                            <p className="text-[11px] text-gray-400">Nenhuma conta</p>
                          ) : accs.slice(0, 4).map(a => (
                            <div key={a.account_id} className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-gray-700 truncate">{a.account_name}</span>
                              <span className="text-[11px] font-bold text-gray-500 shrink-0">{a.health_score}</span>
                            </div>
                          ))}
                          {accs.length > 4 && <p className="text-[10px] text-gray-400">+{accs.length - 4} mais</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Health score distribution */}
                <div className="card p-4">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Health Score — distribuição</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Ótimo (70–100)",   range: [70, 100], color: "bg-emerald-500" },
                      { label: "Regular (40–69)",   range: [40, 69],  color: "bg-amber-400"   },
                      { label: "Crítico (0–39)",    range: [0,  39],  color: "bg-red-500"     },
                    ].map(band => {
                      const count = summaries.filter(s => s.health_score >= band.range[0] && s.health_score <= band.range[1]).length;
                      const pct = summaries.length > 0 ? Math.round(count / summaries.length * 100) : 0;
                      return (
                        <div key={band.label} className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-600 w-36 shrink-0">{band.label}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${band.color} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-gray-500 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Account cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {summaries.sort((a, b) => a.health_score - b.health_score).map(s => (
                    <HealthCard key={s.account_id} summary={s} />
                  ))}
                </div>
              </div>
            )}

            {/* ── NPS TAB ── */}
            {tab === "nps" && (
              <div className="space-y-4">
                {/* NPS distribution */}
                <div className="grid grid-cols-3 gap-3">
                  {(["promoter", "passive", "detractor"] as NpsCategory[]).map(cat => {
                    const cfg = NPS_CAT[cat];
                    const count = responded.filter(n => n.category === cat).length;
                    const pct = responded.length > 0 ? Math.round(count / responded.length * 100) : 0;
                    return (
                      <div key={cat} className={`card p-4 border ${cfg.border}`}>
                        <div className={`flex items-center gap-1.5 mb-2 ${cfg.color}`}>
                          {cfg.icon}<span className="text-xs font-bold">{cfg.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{count}</div>
                        <div className="text-[10px] text-gray-500">{pct}% dos respondidos</div>
                      </div>
                    );
                  })}
                </div>

                {/* Survey list */}
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Conta / Contato</th>
                        <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Período</th>
                        <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                        <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Comentário</th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {nps.map(n => {
                        const cat = n.category ? NPS_CAT[n.category] : null;
                        return (
                          <tr key={n.survey_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="text-xs font-semibold text-gray-900">{n.account_name}</div>
                              {n.contact_name && <div className="text-[10px] text-gray-400">{n.contact_name}</div>}
                            </td>
                            <td className="py-3 px-4 hidden sm:table-cell">
                              <span className="text-[11px] text-gray-500">{n.period}</span>
                            </td>
                            <td className="py-3 px-4">
                              {n.response_score !== null ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-900">{n.response_score}</span>
                                  {cat && <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>{cat.icon}</span>}
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400">Aguardando</span>
                              )}
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <span className="text-xs text-gray-500 truncate block max-w-xs">{n.comment ?? "—"}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {n.response_score === null && (
                                <button
                                  onClick={() => setRespondTarget({ survey: n, type: "nps" })}
                                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 ml-auto"
                                >
                                  <MessageSquare size={11} />Registrar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {nps.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <ThumbsUp size={24} className="mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Nenhuma pesquisa NPS enviada</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CSAT TAB ── */}
            {tab === "csat" && (
              <div className="space-y-4">
                {/* CSAT score bars */}
                <div className="card p-4">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Distribuição por score</h3>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(s => {
                      const count = csat.filter(c => c.response_score === s).length;
                      const total = csat.filter(c => c.response_score !== null).length;
                      const pct = total > 0 ? Math.round(count / total * 100) : 0;
                      const colors = ["", "bg-red-500", "bg-orange-400", "bg-amber-400", "bg-lime-500", "bg-emerald-500"];
                      return (
                        <div key={s} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-12 shrink-0">
                            {Array.from({ length: s }).map((_, i) => (
                              <Star key={i} size={9} className="text-amber-400 fill-amber-400" />
                            ))}
                          </div>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${colors[s]} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-gray-500 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CSAT list */}
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Conta</th>
                        <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Contexto</th>
                        <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                        <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Comentário</th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {csat.map(c => (
                        <tr key={c.survey_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="text-xs font-semibold text-gray-900">{c.account_name}</div>
                            {c.contact_name && <div className="text-[10px] text-gray-400">{c.contact_name}</div>}
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <span className="text-[11px] text-gray-500">{c.related_name ?? c.related_to_type ?? "Geral"}</span>
                          </td>
                          <td className="py-3 px-4">
                            {c.response_score !== null ? (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: c.response_score }).map((_, i) => (
                                  <Star key={i} size={11} className="text-amber-400 fill-amber-400" />
                                ))}
                                {Array.from({ length: 5 - c.response_score }).map((_, i) => (
                                  <Star key={i} size={11} className="text-gray-200 fill-gray-200" />
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-400">Aguardando</span>
                            )}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <span className="text-xs text-gray-500 truncate block max-w-xs">{c.comment ?? "—"}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {c.response_score === null && (
                              <button
                                onClick={() => setRespondTarget({ survey: c, type: "csat" })}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 ml-auto"
                              >
                                <Star size={11} />Registrar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csat.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Star size={24} className="mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Nenhuma pesquisa CSAT enviada</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
