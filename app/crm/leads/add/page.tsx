"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  User, Building2, Mail, Phone, Briefcase,
  CheckCircle2, AlertCircle, ChevronLeft,
  DollarSign, Calendar, FileText, Zap,
  Search, X, Plus, ChevronRight, Link2, Loader2,
} from "lucide-react";
import type { CrmAccount, CrmContact } from "@/lib/crm-types";
import type { CnpjData } from "@/app/api/crm/cnpj/route";

type FormData = {
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  bu: string;
  lead_source: string;
  assigned_to: string;
  status: string;
  bant_budget: string;
  bant_authority: boolean;
  bant_need: string;
  bant_timeline: string;
  qualification_notes: string;
};

function calcScore(data: FormData): number {
  let score = 0;
  const budget = parseFloat(data.bant_budget) || 0;
  if (budget >= 50000)      score += 30;
  else if (budget >= 20000) score += 20;
  else if (budget >= 10000) score += 10;
  if (data.bant_authority) score += 20;
  if (data.bant_need === "high")   score += 25;
  else if (data.bant_need === "medium") score += 15;
  else if (data.bant_need === "low")    score += 5;
  if (data.bant_timeline) {
    const days = Math.ceil((new Date(data.bant_timeline).getTime() - Date.now()) / 86400000);
    if (days <= 30)      score += 15;
    else if (days <= 60) score += 10;
    else if (days <= 90) score += 5;
  }
  return Math.min(score, 100);
}

function scoreColor(s: number) {
  if (s >= 71) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (s >= 41) return { bar: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" };
  return               { bar: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200" };
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
    }`}>
      {type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">×</button>
    </div>
  );
}

function FormSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children, fullWidth, hint }: {
  label: string; required?: boolean; children: ReactNode; fullWidth?: boolean; hint?: string;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

// ── Inline search combobox ────────────────────────────────────────────────────
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
        <input
          type="text"
          className={`${inputCls} pl-9 pr-3`}
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => { onQueryChange(e.target.value); setOpen(true); }}
        />
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
              <Plus size={13} />
              {createLabel ?? "Criar novo"}
              {query.trim() && <span className="text-blue-400 font-normal">"{query.trim()}"</span>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Initials avatar ───────────────────────────────────────────────────────────
function Initials({ name, className }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  return (
    <span className={`flex items-center justify-center rounded-lg text-xs font-bold uppercase select-none ${className ?? ""}`}>
      {letters.toUpperCase()}
    </span>
  );
}

// ── Industry label map ────────────────────────────────────────────────────────
const INDUSTRIES: Record<string, string> = {
  technology: "Tecnologia", real_estate: "Imobiliário", retail: "Varejo",
  financial_services: "Financeiro", healthcare: "Saúde", other: "Outro",
};

export default function AddLeadPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Account state ───────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [accountQuery, setAccountQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<CrmAccount | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newAcct, setNewAcct] = useState({ trade_name: "", document_number: "", industry: "" });
  const [savingAcct, setSavingAcct] = useState(false);
  const [cnpjLookup, setCnpjLookup] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);

  // ── Contact state ───────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [creatingContact, setCreatingContact] = useState(false);
  const [newCon, setNewCon] = useState({ full_name: "", job_title: "", email: "", phone: "" });
  const [savingCon, setSavingCon] = useState(false);

  const [form, setForm] = useState<FormData>({
    contact_name: "", company_name: "", email: "", phone: "",
    job_title: "", bu: "", lead_source: "manual", assigned_to: "",
    status: "new", bant_budget: "", bant_authority: false,
    bant_need: "medium", bant_timeline: "", qualification_notes: "",
  });

  useEffect(() => {
    fetch("/api/crm/accounts").then(r => r.json()).then(j => setAccounts((j.data ?? []) as CrmAccount[]));
    fetch("/api/crm/contacts").then(r => r.json()).then(j => setContacts((j.data ?? []) as CrmContact[]));
  }, []);

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  }, []);

  function handleSelectAccount(acc: CrmAccount) {
    setSelectedAccount(acc);
    set("company_name", acc.trade_name ?? acc.account_name);
  }

  function handleClearAccount() {
    setSelectedAccount(null);
    set("company_name", "");
  }

  function handleSelectContact(con: CrmContact) {
    setSelectedContact(con);
    set("contact_name", con.full_name);
    if (con.email)     set("email",     con.email);
    if (con.phone)     set("phone",     con.phone);
    if (con.job_title) set("job_title", con.job_title);
    if (!selectedAccount && con.account_id) {
      const acc = accounts.find(a => a.account_id === con.account_id);
      if (acc) handleSelectAccount(acc);
    }
  }

  function handleClearContact() {
    setSelectedContact(null);
    set("contact_name", ""); set("email", ""); set("phone", ""); set("job_title", "");
  }

  async function handleCnpjLookup() {
    const d = cnpjLookup.replace(/\D/g, "");
    if (d.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`/api/crm/cnpj?cnpj=${d}`).then(r => r.json());
      if (!res.success) throw new Error(res.error);
      const data = res.data.cnpj_data as CnpjData;
      // Use razao_social (account_name) — full legal name in UPPERCASE
      setNewAcct(p => ({
        ...p,
        trade_name:      data.account_name,
        document_number: data.document_number,
        industry:        data.industry ?? "",
      }));
      set("company_name", data.account_name);
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "CNPJ não encontrado", type: "error" });
    } finally { setCnpjLoading(false); }
  }

  async function handleCreateAccount() {
    if (!newAcct.trade_name.trim()) return;
    setSavingAcct(true);
    try {
      const res = await fetch("/api/crm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          account_name: newAcct.trade_name.trim(),
          trade_name: newAcct.trade_name.trim(),
          document_number: newAcct.document_number || null,
          industry: newAcct.industry || null,
          account_type: "prospect",
          bu: form.bu || "JACQES",
        }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error ?? "Erro ao criar empresa");
      const created = res.data as CrmAccount;
      setAccounts(prev => [created, ...prev]);
      handleSelectAccount(created);
      setCreatingAccount(false);
      setNewAcct({ trade_name: "", document_number: "", industry: "" });
      setToast({ message: "Empresa criada e vinculada!", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erro ao criar empresa", type: "error" });
    } finally { setSavingAcct(false); }
  }

  async function handleCreateContact() {
    if (!newCon.full_name.trim()) return;
    setSavingCon(true);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          full_name: newCon.full_name.trim(),
          account_id: selectedAccount?.account_id ?? null,
          job_title: newCon.job_title || null,
          email: newCon.email || null,
          phone: newCon.phone || null,
          seniority: "manager",
        }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error ?? "Erro ao criar contato");
      const created = res.data as CrmContact;
      setContacts(prev => [created, ...prev]);
      handleSelectContact(created);
      setCreatingContact(false);
      setNewCon({ full_name: "", job_title: "", email: "", phone: "" });
      setToast({ message: "Contato criado e vinculado!", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erro ao criar contato", type: "error" });
    } finally { setSavingCon(false); }
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
      sublabel: [a.document_number, a.industry ? INDUSTRIES[a.industry] ?? a.industry : undefined].filter(Boolean).join(" · ") || undefined,
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
      (c.full_name  ?? "").toLowerCase().includes(q) ||
      (c.email      ?? "").toLowerCase().includes(q) ||
      (c.job_title  ?? "").toLowerCase().includes(q));
    return list.slice(0, 8).map(c => ({
      label: c.full_name,
      sublabel: [c.job_title, c.email].filter(Boolean).join(" · ") || undefined,
      value: c,
    }));
  })();

  const estimatedScore = calcScore(form);
  const scoreClr = scoreColor(estimatedScore);
  const isLinked = !!(selectedAccount || selectedContact);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.contact_name.trim()) errs.contact_name = "Nome obrigatório";
    if (!form.company_name.trim()) errs.company_name = "Empresa obrigatória";
    if (!form.bu) errs.bu = "BU obrigatória";
    if (!form.assigned_to) errs.assigned_to = "Responsável obrigatório";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          contact_name: form.contact_name.trim(),
          company_name: form.company_name.trim(),
          email: form.email || null,
          phone: form.phone || null,
          job_title: form.job_title || null,
          bu: form.bu,
          lead_source: form.lead_source,
          assigned_to: form.assigned_to,
          status: form.status,
          lead_score: estimatedScore,
          bant_budget: form.bant_budget ? parseFloat(form.bant_budget) : null,
          bant_authority: form.bant_authority,
          bant_need: form.bant_need || null,
          bant_timeline: form.bant_timeline || null,
          qualification_notes: form.qualification_notes || null,
          created_by: form.assigned_to,
        }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error ?? "Erro ao criar lead");
      setToast({ message: "Lead criado com sucesso!", type: "success" });
      setTimeout(() => router.push("/crm/leads"), 1500);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erro ao criar lead", type: "error" });
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header title="Novo Lead" subtitle="Cadastrar novo prospect" />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-container">
        <form onSubmit={handleSubmit} noValidate>

          <button type="button" onClick={() => router.push("/crm/leads")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2">
            <ChevronLeft size={14} />Voltar para Leads
          </button>

          {/* Score banner */}
          <div className={`card p-4 border ${scoreClr.border} ${scoreClr.bg}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap size={15} className={scoreClr.text} />
                <span className={`text-sm font-semibold ${scoreClr.text}`}>Score estimado: {estimatedScore}/100</span>
              </div>
              <div className="flex-1 max-w-xs h-2 bg-white/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${scoreClr.bar} transition-all duration-500`} style={{ width: `${estimatedScore}%` }} />
              </div>
              <span className="text-[11px] text-gray-500">
                {estimatedScore >= 71 ? "Lead quente" : estimatedScore >= 41 ? "Lead morno" : "Lead frio"}
              </span>
            </div>
          </div>

          {/* ── Vincular Conta & Contato ──────────────────────────────── */}
          <div className="card overflow-hidden">
            {/* Header */}
            <div className={`px-5 py-3.5 flex items-center gap-2.5 border-b ${isLinked ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"}`}>
              <Link2 size={14} className={isLinked ? "text-blue-500" : "text-gray-400"} />
              <div>
                <span className="text-sm font-semibold text-gray-900">Vincular Conta &amp; Contato</span>
                <span className="text-[11px] text-gray-400 ml-2">opcional — preenche os campos automaticamente</span>
              </div>
              {isLinked && (
                <span className="ml-auto text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  {[selectedAccount && "empresa", selectedContact && "contato"].filter(Boolean).join(" + ")} vinculado{(selectedAccount && selectedContact) ? "s" : ""}
                </span>
              )}
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── Empresa panel ─────────────────────────────────────── */}
              <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${selectedAccount ? "border-blue-200 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Building2 size={13} className="text-blue-600" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Empresa</span>
                </div>

                {selectedAccount ? (
                  /* Selected state */
                  <div className="flex items-center gap-3 p-2.5 bg-white border border-blue-200 rounded-lg shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Building2 size={16} className="text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {selectedAccount.trade_name ?? selectedAccount.account_name}
                      </div>
                      {(selectedAccount.document_number || selectedAccount.industry) && (
                        <div className="text-[11px] text-gray-400 truncate mt-0.5">
                          {[selectedAccount.document_number, selectedAccount.industry ? (INDUSTRIES[selectedAccount.industry] ?? selectedAccount.industry) : undefined].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={handleClearAccount}
                      className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remover">
                      <X size={13} />
                    </button>
                  </div>
                ) : creatingAccount ? (
                  /* Quick-create form */
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Nova Empresa</div>
                    {/* CNPJ quick-lookup */}
                    <div className="flex gap-1.5">
                      <input
                        placeholder="CNPJ para busca automática"
                        value={cnpjLookup}
                        onChange={e => setCnpjLookup(e.target.value.replace(/\D/g, "").slice(0,14))}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleCnpjLookup())}
                        className={`${inputCls} font-mono text-[12px] flex-1`}
                        maxLength={14}
                      />
                      <button type="button" onClick={handleCnpjLookup}
                        disabled={cnpjLoading || cnpjLookup.replace(/\D/g,"").length !== 14}
                        className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-40 transition-colors shrink-0">
                        {cnpjLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                      </button>
                    </div>
                    <input autoFocus placeholder="Nome da empresa *" value={newAcct.trade_name}
                      onChange={e => setNewAcct(p => ({ ...p, trade_name: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleCreateAccount())}
                      className={inputCls} />
                    <input placeholder="CNPJ (opcional)" value={newAcct.document_number}
                      onChange={e => setNewAcct(p => ({ ...p, document_number: e.target.value }))}
                      className={inputCls} />
                    <select value={newAcct.industry}
                      onChange={e => setNewAcct(p => ({ ...p, industry: e.target.value }))}
                      className={selectCls}>
                      <option value="">Segmento (opcional)</option>
                      {Object.entries(INDUSTRIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <div className="flex gap-2 pt-0.5">
                      <button type="button" onClick={() => { setCreatingAccount(false); setNewAcct({ trade_name: "", document_number: "", industry: "" }); }}
                        className="flex-1 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="button" onClick={handleCreateAccount}
                        disabled={savingAcct || !newAcct.trade_name.trim()}
                        className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {savingAcct ? "Salvando…" : "Criar empresa"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Search state */
                  <div className="space-y-2">
                    <SearchSelect
                      placeholder="Buscar empresa…"
                      items={filteredAccounts}
                      onSelect={handleSelectAccount}
                      query={accountQuery}
                      onQueryChange={setAccountQuery}
                      onCreateNew={() => {
                        setCreatingAccount(true);
                        if (accountQuery.trim()) setNewAcct(p => ({ ...p, trade_name: accountQuery.trim() }));
                      }}
                      createLabel="Criar nova empresa"
                    />
                    <button type="button"
                      onClick={() => setCreatingAccount(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50/60 rounded-lg border border-dashed border-blue-200 transition-colors">
                      <Plus size={11} />Criar nova empresa
                    </button>
                  </div>
                )}
              </div>

              {/* ── Contato panel ─────────────────────────────────────── */}
              <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${selectedContact ? "border-brand-200 bg-brand-50/30" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                    <User size={13} className="text-brand-600" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Contato</span>
                  {selectedAccount && !selectedContact && (
                    <span className="ml-auto text-[10px] text-blue-500 font-medium">mostrando contatos da empresa</span>
                  )}
                </div>

                {selectedContact ? (
                  /* Selected state */
                  <div className="flex items-center gap-3 p-2.5 bg-white border border-brand-200 rounded-lg shadow-sm">
                    <Initials name={selectedContact.full_name}
                      className="w-9 h-9 bg-brand-100 text-brand-700 shrink-0 text-[11px]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{selectedContact.full_name}</div>
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">
                        {[selectedContact.job_title, selectedContact.email].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <button type="button" onClick={handleClearContact}
                      className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remover">
                      <X size={13} />
                    </button>
                  </div>
                ) : creatingContact ? (
                  /* Quick-create form */
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Novo Contato</div>
                    <input autoFocus placeholder="Nome completo *" value={newCon.full_name}
                      onChange={e => setNewCon(p => ({ ...p, full_name: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleCreateContact())}
                      className={inputCls} />
                    <input placeholder="Cargo (opcional)" value={newCon.job_title}
                      onChange={e => setNewCon(p => ({ ...p, job_title: e.target.value }))}
                      className={inputCls} />
                    <input type="email" placeholder="E-mail (opcional)" value={newCon.email}
                      onChange={e => setNewCon(p => ({ ...p, email: e.target.value }))}
                      className={inputCls} />
                    {selectedAccount && (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <Building2 size={11} className="text-blue-400 shrink-0" />
                        <span className="text-[11px] text-blue-700 truncate">
                          Será vinculado a <strong>{selectedAccount.trade_name ?? selectedAccount.account_name}</strong>
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-0.5">
                      <button type="button" onClick={() => { setCreatingContact(false); setNewCon({ full_name: "", job_title: "", email: "", phone: "" }); }}
                        className="flex-1 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="button" onClick={handleCreateContact}
                        disabled={savingCon || !newCon.full_name.trim()}
                        className="flex-1 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                        {savingCon ? "Salvando…" : "Criar contato"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Search state */
                  <div className="space-y-2">
                    <SearchSelect
                      placeholder={selectedAccount ? "Buscar contato da empresa…" : "Buscar contato…"}
                      items={filteredContacts}
                      onSelect={handleSelectContact}
                      query={contactQuery}
                      onQueryChange={setContactQuery}
                      onCreateNew={() => {
                        setCreatingContact(true);
                        if (contactQuery.trim()) setNewCon(p => ({ ...p, full_name: contactQuery.trim() }));
                      }}
                      createLabel="Criar novo contato"
                    />
                    <button type="button"
                      onClick={() => setCreatingContact(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-brand-600 hover:text-brand-800 hover:bg-brand-50/60 rounded-lg border border-dashed border-brand-200 transition-colors">
                      <Plus size={11} />Criar novo contato
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Dados do Lead ───────────────────────────────────────────── */}
          <FormSection icon={<User size={15} />} title="Dados do Lead">
            <Field label="Nome completo" required>
              <input type="text"
                className={`${inputCls} ${errors.contact_name ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                placeholder="Rafael Moura" value={form.contact_name}
                onChange={e => set("contact_name", e.target.value)} />
              {errors.contact_name && <p className="text-[11px] text-red-600 mt-1">{errors.contact_name}</p>}
            </Field>
            <Field label="Empresa" required>
              <input type="text"
                className={`${inputCls} ${errors.company_name ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                placeholder="Tech Solutions BR" value={form.company_name}
                onChange={e => set("company_name", e.target.value)} />
              {errors.company_name && <p className="text-[11px] text-red-600 mt-1">{errors.company_name}</p>}
            </Field>
            <Field label="E-mail">
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="email" className={`${inputCls} pl-9`} placeholder="rafael@empresa.com.br"
                  value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
            </Field>
            <Field label="Telefone">
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="tel" className={`${inputCls} pl-9`} placeholder="11 99999-0000"
                  value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
            </Field>
            <Field label="Cargo" fullWidth>
              <div className="relative">
                <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" className={`${inputCls} pl-9`} placeholder="CEO, CMO, Diretor de Marketing…"
                  value={form.job_title} onChange={e => set("job_title", e.target.value)} />
              </div>
            </Field>
          </FormSection>

          {/* ── Qualificação ──────────────────────────────────────────────── */}
          <FormSection icon={<Building2 size={15} />} title="Qualificação">
            <Field label="BU (Unidade de Negócio)" required>
              <select className={`${selectCls} ${errors.bu ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                value={form.bu} onChange={e => set("bu", e.target.value)}>
                <option value="">Selecionar BU…</option>
                <option value="JACQES">JACQES</option>
                <option value="CAZA">CAZA</option>
                <option value="ADVISOR">ADVISOR</option>
                <option value="VENTURE">VENTURE</option>
              </select>
              {errors.bu && <p className="text-[11px] text-red-600 mt-1">{errors.bu}</p>}
            </Field>
            <Field label="Fonte do Lead">
              <select className={selectCls} value={form.lead_source} onChange={e => set("lead_source", e.target.value)}>
                <option value="manual">Manual</option>
                <option value="inbound">Inbound</option>
                <option value="referral">Referral / Indicação</option>
                <option value="organic">Orgânico</option>
                <option value="paid">Pago</option>
                <option value="outbound">Outbound</option>
                <option value="event">Evento</option>
              </select>
            </Field>
            <Field label="Responsável" required>
              <select className={`${selectCls} ${errors.assigned_to ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)}>
                <option value="">Selecionar responsável…</option>
                <option value="Miguel">Miguel</option>
                <option value="Danilo">Danilo</option>
              </select>
              {errors.assigned_to && <p className="text-[11px] text-red-600 mt-1">{errors.assigned_to}</p>}
            </Field>
            <Field label="Status inicial">
              <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="new">Novo</option>
                <option value="contacted">Contato feito</option>
                <option value="qualified">Qualificado</option>
              </select>
            </Field>
          </FormSection>

          {/* ── BANT ──────────────────────────────────────────────────────── */}
          <FormSection icon={<DollarSign size={15} />} title="BANT">
            <Field label="Budget (Orçamento estimado)" hint="30pts ≥R$50K · 20pts ≥R$20K · 10pts ≥R$10K">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">R$</span>
                <input type="number" min="0" step="1000" className={`${inputCls} pl-9`}
                  placeholder="25000" value={form.bant_budget}
                  onChange={e => set("bant_budget", e.target.value)} />
              </div>
            </Field>
            <Field label="Need (Necessidade)" hint="25pts Alta · 15pts Média · 5pts Baixa">
              <select className={selectCls} value={form.bant_need} onChange={e => set("bant_need", e.target.value)}>
                <option value="">Selecionar…</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </Field>
            <Field label="Timeline (Prazo de decisão)" hint="15pts ≤30d · 10pts ≤60d · 5pts ≤90d">
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="date" className={`${inputCls} pl-9`}
                  value={form.bant_timeline} onChange={e => set("bant_timeline", e.target.value)} />
              </div>
            </Field>
            <Field label="Authority (É o decisor?)" hint="20pts se sim">
              <label className="flex items-center gap-3 mt-1 cursor-pointer">
                <div onClick={() => set("bant_authority", !form.bant_authority)}
                  className={`w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer ${form.bant_authority ? "bg-blue-500" : "bg-gray-200"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.bant_authority ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className={`text-sm font-medium ${form.bant_authority ? "text-blue-700" : "text-gray-600"}`}>
                  {form.bant_authority ? "Sim, é o decisor" : "Não é o decisor principal"}
                </span>
              </label>
            </Field>
          </FormSection>

          {/* ── Notas ──────────────────────────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-400"><FileText size={15} /></span>
              <h2 className="text-sm font-semibold text-gray-900">Notas de Qualificação</h2>
            </div>
            <textarea rows={4} className={`${inputCls} resize-none`}
              placeholder="Descreva o contexto do lead, dores identificadas, próximos passos…"
              value={form.qualification_notes}
              onChange={e => set("qualification_notes", e.target.value)} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push("/crm/leads")}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Criar Lead
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </>
  );
}
