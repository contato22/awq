"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { STAGE_LABELS, STAGE_PROBABILITY, BU_OPTIONS, OWNER_OPTIONS } from "@/lib/crm-types";
import type { CrmAccount, CrmLead } from "@/lib/crm-types";
import { SEED_ACCOUNTS } from "@/lib/crm-db";

const ACTIVE_STAGES = ["discovery","qualification","proposal","negotiation","closed_won","closed_lost"] as const;

function AddOpportunityPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultStage = (params?.get("stage") ?? "discovery") as typeof ACTIVE_STAGES[number];

  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    opportunity_name: "",
    bu: "JACQES",
    owner: "Miguel",
    stage: defaultStage,
    deal_value: "",
    expected_close_date: "",
    account_id: "",
    lost_reason: "",
    proposal_sent_date: "",
  });

  // Lead search state
  const [leadQuery, setLeadQuery] = useState("");
  const [leadResults, setLeadResults] = useState<CrmLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [leadSearching, setLeadSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick-create lead modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({ company_name: "", contact_name: "", bu: "JACQES", email: "", phone: "" });
  const [creatingLead, setCreatingLead] = useState(false);
  const [createLeadError, setCreateLeadError] = useState("");

  useEffect(() => {
    fetch("/api/crm/accounts")
      .then(r => r.json())
      .then(res => setAccounts(res.success ? res.data : SEED_ACCOUNTS))
      .catch(() => setAccounts(SEED_ACCOUNTS));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced lead search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!leadQuery.trim()) {
      setLeadResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLeadSearching(true);
      try {
        const res = await fetch(`/api/crm/leads?search=${encodeURIComponent(leadQuery.trim())}`);
        const data = await res.json();
        setLeadResults(data.success ? data.data : []);
        setShowDropdown(true);
      } catch {
        setLeadResults([]);
      } finally {
        setLeadSearching(false);
      }
    }, 250);
  }, [leadQuery]);

  function selectLead(lead: CrmLead) {
    setSelectedLead(lead);
    setLeadQuery("");
    setShowDropdown(false);
    setLeadResults([]);
    setForm({
      ...form,
      opportunity_name: form.opportunity_name || `${lead.company_name} — ${lead.bu}`,
      bu: lead.bu,
      owner: (lead.assigned_to as typeof OWNER_OPTIONS[number]) ?? form.owner,
    });
  }

  function clearLead() {
    setSelectedLead(null);
    setLeadQuery("");
  }

  function set(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  const probability = STAGE_PROBABILITY[form.stage as keyof typeof STAGE_PROBABILITY] ?? 25;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.opportunity_name.trim()) { setError("Nome da oportunidade é obrigatório"); return; }
    if (!form.bu) { setError("BU é obrigatória"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          opportunity_name: form.opportunity_name.trim(),
          bu: form.bu,
          owner: form.owner,
          stage: form.stage,
          deal_value: parseFloat(form.deal_value) || 0,
          expected_close_date: form.expected_close_date || null,
          account_id: form.account_id || null,
          lost_reason: form.lost_reason || null,
          proposal_sent_date: form.proposal_sent_date || null,
          lead_id: selectedLead?.lead_id ?? null,
        }),
      });
      const data = await res.json();
      if (data.success) router.push("/crm/opportunities");
      else setError(data.error ?? "Erro ao criar oportunidade");
    } catch {
      setError("Erro de rede — tente novamente");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateLead(e: FormEvent) {
    e.preventDefault();
    if (!newLeadForm.company_name.trim()) { setCreateLeadError("Nome da empresa é obrigatório"); return; }
    if (!newLeadForm.contact_name.trim()) { setCreateLeadError("Nome do contato é obrigatório"); return; }
    setCreatingLead(true);
    setCreateLeadError("");
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          company_name: newLeadForm.company_name.trim(),
          contact_name: newLeadForm.contact_name.trim(),
          bu: newLeadForm.bu,
          email: newLeadForm.email.trim() || null,
          phone: newLeadForm.phone.trim() || null,
          lead_source: "manual",
          assigned_to: form.owner,
        }),
      });
      const data = await res.json();
      if (data.success) {
        selectLead(data.data);
        setShowCreateModal(false);
        setNewLeadForm({ company_name: "", contact_name: "", bu: "JACQES", email: "", phone: "" });
      } else {
        setCreateLeadError(data.error ?? "Erro ao criar lead");
      }
    } catch {
      setCreateLeadError("Erro de rede — tente novamente");
    } finally {
      setCreatingLead(false);
    }
  }

  return (
    <>
      <Header title="Nova Oportunidade" subtitle="Registrar oportunidade no pipeline" />
      <div className="page-container max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Lead */}
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Lead de Origem</h2>

            {selectedLead ? (
              <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-brand-900">{selectedLead.company_name}</p>
                  <p className="text-xs text-brand-700">{selectedLead.contact_name} · {selectedLead.bu}</p>
                </div>
                <button type="button" onClick={clearLead}
                  className="text-brand-500 hover:text-brand-700 text-lg leading-none px-1"
                  aria-label="Remover lead">×</button>
              </div>
            ) : (
              <div ref={searchRef} className="relative">
                <input
                  value={leadQuery}
                  onChange={e => setLeadQuery(e.target.value)}
                  onFocus={() => leadResults.length > 0 && setShowDropdown(true)}
                  placeholder="Buscar lead por empresa ou contato…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                />
                {leadSearching && (
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400">buscando…</span>
                )}

                {showDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {leadResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">Nenhum lead encontrado</div>
                    ) : (
                      leadResults.map(lead => (
                        <button key={lead.lead_id} type="button"
                          onMouseDown={() => selectLead(lead)}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                          <p className="text-sm font-medium text-gray-900">{lead.company_name}</p>
                          <p className="text-xs text-gray-500">{lead.contact_name} · {lead.bu} · <span className="capitalize">{lead.status}</span></p>
                        </button>
                      ))
                    )}
                    <button type="button"
                      onMouseDown={() => {
                        setShowDropdown(false);
                        setNewLeadForm(prev => ({ ...prev, company_name: leadQuery }));
                        setShowCreateModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-brand-600 font-medium hover:bg-brand-50 border-t border-gray-100">
                      + Criar novo lead{leadQuery ? ` "${leadQuery}"` : ""}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!selectedLead && !leadQuery && (
              <button type="button"
                onClick={() => { setShowCreateModal(true); }}
                className="text-xs text-brand-600 hover:underline">
                + Criar novo lead
              </button>
            )}
          </div>

          {/* Informações Básicas */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Informações Básicas</h2>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Oportunidade *</label>
              <input value={form.opportunity_name} onChange={e => set("opportunity_name", e.target.value)}
                placeholder="Ex: XP — Campanha Performance Q3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Business Unit *</label>
                <select value={form.bu} onChange={e => set("bu", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {BU_OPTIONS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Owner</label>
                <select value={form.owner} onChange={e => set("owner", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Conta (opcional)</label>
              <select value={form.account_id} onChange={e => set("account_id", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                <option value="">— Selecionar conta —</option>
                {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
              </select>
            </div>
          </div>

          {/* Estágio & Valores */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Estágio & Valores</h2>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estágio</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                {ACTIVE_STAGES.map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]} — {STAGE_PROBABILITY[s]}%</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">Probabilidade automática: <strong>{probability}%</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor do Deal (R$)</label>
                <input type="number" min="0" step="100" value={form.deal_value} onChange={e => set("deal_value", e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Previsão de Fechamento</label>
                <input type="date" value={form.expected_close_date} onChange={e => set("expected_close_date", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
            </div>

            {(form.stage === "proposal" || form.stage === "negotiation" || form.stage === "closed_won") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data de Envio da Proposta</label>
                <input type="date" value={form.proposal_sent_date} onChange={e => set("proposal_sent_date", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
            )}

            {form.stage === "closed_lost" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Motivo da Perda</label>
                <select value={form.lost_reason} onChange={e => set("lost_reason", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  <option value="">— Selecionar —</option>
                  <option>Preço elevado</option>
                  <option>Perdido para concorrente</option>
                  <option>Momento inadequado</option>
                  <option>Corte de budget</option>
                  <option>Sem decisão</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? "Salvando…" : "Criar Oportunidade"}
            </button>
          </div>
        </form>
      </div>

      {/* Quick-create lead modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Novo Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-4">
              {createLeadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {createLeadError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Empresa *</label>
                <input value={newLeadForm.company_name}
                  onChange={e => setNewLeadForm(p => ({ ...p, company_name: e.target.value }))}
                  placeholder="Nome da empresa"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contato *</label>
                <input value={newLeadForm.contact_name}
                  onChange={e => setNewLeadForm(p => ({ ...p, contact_name: e.target.value }))}
                  placeholder="Nome do contato"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Business Unit *</label>
                <select value={newLeadForm.bu}
                  onChange={e => setNewLeadForm(p => ({ ...p, bu: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {BU_OPTIONS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                  <input type="email" value={newLeadForm.email}
                    onChange={e => setNewLeadForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="opcional"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                  <input value={newLeadForm.phone}
                    onChange={e => setNewLeadForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="opcional"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button"
                  onClick={() => { setShowCreateModal(false); setCreateLeadError(""); }}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creatingLead}
                  className="flex-1 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {creatingLead ? "Criando…" : "Criar Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function AddOpportunityPage() {
  return <Suspense><AddOpportunityPageInner /></Suspense>;
}
