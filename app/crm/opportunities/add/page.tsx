"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import {
  STAGE_LABELS, STAGE_PROBABILITY, BU_OPTIONS, OWNER_OPTIONS,
} from "@/lib/crm-types";
import type { CrmAccount, CrmContact, CrmLead } from "@/lib/crm-types";
import {
  Building2, User, Target, DollarSign, Calendar,
  Search, X, ChevronRight, Plus, CheckCircle2,
  AlertCircle, Loader2, ChevronLeft, Link2, Zap,
} from "lucide-react";

const ACTIVE_STAGES = ["discovery","qualification","proposal","negotiation","closed_won","closed_lost"] as const;
type Stage = typeof ACTIVE_STAGES[number];

const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
    }`}>
      {type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100">×</button>
    </div>
  );
}

// ── Shared SearchSelect ───────────────────────────────────────────────────────
type SearchItem = { label: string; sublabel?: string };

function SearchSelect<T>({
  placeholder, items, onSelect, query, onQueryChange, onCreateNew, createLabel,
}: {
  placeholder: string;
  items: (SearchItem & { value: T })[];
  onSelect: (v: T) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onCreateNew?: () => void;
  createLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const showDropdown = open && (items.length > 0 || (query.trim().length > 0 && onCreateNew));

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input type="text" className={`${inputCls} pl-9`} placeholder={placeholder}
          value={query} onFocus={() => setOpen(true)}
          onChange={e => { onQueryChange(e.target.value); setOpen(true); }} />
      </div>
      {showDropdown && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {items.length > 0 && (
            <div className="max-h-44 overflow-y-auto">
              {items.map((item, i) => (
                <button key={i} type="button"
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  onMouseDown={() => { onSelect(item.value); onQueryChange(""); setOpen(false); }}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.label}</div>
                    {item.sublabel && <div className="text-[11px] text-gray-400 truncate mt-0.5">{item.sublabel}</div>}
                  </div>
                  <ChevronRight size={12} className="text-gray-300 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
          {onCreateNew && (
            <button type="button" onMouseDown={() => { onCreateNew(); onQueryChange(""); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors ${items.length > 0 ? "border-t border-gray-100" : ""}`}>
              <Plus size={13} />{createLabel ?? "Criar novo"}
              {query.trim() && <span className="text-blue-400 font-normal">"{query.trim()}"</span>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Initials({ name, className }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return (
    <span className={`flex items-center justify-center rounded-lg text-[11px] font-bold uppercase select-none ${className ?? ""}`}>
      {letters.toUpperCase()}
    </span>
  );
}

// ── Quick-create mini-forms ───────────────────────────────────────────────────
function AccountCreateForm({ onCreated, onCancel, initialName }: {
  onCreated: (acc: CrmAccount) => void; onCancel: () => void; initialName?: string;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/crm/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", account_name: name.trim(), trade_name: name.trim(), account_type: "prospect" }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error);
      onCreated(res.data as CrmAccount);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); setSaving(false); }
  }

  return (
    <div className="space-y-2.5">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nova Empresa</div>
      {err && <div className="text-[11px] text-red-600">{err}</div>}
      <input autoFocus placeholder="Nome da empresa *" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), save())} className={inputCls} />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="button" onClick={save} disabled={saving || !name.trim()}
          className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Salvando…" : "Criar empresa"}
        </button>
      </div>
    </div>
  );
}

function ContactCreateForm({ accountId, onCreated, onCancel, initialName }: {
  accountId?: string; onCreated: (c: CrmContact) => void; onCancel: () => void; initialName?: string;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [jobTitle, setJobTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", full_name: name.trim(), job_title: jobTitle || null, account_id: accountId ?? null, seniority: "manager" }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error);
      onCreated(res.data as CrmContact);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); setSaving(false); }
  }

  return (
    <div className="space-y-2.5">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Novo Contato</div>
      {err && <div className="text-[11px] text-red-600">{err}</div>}
      <input autoFocus placeholder="Nome completo *" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), save())} className={inputCls} />
      <input placeholder="Cargo (opcional)" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className={inputCls} />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button type="button" onClick={save} disabled={saving || !name.trim()}
          className="flex-1 py-1.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">
          {saving ? "Salvando…" : "Criar contato"}
        </button>
      </div>
    </div>
  );
}

// ── EntityPanel ───────────────────────────────────────────────────────────────
function EntityPanel({ label, color, icon, children }: {
  label: string; color: "blue" | "violet" | "amber";
  icon: ReactNode; children: ReactNode;
}) {
  const colors = {
    blue:   "border-blue-200 bg-blue-50/40",
    violet: "border-violet-200 bg-violet-50/30",
    amber:  "border-amber-200 bg-amber-50/30",
  };
  const iconColors = {
    blue:   "bg-blue-100 text-blue-600",
    violet: "bg-violet-100 text-violet-600",
    amber:  "bg-amber-100 text-amber-700",
  };
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconColors[color]}`}>{icon}</div>
        <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function AddOpportunityPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultStage = (params?.get("stage") ?? "discovery") as Stage;
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Entity data ──────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [leads,    setLeads]    = useState<CrmLead[]>([]);

  // ── Account link ─────────────────────────────────────────────────────────
  const [accountQuery, setAccountQuery]   = useState("");
  const [selectedAccount, setSelectedAccount] = useState<CrmAccount | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);

  // ── Contact link ─────────────────────────────────────────────────────────
  const [contactQuery, setContactQuery]   = useState("");
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [creatingContact, setCreatingContact] = useState(false);

  // ── Lead import ──────────────────────────────────────────────────────────
  const [leadQuery, setLeadQuery] = useState("");
  const [importedLead, setImportedLead] = useState<CrmLead | null>(null);

  // ── Form fields ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [form, setForm] = useState({
    opportunity_name: "", bu: "JACQES", owner: "Miguel",
    stage: defaultStage, deal_value: "", expected_close_date: "",
    lost_reason: "", proposal_sent_date: "",
  });

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); setError(""); }

  useEffect(() => {
    Promise.all([
      fetch("/api/crm/accounts").then(r => r.json()),
      fetch("/api/crm/contacts").then(r => r.json()),
      fetch("/api/crm/leads").then(r => r.json()),
    ]).then(([a, c, l]) => {
      setAccounts((a.data ?? []) as CrmAccount[]);
      setContacts((c.data ?? []) as CrmContact[]);
      setLeads(((l.data ?? []) as CrmLead[]).filter(x => x.status !== "converted"));
    }).catch(() => undefined);
  }, []);

  // Pre-fill from URL param
  useEffect(() => {
    const accId = params?.get("account_id");
    if (accId && accounts.length > 0) {
      const acc = accounts.find(a => a.account_id === accId);
      if (acc) handleSelectAccount(acc);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  function handleSelectAccount(acc: CrmAccount) {
    setSelectedAccount(acc);
    if (!form.opportunity_name) set("opportunity_name", acc.trade_name ?? acc.account_name);
  }

  function handleSelectContact(con: CrmContact) {
    setSelectedContact(con);
    if (!selectedAccount && con.account_id) {
      const acc = accounts.find(a => a.account_id === con.account_id);
      if (acc) handleSelectAccount(acc);
    }
  }

  function handleImportLead(lead: CrmLead) {
    setImportedLead(lead);
    set("opportunity_name", lead.company_name ? `${lead.company_name} — Lead` : "");
    if (lead.bant_budget) set("deal_value", String(lead.bant_budget));
    if (lead.bant_timeline) set("expected_close_date", lead.bant_timeline);
    if (lead.bu) set("bu", lead.bu);
    if (lead.assigned_to) set("owner", lead.assigned_to);
    // Try to link account by company name
    if (lead.company_name) {
      const acc = accounts.find(a =>
        (a.trade_name ?? a.account_name).toLowerCase() === lead.company_name.toLowerCase()
      );
      if (acc) handleSelectAccount(acc);
    }
  }

  // Filtered lists
  const filteredAccounts = (() => {
    const q = accountQuery.toLowerCase().trim();
    const list = q
      ? accounts.filter(a =>
          (a.account_name ?? "").toLowerCase().includes(q) ||
          (a.trade_name   ?? "").toLowerCase().includes(q) ||
          (a.document_number ?? "").toLowerCase().includes(q))
      : accounts;
    return list.slice(0, 8).map(a => ({
      label: a.trade_name ?? a.account_name,
      sublabel: a.industry ?? a.account_type ?? undefined,
      value: a,
    }));
  })();

  const filteredContacts = (() => {
    const q = contactQuery.toLowerCase().trim();
    let list = contacts;
    if (selectedAccount) {
      const fromAcc = contacts.filter(c => c.account_id === selectedAccount.account_id);
      list = fromAcc.length > 0 ? fromAcc : contacts;
    }
    if (q) list = list.filter(c =>
      (c.full_name ?? "").toLowerCase().includes(q) ||
      (c.email     ?? "").toLowerCase().includes(q) ||
      (c.job_title ?? "").toLowerCase().includes(q));
    return list.slice(0, 8).map(c => ({
      label: c.full_name,
      sublabel: [c.job_title, c.email].filter(Boolean).join(" · ") || undefined,
      value: c,
    }));
  })();

  const filteredLeads = (() => {
    const q = leadQuery.toLowerCase().trim();
    const list = q
      ? leads.filter(l =>
          (l.company_name  ?? "").toLowerCase().includes(q) ||
          (l.contact_name  ?? "").toLowerCase().includes(q) ||
          (l.email         ?? "").toLowerCase().includes(q))
      : leads;
    return list.slice(0, 8).map(l => ({
      label: l.company_name || l.contact_name,
      sublabel: [l.contact_name !== l.company_name ? l.contact_name : undefined, l.bu, l.status].filter(Boolean).join(" · ") || undefined,
      value: l,
    }));
  })();

  const probability = STAGE_PROBABILITY[form.stage as Stage] ?? 25;
  const isLinked = !!(selectedAccount || selectedContact || importedLead);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.opportunity_name.trim()) { setError("Nome da oportunidade é obrigatório"); return; }
    if (!form.bu) { setError("BU é obrigatória"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/crm/opportunities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          opportunity_name:  form.opportunity_name.trim(),
          bu:                form.bu,
          owner:             form.owner,
          stage:             form.stage,
          probability,
          deal_value:        parseFloat(form.deal_value) || 0,
          expected_close_date: form.expected_close_date || null,
          account_id:        selectedAccount?.account_id ?? null,
          contact_id:        selectedContact?.contact_id ?? null,
          lost_reason:       form.lost_reason || null,
          proposal_sent_date: form.proposal_sent_date || null,
          created_by:        form.owner,
        }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error ?? "Erro ao criar oportunidade");
      setToast({ msg: "Oportunidade criada!", type: "success" });
      setTimeout(() => router.push("/crm/opportunities"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar oportunidade");
      setSaving(false);
    }
  }

  return (
    <>
      <Header title="Nova Oportunidade" subtitle="Registrar oportunidade no pipeline" />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-container max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          <button type="button" onClick={() => router.push("/crm/opportunities")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft size={14} />Voltar para Oportunidades
          </button>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <AlertCircle size={14} className="shrink-0" />{error}
            </div>
          )}

          {/* ── Vincular Conta / Contato / Lead ─────────────────────────── */}
          <div className="card overflow-hidden">
            <div className={`px-5 py-3.5 flex items-center gap-2.5 border-b ${isLinked ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"}`}>
              <Link2 size={14} className={isLinked ? "text-blue-500" : "text-gray-400"} />
              <span className="text-sm font-semibold text-gray-900">Vincular Entidades</span>
              <span className="text-[11px] text-gray-400 ml-1">— conta, contato ou importar de um lead</span>
              {isLinked && (
                <span className="ml-auto text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  {[selectedAccount && "empresa", selectedContact && "contato", importedLead && "lead"].filter(Boolean).join(" + ")} vinculado{
                    [selectedAccount, selectedContact, importedLead].filter(Boolean).length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Empresa */}
              <EntityPanel label="Empresa" color="blue" icon={<Building2 size={13} />}>
                {selectedAccount ? (
                  <div className="flex items-center gap-2.5 p-2.5 bg-white border border-blue-200 rounded-lg shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Building2 size={14} className="text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{selectedAccount.trade_name ?? selectedAccount.account_name}</div>
                      {selectedAccount.address_city && (
                        <div className="text-[11px] text-gray-400 truncate">{selectedAccount.address_city}</div>
                      )}
                    </div>
                    <button type="button" onClick={() => setSelectedAccount(null)}
                      className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ) : creatingAccount ? (
                  <AccountCreateForm
                    initialName={accountQuery.trim() || undefined}
                    onCreated={acc => { setAccounts(p => [acc, ...p]); handleSelectAccount(acc); setCreatingAccount(false); setToast({ msg: "Empresa criada!", type: "success" }); }}
                    onCancel={() => setCreatingAccount(false)}
                  />
                ) : (
                  <div className="space-y-2">
                    <SearchSelect placeholder="Buscar empresa…" items={filteredAccounts}
                      onSelect={handleSelectAccount} query={accountQuery} onQueryChange={setAccountQuery}
                      onCreateNew={() => setCreatingAccount(true)} createLabel="Criar empresa" />
                    <button type="button" onClick={() => setCreatingAccount(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 transition-colors">
                      <Plus size={11} />Nova empresa
                    </button>
                  </div>
                )}
              </EntityPanel>

              {/* Contato */}
              <EntityPanel label="Contato" color="violet" icon={<User size={13} />}>
                {selectedContact ? (
                  <div className="flex items-center gap-2.5 p-2.5 bg-white border border-violet-200 rounded-lg shadow-sm">
                    <Initials name={selectedContact.full_name} className="w-8 h-8 bg-violet-100 text-violet-700 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{selectedContact.full_name}</div>
                      {selectedContact.job_title && <div className="text-[11px] text-gray-400 truncate">{selectedContact.job_title}</div>}
                    </div>
                    <button type="button" onClick={() => setSelectedContact(null)}
                      className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ) : creatingContact ? (
                  <ContactCreateForm
                    accountId={selectedAccount?.account_id}
                    initialName={contactQuery.trim() || undefined}
                    onCreated={con => { setContacts(p => [con, ...p]); handleSelectContact(con); setCreatingContact(false); setToast({ msg: "Contato criado!", type: "success" }); }}
                    onCancel={() => setCreatingContact(false)}
                  />
                ) : (
                  <div className="space-y-2">
                    <SearchSelect
                      placeholder={selectedAccount ? "Contato da empresa…" : "Buscar contato…"}
                      items={filteredContacts} onSelect={handleSelectContact}
                      query={contactQuery} onQueryChange={setContactQuery}
                      onCreateNew={() => setCreatingContact(true)} createLabel="Criar contato" />
                    <button type="button" onClick={() => setCreatingContact(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-violet-600 hover:bg-violet-50 rounded-lg border border-dashed border-violet-200 transition-colors">
                      <Plus size={11} />Novo contato
                    </button>
                  </div>
                )}
              </EntityPanel>

              {/* Lead */}
              <EntityPanel label="Importar Lead" color="amber" icon={<Zap size={13} />}>
                {importedLead ? (
                  <div className="flex items-start gap-2.5 p-2.5 bg-white border border-amber-200 rounded-lg shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Zap size={14} className="text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{importedLead.company_name || importedLead.contact_name}</div>
                      <div className="text-[11px] text-gray-400 truncate">Score: {importedLead.lead_score} · {importedLead.bu}</div>
                    </div>
                    <button type="button" onClick={() => setImportedLead(null)}
                      className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors mt-0.5">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <SearchSelect
                    placeholder="Buscar lead…"
                    items={filteredLeads} onSelect={handleImportLead}
                    query={leadQuery} onQueryChange={setLeadQuery} />
                )}
                <p className="text-[10px] text-gray-400 -mt-1">Pré-preenche nome, valor e prazo</p>
              </EntityPanel>

            </div>
          </div>

          {/* ── Informações Básicas ───────────────────────────────────────── */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Informações Básicas</h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Nome da Oportunidade *</label>
              <input value={form.opportunity_name} onChange={e => set("opportunity_name", e.target.value)}
                placeholder="Ex: XP — Campanha Performance Q3" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Business Unit *</label>
                <select value={form.bu} onChange={e => set("bu", e.target.value)} className={selectCls}>
                  {BU_OPTIONS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner</label>
                <select value={form.owner} onChange={e => set("owner", e.target.value)} className={selectCls}>
                  {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Estágio & Valores ─────────────────────────────────────────── */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Estágio &amp; Valores</h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Estágio</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)} className={selectCls}>
                {ACTIVE_STAGES.map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]} — {STAGE_PROBABILITY[s]}%</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Probabilidade automática: <strong className="text-gray-700">{probability}%</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Valor do Deal (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">R$</span>
                  <input type="number" min="0" step="100" value={form.deal_value}
                    onChange={e => set("deal_value", e.target.value)} placeholder="0"
                    className={`${inputCls} pl-9`} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  <Calendar size={11} className="inline mr-1 text-gray-400" />
                  Previsão de Fechamento
                </label>
                <input type="date" value={form.expected_close_date}
                  onChange={e => set("expected_close_date", e.target.value)} className={inputCls} />
              </div>
            </div>

            {(form.stage === "proposal" || form.stage === "negotiation" || form.stage === "closed_won") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Data de Envio da Proposta</label>
                <input type="date" value={form.proposal_sent_date}
                  onChange={e => set("proposal_sent_date", e.target.value)} className={inputCls} />
              </div>
            )}

            {form.stage === "closed_lost" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Motivo da Perda</label>
                <select value={form.lost_reason} onChange={e => set("lost_reason", e.target.value)} className={selectCls}>
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

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/crm/opportunities")}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving
                ? <><Loader2 size={14} className="animate-spin" />Salvando…</>
                : <><CheckCircle2 size={14} />Criar Oportunidade</>}
            </button>
          </div>

        </form>
      </div>
    </>
  );
}

export default function AddOpportunityPage() {
  return <Suspense><AddOpportunityPageInner /></Suspense>;
}
