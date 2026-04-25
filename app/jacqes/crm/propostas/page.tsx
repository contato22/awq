"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  FileText, Send, CheckCircle2, DollarSign, CalendarDays,
  Plus, X, Eye, Pencil, Trash2, Printer, ChevronDown, ArrowRightLeft, Search,
} from "lucide-react";
import type { CrmProposal, CrmOpportunity } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";
import { crmCreate, crmUpdate, crmDelete } from "@/lib/jacqes-crm-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$ " + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$ " + Math.round(n / 1_000) + "K";
  return "R$ " + n.toLocaleString("pt-BR");
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtDateFull(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function statusBadge(status: string): string {
  switch (status) {
    case "Rascunho":      return "bg-gray-100 text-gray-600 border border-gray-200";
    case "Enviada":       return "bg-blue-100 text-blue-700 border border-blue-200";
    case "Em Negociação": return "bg-amber-100 text-amber-700 border border-amber-200";
    case "Aceita":        return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "Recusada":      return "bg-red-100 text-red-700 border border-red-200";
    default:              return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

const STATUS_OPTIONS = ["Rascunho", "Enviada", "Em Negociação", "Aceita", "Recusada"];

// ─── Print ────────────────────────────────────────────────────────────────────

function printProposal(p: CrmProposal, opp: CrmOpportunity | undefined) {
  const empresa = opp?.empresa ?? "—";
  const nomeOpp = opp?.nome_oportunidade ?? p.opportunity_id;
  const owner   = opp?.owner ?? "—";
  const hoje    = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Proposta ${p.id} — JACQES</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; color: #111; background: #fff; padding: 48px; max-width: 760px; margin: 0 auto; }
    .logo { font-size: 22px; font-weight: 900; letter-spacing: -1px; color: #1a1a1a; margin-bottom: 4px; }
    .logo span { color: #6366f1; }
    .tagline { font-size: 11px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 40px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .title { font-size: 26px; font-weight: 700; color: #111; margin-bottom: 6px; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 32px; }
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 8px; }
    .section-value { font-size: 14px; color: #111; line-height: 1.6; margin-bottom: 24px; white-space: pre-wrap; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .valor { font-size: 32px; font-weight: 900; color: #111; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700;
             background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
    .sign-block { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .sign-line { border-top: 1px solid #374151; padding-top: 8px; font-size: 12px; color: #374151; }
    @media print { body { padding: 32px; } }
  </style>
</head>
<body>
  <div class="logo">JACQES<span>.</span></div>
  <div class="tagline">Agência de Marketing Digital</div>

  <div class="title">Proposta Comercial</div>
  <div class="subtitle">Versão ${p.versao} &nbsp;·&nbsp; Ref: ${p.id.replace("prop-", "#")} &nbsp;·&nbsp; ${hoje}</div>

  <hr />

  <div class="grid">
    <div>
      <div class="section-label">Para</div>
      <div class="section-value" style="font-weight:700">${empresa}</div>
    </div>
    <div>
      <div class="section-label">Referente a</div>
      <div class="section-value">${nomeOpp}</div>
    </div>
    <div>
      <div class="section-label">Responsável JACQES</div>
      <div class="section-value">${owner}</div>
    </div>
    <div>
      <div class="section-label">Status</div>
      <div class="section-value">${p.status}</div>
    </div>
  </div>

  <hr />

  <div class="section-label">Escopo dos Serviços</div>
  <div class="section-value">${p.escopo || "—"}</div>

  <hr />

  <div class="section-label">Investimento Mensal</div>
  <div class="valor">${fmtCurrency(p.valor_proposto)}</div>
  ${p.contraproposta ? `<div style="margin-top:8px;font-size:12px;color:#92400e">Contraproposta registrada: ${fmtCurrency(p.contraproposta)}</div>` : ""}

  <hr />

  <div class="grid">
    <div>
      <div class="section-label">Data de Envio</div>
      <div class="section-value">${fmtDateFull(p.data_envio)}</div>
    </div>
    <div>
      <div class="section-label">Validade</div>
      <div class="section-value">30 dias a partir do envio</div>
    </div>
  </div>

  ${p.observacoes ? `
  <hr />
  <div class="section-label">Observações</div>
  <div class="section-value">${p.observacoes}</div>` : ""}

  <div class="sign-block">
    <div>
      <div class="sign-line">Contratante — ${empresa}</div>
    </div>
    <div>
      <div class="sign-line">JACQES — ${owner}</div>
    </div>
  </div>

  <div class="footer">
    Esta proposta é válida por 30 dias. Em caso de aceite, responda a este documento ou entre em contato com seu responsável JACQES.
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Permita pop-ups para exportar a proposta."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  opportunity_id: string;
  versao: string;
  valor_proposto: string;
  escopo: string;
  status: string;
  data_envio: string;
  data_resposta: string;
  contraproposta: string;
  observacoes: string;
};

const EMPTY_FORM: FormState = {
  opportunity_id: "", versao: "1", valor_proposto: "", escopo: "",
  status: "Rascunho", data_envio: "", data_resposta: "", contraproposta: "", observacoes: "",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-gray-900 mt-0.5">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropostasPage() {
  const [proposals,     setProposals]     = useState<CrmProposal[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [detail,        setDetail]        = useState<CrmProposal | null>(null);
  const [modal,         setModal]         = useState(false);
  const [statusFilter,  setStatusFilter]  = useState<string>("Todas");
  const [search,        setSearch]        = useState("");
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [form,          setForm]          = useState<FormState>({ ...EMPTY_FORM });
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState("");

  useEffect(() => {
    Promise.all([
      fetchCRM<CrmProposal>("proposals"),
      fetchCRM<CrmOpportunity>("opportunities"),
    ]).then(([p, o]) => { setProposals(p); setOpportunities(o); setLoading(false); });
  }, []);

  const totalPropostas = proposals.length;
  const enviadas       = proposals.filter(p => p.status === "Enviada").length;
  const aceitas        = proposals.filter(p => p.status === "Aceita").length;
  const valorEnviado   = proposals
    .filter(p => ["Enviada", "Em Negociação", "Aceita"].includes(p.status))
    .reduce((s, p) => s + p.valor_proposto, 0);

  function getOpp(id: string): CrmOpportunity | undefined {
    return opportunities.find(o => o.id === id);
  }

  const STATUS_TABS = ["Todas", ...STATUS_OPTIONS] as const;
  const countsByStatus = STATUS_TABS.reduce((acc, s) => {
    acc[s] = s === "Todas" ? proposals.length : proposals.filter(p => p.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const statusFiltered = statusFilter === "Todas" ? proposals : proposals.filter(p => p.status === statusFilter);
  const displayed = search.trim()
    ? statusFiltered.filter(p => {
        const opp = getOpp(p.opportunity_id);
        return (
          p.escopo.toLowerCase().includes(search.toLowerCase()) ||
          (opp?.empresa ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (opp?.nome_oportunidade ?? "").toLowerCase().includes(search.toLowerCase())
        );
      })
    : statusFiltered;

  // ── Modal helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, opportunity_id: opportunities[0]?.id ?? "" });
    setFormError("");
    setModal(true);
  }

  function openEdit(p: CrmProposal) {
    setEditingId(p.id);
    setForm({
      opportunity_id: p.opportunity_id,
      versao:         String(p.versao),
      valor_proposto: String(p.valor_proposto),
      escopo:         p.escopo,
      status:         p.status,
      data_envio:     p.data_envio ?? "",
      data_resposta:  p.data_resposta ?? "",
      contraproposta: p.contraproposta != null ? String(p.contraproposta) : "",
      observacoes:    p.observacoes,
    });
    setFormError("");
    setModal(true);
  }

  function closeModal() { setModal(false); setFormError(""); }

  function field(k: keyof FormState, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.opportunity_id)    { setFormError("Selecione uma oportunidade."); return; }
    if (!form.valor_proposto)    { setFormError("Valor proposto é obrigatório."); return; }
    if (!form.escopo.trim())     { setFormError("Escopo é obrigatório."); return; }

    const payload: Omit<CrmProposal, "id"> = {
      opportunity_id: form.opportunity_id,
      versao:         parseInt(form.versao) || 1,
      valor_proposto: parseFloat(form.valor_proposto) || 0,
      escopo:         form.escopo.trim(),
      status:         form.status,
      data_envio:     form.data_envio || null,
      data_resposta:  form.data_resposta || null,
      contraproposta: form.contraproposta ? parseFloat(form.contraproposta) : null,
      observacoes:    form.observacoes.trim(),
    };

    setSaving(true);
    try {
      if (editingId) {
        crmUpdate<CrmProposal>("proposals", editingId, payload);
        setProposals(prev => prev.map(p => p.id === editingId ? { ...p, ...payload } : p));
      } else {
        const nova = crmCreate<CrmProposal>("proposals", payload, "prop");
        setProposals(prev => [nova, ...prev]);
      }
      closeModal();
    } catch {
      setFormError("Falha ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Remover esta proposta?")) return;
    crmDelete("proposals", id);
    setProposals(prev => prev.filter(p => p.id !== id));
    if (detail?.id === id) setDetail(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Header title="Propostas" subtitle="JACQES CRM · Gestão de propostas comerciais" />

      <div className="page-container">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Propostas"      value={String(totalPropostas)} sub="todas as versões"      icon={FileText}     color="bg-brand-50 border border-brand-200 text-brand-600"   />
          <KpiCard label="Enviadas"             value={String(enviadas)}       sub="aguardando resposta"  icon={Send}         color="bg-blue-50 border border-blue-200 text-blue-600"       />
          <KpiCard label="Aceitas"              value={String(aceitas)}        sub="este período"         icon={CheckCircle2} color="bg-emerald-50 border border-emerald-200 text-emerald-600" />
          <KpiCard label="Valor Total Enviado"  value={fmtCurrency(valorEnviado)} sub="em aberto + aceitas" icon={DollarSign}   color="bg-violet-50 border border-violet-200 text-violet-600" />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <SectionHeader
                icon={<FileText size={15} />}
                title="Propostas Comerciais"
                badge={<span className="badge badge-blue ml-1">{displayed.length}</span>}
                className="mb-0"
              />
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                <Plus size={13} /> Nova Proposta
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar proposta, empresa…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-800 placeholder:text-gray-400"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_TABS.map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      statusFilter === s
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}>
                    {s}
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                      statusFilter === s ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                      {countsByStatus[s] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2].map(i => <div key={i} className="h-12 rounded-lg bg-gray-50 animate-pulse" />)}
            </div>
          ) : proposals.length === 0 ? (
            <EmptyState
              icon={<FileText size={20} className="text-gray-400" />}
              title="Nenhuma proposta ainda"
              description="Clique em Nova Proposta para criar a primeira."
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Proposta", "Oportunidade", "Valor Proposto", "Status", "Envio", "Resposta", "Contraproposta", ""].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        {h === "Envio" ? <><CalendarDays size={12} className="inline mr-1" />{h}</> :
                         h === "Contraproposta" ? <><ArrowRightLeft size={12} className="inline mr-1" />{h}</> : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(p => {
                    const opp = getOpp(p.opportunity_id);
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group cursor-pointer"
                        onClick={() => setDetail(p)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-xs">v{p.versao} — {p.id.replace("prop-", "#")}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5 max-w-[160px] truncate">{p.escopo}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700 font-medium text-xs truncate max-w-[180px]">
                            {opp?.nome_oportunidade ?? p.opportunity_id}
                          </div>
                          {opp && <div className="text-[11px] text-gray-400 mt-0.5">{opp.empresa}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-gray-900 text-xs">{fmtCurrency(p.valor_proposto)}</span>
                          {opp && <div className="text-[11px] text-gray-400 mt-0.5">~{opp.probabilidade}% prob.</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${statusBadge(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(p.data_envio)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(p.data_resposta)}</td>
                        <td className="px-4 py-3 text-xs">
                          {p.contraproposta != null
                            ? <span className="font-semibold text-amber-700">{fmtCurrency(p.contraproposta)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setDetail(p)} title="Ver detalhes"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                              <Eye size={13} />
                            </button>
                            <button onClick={() => { openEdit(p); }} title="Editar"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => printProposal(p, getOpp(p.opportunity_id))} title="Imprimir / Exportar PDF"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                              <Printer size={13} />
                            </button>
                            <button onClick={() => handleDelete(p.id)} title="Remover"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
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

      {/* ── Detail Modal ────────────────────────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Proposta v{detail.versao} — {detail.id.replace("prop-", "#")}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {getOpp(detail.opportunity_id)?.empresa ?? detail.opportunity_id}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status + valor */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Valor Proposto</div>
                  <div className="text-2xl font-black text-gray-900">{fmtCurrency(detail.valor_proposto)}</div>
                  {detail.contraproposta != null && (
                    <div className="text-xs text-amber-700 font-medium mt-1">
                      Contraproposta: {fmtCurrency(detail.contraproposta)}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusBadge(detail.status)}`}>
                  {detail.status}
                </span>
              </div>

              {/* Oportunidade */}
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Oportunidade</div>
                <div className="text-sm font-medium text-gray-800">
                  {getOpp(detail.opportunity_id)?.nome_oportunidade ?? detail.opportunity_id}
                </div>
              </div>

              {/* Escopo */}
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Escopo</div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detail.escopo || "—"}</p>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Data de Envio</div>
                  <div className="text-sm text-gray-700">{fmtDate(detail.data_envio)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Data de Resposta</div>
                  <div className="text-sm text-gray-700">{fmtDate(detail.data_resposta)}</div>
                </div>
              </div>

              {/* Observações */}
              {detail.observacoes && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Observações</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{detail.observacoes}</p>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => printProposal(detail, getOpp(detail.opportunity_id))}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                >
                  <Printer size={13} /> Exportar / Imprimir PDF
                </button>
                <button
                  onClick={() => { setDetail(null); openEdit(detail); }}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(detail.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">{editingId ? "Editar Proposta" : "Nova Proposta"}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            <div className="space-y-4">
              {/* Oportunidade */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Oportunidade *</label>
                <div className="relative">
                  <select value={form.opportunity_id} onChange={e => field("opportunity_id", e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                    <option value="">Selecionar oportunidade…</option>
                    {opportunities.map(o => (
                      <option key={o.id} value={o.id}>{o.nome_oportunidade} — {o.empresa}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Versão + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Versão</label>
                  <input type="number" min="1" value={form.versao} onChange={e => field("versao", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                  <div className="relative">
                    <select value={form.status} onChange={e => field("status", e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Valor + Contraproposta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Valor Proposto (R$) *</label>
                  <input type="number" min="0" placeholder="Ex: 3000" value={form.valor_proposto}
                    onChange={e => field("valor_proposto", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Contraproposta (R$)</label>
                  <input type="number" min="0" placeholder="—" value={form.contraproposta}
                    onChange={e => field("contraproposta", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Escopo */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Escopo *</label>
                <textarea rows={4} placeholder="Descreva os serviços incluídos nesta proposta…" value={form.escopo}
                  onChange={e => field("escopo", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Data de Envio</label>
                  <input type="date" value={form.data_envio} onChange={e => field("data_envio", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Data de Resposta</label>
                  <input type="date" value={form.data_resposta} onChange={e => field("data_resposta", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Observações</label>
                <textarea rows={2} placeholder="Notas adicionais…" value={form.observacoes}
                  onChange={e => field("observacoes", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={closeModal} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60">
                  {saving ? "Salvando…" : editingId ? "Salvar Alterações" : "Criar Proposta"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
