"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, Plus, Search, Target, TrendingUp,
  BarChart3, ExternalLink, RefreshCw, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CrmLead = {
  lead_id: string;
  lead_source: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  bu: string;
  lead_score: number;
  status: "new" | "contacted" | "qualified" | "unqualified" | "converted";
  qualification_notes: string | null;
  bant_budget: number | null;
  bant_authority: boolean;
  bant_need: string | null;
  bant_timeline: string | null;
  assigned_to: string;
  converted_to_opportunity_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_LEADS: CrmLead[] = [
  { lead_id: "l1", lead_source: "inbound", company_name: "Tech Solutions BR", contact_name: "Rafael Moura", email: "rafael@techsolutions.com.br", phone: "11 9999-0001", job_title: "CEO", bu: "JACQES", lead_score: 75, status: "qualified", qualification_notes: "Grande interesse em gestão de mídias", bant_budget: 25000, bant_authority: true, bant_need: "high", bant_timeline: "2026-05-30", assigned_to: "Miguel", converted_to_opportunity_id: null, converted_at: null, created_at: "2026-04-01T10:00:00Z", updated_at: "2026-04-10T10:00:00Z" },
  { lead_id: "l2", lead_source: "referral", company_name: "HealthFirst Clínicas", contact_name: "Dra. Sandra Lima", email: "sandra@healthfirst.com.br", phone: "21 9888-0002", job_title: "Sócia", bu: "ADVISOR", lead_score: 60, status: "contacted", qualification_notes: "Interesse em consultoria estratégica", bant_budget: 40000, bant_authority: true, bant_need: "medium", bant_timeline: "2026-06-15", assigned_to: "Danilo", converted_to_opportunity_id: null, converted_at: null, created_at: "2026-04-05T10:00:00Z", updated_at: "2026-04-12T10:00:00Z" },
  { lead_id: "l3", lead_source: "organic", company_name: "Esporte Clube Nacional", contact_name: "Lucas Ferreira", email: "lucas@ecnacional.com.br", phone: "11 9777-0003", job_title: "Diretor de Marketing", bu: "CAZA", lead_score: 40, status: "new", qualification_notes: null, bant_budget: 15000, bant_authority: false, bant_need: "low", bant_timeline: null, assigned_to: "Miguel", converted_to_opportunity_id: null, converted_at: null, created_at: "2026-04-15T10:00:00Z", updated_at: "2026-04-15T10:00:00Z" },
  { lead_id: "l4", lead_source: "manual", company_name: "Fintechx", contact_name: "Ana Rocha", email: "ana@fintechx.io", phone: "11 9666-0004", job_title: "CMO", bu: "JACQES", lead_score: 85, status: "qualified", qualification_notes: "Quer escalar social media para campanha de lançamento", bant_budget: 60000, bant_authority: true, bant_need: "high", bant_timeline: "2026-05-15", assigned_to: "Miguel", converted_to_opportunity_id: null, converted_at: null, created_at: "2026-04-18T10:00:00Z", updated_at: "2026-04-20T10:00:00Z" },
  { lead_id: "l5", lead_source: "paid", company_name: "Construtora Viva", contact_name: "Pedro Andrade", email: "pedro@construtoraviva.com.br", phone: "31 9555-0005", job_title: "Gerente", bu: "CAZA", lead_score: 30, status: "unqualified", qualification_notes: "Orçamento muito baixo para o escopo desejado", bant_budget: 5000, bant_authority: false, bant_need: "low", bant_timeline: null, assigned_to: "Danilo", converted_to_opportunity_id: null, converted_at: null, created_at: "2026-04-10T10:00:00Z", updated_at: "2026-04-14T10:00:00Z" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  new:         { label: "Novo",           cls: "badge badge-blue" },
  contacted:   { label: "Contato",        cls: "badge badge-yellow" },
  qualified:   { label: "Qualificado",    cls: "badge badge-green" },
  unqualified: { label: "Desqualificado", cls: "badge badge-red" },
  converted:   { label: "Convertido",     cls: "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60" },
};

const BU_LIST = ["Todos", "JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;
const STATUS_TABS = [
  { key: "all", label: "Todos" },
  { key: "new", label: "Novo" },
  { key: "contacted", label: "Contato" },
  { key: "qualified", label: "Qualificado" },
  { key: "unqualified", label: "Desqualificado" },
  { key: "converted", label: "Convertido" },
] as const;

const NEED_LABEL: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

function ScoreBar({ score }: { score: number }) {
  const color = score >= 71 ? "bg-emerald-500" : score >= 41 ? "bg-amber-400" : "bg-red-500";
  const textColor = score >= 71 ? "text-emerald-700" : score >= 41 ? "text-amber-700" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[11px] font-bold ${textColor}`}>{score}</span>
    </div>
  );
}

function BuBadge({ bu }: { bu: string }) {
  if (bu === "JACQES") return <span className="badge badge-blue text-[10px]">{bu}</span>;
  if (bu === "CAZA")   return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60">{bu}</span>;
  if (bu === "ADVISOR") return <span className="badge badge-green text-[10px]">{bu}</span>;
  return <span className="badge badge-yellow text-[10px]">{bu}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStatic, setIsStatic] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buFilter, setBuFilter] = useState<string>("Todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/crm/leads");
        const json = await res.json();
        if (json.success) {
          setLeads(json.data);
        } else throw new Error("api");
      } catch {
        setLeads(SEED_LEADS);
        setIsStatic(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (buFilter !== "Todos" && l.bu !== buFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.company_name.toLowerCase().includes(q) &&
          !l.contact_name.toLowerCase().includes(q) &&
          !(l.email ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [leads, statusFilter, buFilter, search]);

  // KPIs
  const kpiTotal     = leads.length;
  const kpiNew       = leads.filter(l => l.status === "new").length;
  const kpiQualified = leads.filter(l => l.status === "qualified").length;
  const kpiScoreAvg  = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.lead_score, 0) / leads.length) : 0;

  if (loading) {
    return (
      <>
        <Header title="Leads — CRM AWQ" subtitle="Pipeline de prospecção" />
        <div className="page-container">
          <div className="card p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Carregando leads…</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Leads — CRM AWQ" subtitle="Pipeline de prospecção" />
      <div className="page-container">

        {/* Header actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {isStatic && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Snapshot estático
            </span>
          )}
          {!isStatic && <div />}
          <Link
            href="/crm/leads/add"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            Adicionar Lead
          </Link>
        </div>

        {/* ── KPI Row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Users size={16} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiTotal}</div>
              <div className="text-[10px] text-gray-500">Total de leads</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Target size={16} className="text-violet-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiNew}</div>
              <div className="text-[10px] text-gray-500">Leads novos</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiQualified}</div>
              <div className="text-[10px] text-gray-500">Qualificados</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <BarChart3 size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiScoreAvg}</div>
              <div className="text-[10px] text-gray-500">Score médio</div>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────────────── */}
        <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1 flex-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* BU filter */}
          <select
            value={buFilter}
            onChange={e => setBuFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {BU_LIST.map(b => <option key={b}>{b}</option>)}
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-44 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <SectionHeader
              icon={<Users size={15} />}
              title="Leads"
              badge={
                <span className="badge badge-gray ml-1 text-[10px]">{filtered.length}</span>
              }
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={<Search size={16} className="text-gray-400" />}
              title="Nenhum lead encontrado"
              description="Tente ajustar os filtros ou adicione um novo lead."
              action={
                <Link href="/crm/leads/add" className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus size={13} />
                  Novo Lead
                </Link>
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Lead / Empresa</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">BU</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Budget (BANT)</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Need</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Responsável</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Criado em</th>
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((lead) => {
                    const statusCfg = STATUS_CONFIG[lead.status];
                    const needLabel = lead.bant_need ? (NEED_LABEL[lead.bant_need] ?? lead.bant_need) : "—";
                    const needColor = lead.bant_need === "high" ? "text-red-600" : lead.bant_need === "medium" ? "text-amber-600" : "text-gray-400";
                    return (
                      <tr key={lead.lead_id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 text-[12px]">{lead.contact_name}</div>
                          <div className="text-[11px] text-gray-500 truncate max-w-[160px]">{lead.company_name}</div>
                          {lead.job_title && (
                            <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{lead.job_title}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <BuBadge bu={lead.bu} />
                        </td>
                        <td className="py-3 px-3">
                          <span className={`${statusCfg?.cls ?? "badge badge-gray"} text-[10px]`}>
                            {statusCfg?.label ?? lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <ScoreBar score={lead.lead_score} />
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] font-medium text-gray-700">{fmtBRL(lead.bant_budget)}</span>
                          {lead.bant_authority && (
                            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Decisor</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[11px] font-semibold ${needColor}`}>{needLabel}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700">
                              {lead.assigned_to.charAt(0)}
                            </div>
                            <span className="text-[11px] text-gray-600">{lead.assigned_to}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-gray-400">
                          {fmtDate(lead.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                              <ExternalLink size={10} />
                              Ver
                            </button>
                            {lead.status !== "converted" && lead.status !== "unqualified" && (
                              <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">
                                <ChevronRight size={10} />
                                Converter
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
