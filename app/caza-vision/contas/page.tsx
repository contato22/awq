"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { lsGet, lsSet } from "@/lib/caza-crm-local";
import { fetchCazaCRM } from "@/lib/caza-crm-query";
import {
  Users, DollarSign, TrendingUp, Film, Briefcase,
  X, Pencil, ExternalLink, BarChart3, Building2, Target,
  CheckCircle2, Clock, AlertCircle, HeartPulse,
} from "lucide-react";
import type { CazaCrmOpportunity } from "@/lib/caza-crm-db";
import type { CazaClient, CazaProject } from "@/lib/caza-db";

// ─── Data loading ─────────────────────────────────────────────────────────────

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

async function loadClientes(): Promise<CazaClient[]> {
  const ls = lsGet<CazaClient>("clientes");
  if (ls && ls.length > 0) return ls;
  try {
    const r = await fetch(`${BASE_PATH}/data/caza-clients.json`);
    if (r.ok) { const d = await r.json(); return Array.isArray(d) ? d : []; }
  } catch {}
  return [];
}

async function loadProjetos(): Promise<CazaProject[]> {
  const ls = lsGet<CazaProject>("properties");
  if (ls && ls.length > 0) return ls;
  try {
    const r = await fetch(`${BASE_PATH}/data/caza-properties.json`);
    if (r.ok) { const d = await r.json(); return Array.isArray(d) ? d : []; }
  } catch {}
  return [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(s: string) {
  if (!s) return "—";
  try {
    return new Date(s + (s.length === 10 ? "T12:00:00" : ""))
      .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return s; }
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function healthCls(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

const STATUS_BADGE: Record<string, string> = {
  "Ativo":       "bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
  "Em Proposta": "bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
  "Inativo":     "bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
  "Perdido":     "bg-red-50 text-red-600 border border-red-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
};

const TYPE_CLS: Record<string, string> = {
  Marca:      "bg-brand-50 text-brand-700 border-brand-200",
  Agência:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Empresa:    "bg-amber-50 text-amber-700 border-amber-200",
  Startup:    "bg-violet-50 text-violet-700 border-violet-200",
  Freelancer: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Outro:      "bg-gray-50 text-gray-600 border-gray-200",
};

const PROJ_STATUS_CLS: Record<string, string> = {
  "Em Produção":          "bg-blue-50 text-blue-700 border-blue-200",
  "Em Edição":            "bg-violet-50 text-violet-700 border-violet-200",
  "Aguardando Aprovação": "bg-amber-50 text-amber-700 border-amber-200",
  "Entregue":             "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STAGE_CLS: Record<string, string> = {
  "Lead Captado":    "bg-gray-100 text-gray-600",
  "Qualificação":    "bg-blue-50 text-blue-700",
  "Briefing Inicial":"bg-violet-50 text-violet-700",
  "Proposta Enviada":"bg-amber-50 text-amber-700",
  "Negociação":      "bg-orange-50 text-orange-700",
  "Fechado Ganho":   "bg-emerald-50 text-emerald-700",
  "Fechado Perdido": "bg-red-50 text-red-600",
};

const MODELOS = ["", "Projeto Único", "Recorrente", "Retainer"];

// ─── Types (local form) ───────────────────────────────────────────────────────

type EditForm = {
  cnpj: string; contato_nome: string; contato_cargo: string;
  email: string; phone: string; segmento: string;
  modelo_contrato: string; owner: string;
  health_score: number; observacoes: string;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, color, value, label }: {
  icon: React.ElementType; color: string; value: React.ReactNode; label: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <Icon size={16} className={`shrink-0 ${color}`} />
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-900 leading-tight">{value}</div>
        <div className="text-[11px] text-gray-400 mt-0.5 truncate">{label}</div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[10px] text-gray-400 font-medium w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-800 font-medium flex-1 break-all">{value || "—"}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContasPage() {
  const [clientes, setClientes] = useState<CazaClient[]>([]);
  const [projetos, setProjetos] = useState<CazaProject[]>([]);
  const [opps,     setOpps]     = useState<CazaCrmOpportunity[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<CazaClient | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState<EditForm>({
    cnpj: "", contato_nome: "", contato_cargo: "", email: "", phone: "",
    segmento: "", modelo_contrato: "", owner: "", health_score: 80, observacoes: "",
  });

  useEffect(() => {
    Promise.all([
      loadClientes(),
      loadProjetos(),
      fetchCazaCRM<CazaCrmOpportunity>("oportunidades"),
    ]).then(([c, p, o]) => {
      setClientes(c); setProjetos(p); setOpps(o); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Per-client computed stats ──────────────────────────────────────────────
  function stats(c: CazaClient) {
    const projs     = projetos.filter(p => p.cliente === c.name);
    const clientOpps = opps.filter(o => o.empresa === c.name);
    const activeOpps = clientOpps.filter(o => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");
    const ltv        = projs.reduce((s, p) => s + p.valor, 0);
    const recebido   = projs.filter(p => p.recebido).reduce((s, p) => s + p.valor, 0);
    const lucro      = projs.reduce((s, p) => s + p.lucro, 0);
    const sorted     = [...projs].sort((a, b) =>
      (b.prazo || b.inicio).localeCompare(a.prazo || a.inicio));
    return { projs, clientOpps, activeOpps, ltv, recebido, pendente: ltv - recebido, lucro, lastProj: sorted[0] };
  }

  // ── Global KPIs ───────────────────────────────────────────────────────────
  const allStats     = clientes.map(c => ({ c, s: stats(c) }));
  const totalLtv     = allStats.reduce((s, { s: st }) => s + st.ltv, 0);
  const ativos       = clientes.filter(c => c.status === "Ativo").length;
  const avgLtv       = clientes.length > 0 ? totalLtv / clientes.length : 0;
  const comOppAtiva  = allStats.filter(({ s: st }) => st.activeOpps.length > 0).length;

  const sortedClientes = [...clientes].sort((a, b) => stats(b).ltv - stats(a).ltv);

  // ── Detail panel helpers ───────────────────────────────────────────────────
  function openDetail(c: CazaClient) {
    setSelected(c);
    setEditing(false);
  }

  function startEdit() {
    if (!selected) return;
    setForm({
      cnpj:            selected.cnpj           ?? "",
      contato_nome:    selected.contato_nome    ?? "",
      contato_cargo:   selected.contato_cargo   ?? "",
      email:           selected.email           ?? "",
      phone:           selected.phone           ?? "",
      segmento:        selected.segmento        ?? "",
      modelo_contrato: selected.modelo_contrato ?? "",
      owner:           selected.owner           ?? "",
      health_score:    selected.health_score    ?? 80,
      observacoes:     selected.observacoes     ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!selected) return;
    const payload = {
      name:         form.name,
      status:       form.status,
      segmento:     form.segmento,
      since:        form.since,
      health_score: form.health_score,
      observacoes:  form.observacoes,
    };
    try {
      const res = await fetch(`/api/caza/clients/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = res.ok ? (await res.json() as CazaClient) : null;
      const updated: CazaClient = data ?? {
        ...selected, ...payload,
        last_internal_update: new Date().toISOString(),
        sync_status: "modified",
      };
      const next = clientes.map(c => c.id === selected.id ? updated : c);
      lsSet("clientes", next);
      setClientes(next);
      setSelected(updated);
    } catch {
      alert("Falha ao salvar alterações. Tente novamente.");
    }
    setEditing(false);
  }

  const sel   = selected;
  const selSt = sel ? stats(sel) : null;

  return (
    <>
      <Header
        title="Contas — Caza Vision"
        subtitle="Base individual de clientes pós-contrato · dados interligados sem redundância"
      />

      <div className="page-container">

        {/* ── KPI strip ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={DollarSign}   color="text-emerald-600" value={fmtR(totalLtv)}     label="LTV Total da Carteira" />
          <KpiCard icon={Users}        color="text-brand-600"   value={ativos}              label="Clientes Ativos" />
          <KpiCard icon={BarChart3}    color="text-amber-600"   value={fmtR(avgLtv)}        label="LTV Médio por Cliente" />
          <KpiCard icon={Target}       color="text-violet-600"  value={comOppAtiva}         label="Com Opp Ativa no CRM" />
        </div>

        {/* ── Main area: list + detail panel ─────────────────────────────────── */}
        <div className="flex gap-4 items-start">

          {/* Account list */}
          <div className={sel ? "flex-1 min-w-0" : "w-full"}>
            <SectionHeader
              icon={<Building2 size={15} />}
              title="Carteira de Clientes"
              badge={<span className="badge badge-blue ml-1">{clientes.length}</span>}
            />

            {loading ? (
              <div className="card p-10 flex items-center justify-center gap-3 text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-sm">Carregando contas…</span>
              </div>
            ) : clientes.length === 0 ? (
              <EmptyState
                icon={<Users size={20} className="text-gray-400" />}
                title="Nenhum cliente cadastrado"
                description="Adicione clientes pela área de Clientes para vê-los aqui."
              />
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                      {!sel && <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Segmento</th>}
                      {!sel && <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Modelo</th>}
                      <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">LTV</th>
                      <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Proj.</th>
                      {!sel && <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Último</th>}
                      <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Health</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedClientes.map(c => {
                      const st = stats(c);
                      const health = c.health_score ?? 80;
                      const isSelected = sel?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => openDetail(c)}
                          className={`cursor-pointer transition-colors hover:bg-gray-50/80 ${isSelected ? "bg-emerald-50/40 ring-1 ring-inset ring-emerald-200" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {initials(c.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-900 truncate">{c.name}</div>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TYPE_CLS[c.type] ?? TYPE_CLS.Outro}`}>
                                  {c.type}
                                </span>
                              </div>
                            </div>
                          </td>
                          {!sel && <td className="px-4 py-3 text-xs text-gray-500">{c.segmento || "—"}</td>}
                          {!sel && <td className="px-4 py-3 text-xs text-gray-500">{c.modelo_contrato || "—"}</td>}
                          <td className="px-4 py-3 text-right text-xs font-bold text-gray-800">{fmtR(st.ltv)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Film size={10} className="text-gray-400" />
                              <span className="text-xs font-semibold text-gray-700">{st.projs.length}</span>
                            </div>
                          </td>
                          {!sel && (
                            <td className="px-4 py-3 text-xs text-gray-400">
                              {st.lastProj ? fmtDate(st.lastProj.prazo || st.lastProj.inicio) : "—"}
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${healthCls(health)}`}>
                              {health}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={STATUS_BADGE[c.status] ?? "badge"}>{c.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Detail panel ─────────────────────────────────────────────────── */}
          {sel && selSt && (
            <div className="w-[380px] shrink-0 space-y-3">

              {/* Header card */}
              <div className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {initials(sel.name)}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm leading-tight">{sel.name}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TYPE_CLS[sel.type] ?? TYPE_CLS.Outro}`}>
                          {sel.type}
                        </span>
                        <span className={STATUS_BADGE[sel.status] ?? "badge"}>{sel.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={startEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Editar">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Fechar">
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Quick metrics */}
                <div className="grid grid-cols-4 gap-1 pt-3 border-t border-gray-100">
                  {[
                    { value: fmtR(selSt.ltv),      label: "LTV",       color: "text-gray-900" },
                    { value: String(selSt.projs.length), label: "Projetos", color: "text-gray-900" },
                    { value: fmtR(selSt.recebido),  label: "Recebido",  color: "text-emerald-600" },
                    { value: fmtR(selSt.pendente),  label: "Pendente",  color: selSt.pendente > 0 ? "text-amber-600" : "text-gray-400" },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <div className={`text-xs font-bold ${m.color}`}>{m.value}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Health bar */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                      <HeartPulse size={10} /> Health Score
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${healthCls(sel.health_score ?? 80)}`}>
                      {sel.health_score ?? 80}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${(sel.health_score ?? 80) >= 80 ? "bg-emerald-400" : (sel.health_score ?? 80) >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${sel.health_score ?? 80}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Perfil — view or edit */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Briefcase size={13} />
                    <span className="text-xs font-semibold text-gray-700">Perfil da Conta</span>
                  </div>
                  {!editing && (
                    <button onClick={startEdit} className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold">
                      Editar
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-2.5">
                    {([
                      { k: "cnpj",          l: "CNPJ",            t: "text"   },
                      { k: "contato_nome",  l: "Contato",         t: "text"   },
                      { k: "contato_cargo", l: "Cargo",           t: "text"   },
                      { k: "email",         l: "E-mail",          t: "email"  },
                      { k: "phone",         l: "Telefone",        t: "text"   },
                      { k: "segmento",      l: "Segmento",        t: "text"   },
                      { k: "owner",         l: "Account Manager", t: "text"   },
                    ] as const).map(f => (
                      <div key={f.k}>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-0.5">{f.l}</label>
                        <input
                          type={f.t}
                          value={form[f.k]}
                          onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-0.5">Modelo Contrato</label>
                      <select
                        value={form.modelo_contrato}
                        onChange={e => setForm(p => ({ ...p, modelo_contrato: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        {MODELOS.map(m => <option key={m} value={m}>{m || "Selecionar…"}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-0.5">
                        Health Score — {form.health_score}
                      </label>
                      <input
                        type="range" min={0} max={100}
                        value={form.health_score}
                        onChange={e => setForm(p => ({ ...p, health_score: Number(e.target.value) }))}
                        className="w-full accent-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-0.5">Observações</label>
                      <textarea
                        rows={2}
                        value={form.observacoes}
                        onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button onClick={saveEdit} className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors">
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <ProfileRow label="CNPJ"           value={sel.cnpj ?? ""} />
                    <ProfileRow label="Contato"        value={sel.contato_nome ?? ""} />
                    <ProfileRow label="Cargo"          value={sel.contato_cargo ?? ""} />
                    <ProfileRow label="E-mail"         value={sel.email} />
                    <ProfileRow label="Telefone"       value={sel.phone} />
                    <ProfileRow label="Segmento"       value={sel.segmento} />
                    <ProfileRow label="Modelo"         value={sel.modelo_contrato ?? ""} />
                    <ProfileRow label="Acc. Manager"   value={sel.owner ?? ""} />
                    <ProfileRow label="Cliente desde"  value={fmtDate(sel.since)} />
                    {(sel.observacoes ?? "") && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-[10px] text-gray-400 font-medium mb-1">Observações</div>
                        <div className="text-xs text-gray-600 leading-relaxed">{sel.observacoes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Projetos — cross-linked from caza-properties, zero duplication */}
              <div className="card p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-3">
                  <Film size={13} />
                  <span className="text-xs font-semibold text-gray-700">Projetos</span>
                  <span className="badge badge-blue ml-auto">{selSt.projs.length}</span>
                  <Link href="/caza-vision/imoveis" className="text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 font-semibold ml-1">
                    Ver todos <ExternalLink size={10} />
                  </Link>
                </div>

                {selSt.projs.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Nenhum projeto vinculado</p>
                ) : (
                  <>
                    <div className="space-y-0">
                      {selSt.projs.map(p => (
                        <div key={p.id} className="flex items-start gap-2.5 py-2 border-b border-gray-100 last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800 truncate">{p.titulo}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${PROJ_STATUS_CLS[p.status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                {p.status}
                              </span>
                              <span className="text-[9px] text-gray-400">{p.tipo}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-gray-800">{fmtR(p.valor)}</div>
                            <div className={`text-[9px] mt-0.5 font-medium ${p.recebido ? "text-emerald-600" : "text-amber-600"}`}>
                              {p.recebido ? "✓ Recebido" : "Pendente"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Financial summary — computed, never stored separately */}
                    <div className="mt-3 grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-800">{fmtR(selSt.ltv)}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5">Total</div>
                      </div>
                      <div className="text-center border-x border-gray-200">
                        <div className="text-xs font-bold text-emerald-700">{fmtR(selSt.recebido)}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5">Recebido</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-xs font-bold ${selSt.pendente > 0 ? "text-amber-700" : "text-gray-400"}`}>
                          {fmtR(selSt.pendente)}
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5">Pendente</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* CRM — cross-linked from oportunidades, zero duplication */}
              <div className="card p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-3">
                  <TrendingUp size={13} />
                  <span className="text-xs font-semibold text-gray-700">CRM — Oportunidades</span>
                  <span className="badge badge-blue ml-auto">{selSt.clientOpps.length}</span>
                  <Link href="/caza-vision/crm/oportunidades" className="text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 font-semibold ml-1">
                    Abrir CRM <ExternalLink size={10} />
                  </Link>
                </div>

                {selSt.clientOpps.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Sem oportunidades vinculadas</p>
                ) : (
                  <div className="space-y-0">
                    {selSt.clientOpps.map(o => {
                      const isOpen = o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido";
                      return (
                        <div key={o.id} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800 truncate">{o.nome_oportunidade}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STAGE_CLS[o.stage] ?? "bg-gray-100 text-gray-600"}`}>
                                {o.stage}
                              </span>
                              {isOpen && (
                                <span className="text-[9px] text-gray-400">{o.probabilidade}%</span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs font-bold text-gray-700 shrink-0">{fmtR(o.valor_estimado)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
