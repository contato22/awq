"use client";

import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  Building2, User, UserPlus, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Mail, Phone, Briefcase,
  DollarSign, Calendar, FileText, Zap, Search, Plus, X,
} from "lucide-react";
import type { CrmAccount } from "@/lib/crm-types";

// ── Shared styles ───────────────────────────────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

// ── Step indicator ────────────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Empresa",  icon: Building2 },
  { id: 2, label: "Contato",  icon: User      },
  { id: 3, label: "Lead",     icon: UserPlus  },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((step, i) => {
        const done    = current > step.id;
        const active  = current === step.id;
        const Icon    = step.icon;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                done   ? "bg-emerald-500 border-emerald-500" :
                active ? "bg-blue-600 border-blue-600"       :
                         "bg-white border-gray-300"
              }`}>
                {done
                  ? <CheckCircle2 size={17} className="text-white" />
                  : <Icon size={15} className={active ? "text-white" : "text-gray-400"} />}
              </div>
              <span className={`text-[11px] font-semibold whitespace-nowrap ${
                active ? "text-blue-700" : done ? "text-emerald-600" : "text-gray-400"
              }`}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-10px] rounded-full transition-colors ${
                current > step.id ? "bg-emerald-400" : "bg-gray-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
    }`}>
      {type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
    </div>
  );
}

// ── BANT score ──────────────────────────────────────────────────────────────────────────────────
function calcScore(budget: string, authority: boolean, need: string, timeline: string): number {
  let score = 0;
  const b = parseFloat(budget) || 0;
  if (b >= 50000)      score += 30;
  else if (b >= 20000) score += 20;
  else if (b >= 10000) score += 10;
  if (authority) score += 20;
  if (need === "high")   score += 25;
  else if (need === "medium") score += 15;
  else if (need === "low")    score += 5;
  if (timeline) {
    const days = Math.ceil((new Date(timeline).getTime() - Date.now()) / 86400000);
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

// ───────────────────────────────────────────────────────────────────────────────────

export default function NovoCadastroPage() {
  const router = useRouter();
  const [step, setStep]   = useState(1);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1: Account ──────────────────────────────────────────────────────────────────────
  const [accountMode, setAccountMode]       = useState<"search" | "new">("search");
  const [accountQuery, setAccountQuery]     = useState("");
  const [accounts, setAccounts]             = useState<CrmAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<CrmAccount[]>([]);
  const [selectedAccount, setSelectedAccount]   = useState<CrmAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    account_name: "", trade_name: "", document_number: "",
    industry: "", company_size: "", account_type: "prospect", owner: "Miguel",
  });

  // ── Step 2: Contact ──────────────────────────────────────────────────────────────────────
  const [contactForm, setContactForm] = useState({
    full_name: "", email: "", phone: "",
    job_title: "", seniority: "manager", is_primary_contact: true,
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [skipContact, setSkipContact] = useState(false);

  // ── Step 3: Lead ───────────────────────────────────────────────────────────────────────────
  const [leadForm, setLeadForm] = useState({
    bu: "", lead_source: "manual", assigned_to: "", status: "new",
    bant_budget: "", bant_authority: false, bant_need: "medium", bant_timeline: "",
    qualification_notes: "",
  });
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});

  // Load accounts once
  useEffect(() => {
    fetch("/api/crm/accounts")
      .then(r => r.json())
      .then(json => { const list = (json.data ?? []) as CrmAccount[]; setAccounts(list); });
  }, []);

  // Filter accounts by query
  useEffect(() => {
    if (!accountQuery.trim()) { setFilteredAccounts(accounts.slice(0, 8)); return; }
    const q = accountQuery.toLowerCase();
    setFilteredAccounts(
      accounts.filter(a =>
        (a.account_name ?? "").toLowerCase().includes(q) ||
        (a.trade_name   ?? "").toLowerCase().includes(q) ||
        (a.document_number ?? "").toLowerCase().includes(q)
      ).slice(0, 8)
    );
  }, [accountQuery, accounts]);

  const setAcc = useCallback((f: string, v: string) => setAccountForm(p => ({ ...p, [f]: v })), []);
  const setCon = useCallback((f: string, v: string | boolean) => {
    setContactForm(p => ({ ...p, [f]: v }));
    setContactErrors(p => ({ ...p, [f]: "" }));
  }, []);
  const setLead = useCallback((f: string, v: string | boolean) => {
    setLeadForm(p => ({ ...p, [f]: v }));
    setLeadErrors(p => ({ ...p, [f]: "" }));
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    if (accountMode === "search" && !selectedAccount) return true; // skip is OK
    if (accountMode === "new" && !accountForm.account_name.trim()) {
      setToast({ message: "Razão Social da empresa é obrigatória", type: "error" });
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (skipContact) return true;
    const errs: Record<string, string> = {};
    if (!contactForm.full_name.trim()) errs.full_name = "Nome é obrigatório";
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep3(): boolean {
    const errs: Record<string, string> = {};
    if (!leadForm.bu) errs.bu = "BU obrigatória";
    if (!leadForm.assigned_to) errs.assigned_to = "Responsável obrigatório";
    setLeadErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
  }

  // ── Final submit ────────────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep3()) return;
    setSubmitting(true);

    try {
      // 1. Account
      let accountId: string | null = null;
      if (accountMode === "search" && selectedAccount) {
        accountId = selectedAccount.account_id;
      } else if (accountMode === "new" && accountForm.account_name.trim()) {
        const res = await fetch("/api/crm/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            account_name: accountForm.account_name.trim(),
            trade_name: accountForm.trade_name || null,
            document_number: accountForm.document_number || null,
            industry: accountForm.industry || null,
            company_size: accountForm.company_size || null,
            account_type: accountForm.account_type,
            bu: leadForm.bu || "JACQES",
            owner: accountForm.owner,
            health_score: 70,
            churn_risk: "low",
            created_by: accountForm.owner,
          }),
        }).then(r => r.json());
        if (!res.success) throw new Error(res.error ?? "Erro ao criar empresa");
        accountId = res.data?.account_id ?? null;
      }

      // 2. Contact
      let contactId: string | null = null;
      if (!skipContact && contactForm.full_name.trim()) {
        const res = await fetch("/api/crm/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            account_id: accountId,
            full_name: contactForm.full_name.trim(),
            email: contactForm.email || null,
            phone: contactForm.phone || null,
            job_title: contactForm.job_title || null,
            seniority: contactForm.seniority,
            is_primary_contact: contactForm.is_primary_contact,
          }),
        }).then(r => r.json());
        if (!res.success) throw new Error(res.error ?? "Erro ao criar contato");
        contactId = res.data?.contact_id ?? null;
      }

      // 3. Lead
      const score = calcScore(leadForm.bant_budget, leadForm.bant_authority, leadForm.bant_need, leadForm.bant_timeline);
      const companyName = accountMode === "search"
        ? (selectedAccount?.trade_name ?? selectedAccount?.account_name ?? "")
        : accountForm.trade_name || accountForm.account_name;
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          contact_name: !skipContact && contactForm.full_name.trim()
            ? contactForm.full_name.trim()
            : (companyName || "Lead"),
          company_name: companyName,
          email: !skipContact ? (contactForm.email || null) : null,
          phone: !skipContact ? (contactForm.phone || null) : null,
          job_title: !skipContact ? (contactForm.job_title || null) : null,
          account_id: accountId,
          contact_id: contactId,
          bu: leadForm.bu,
          lead_source: leadForm.lead_source,
          assigned_to: leadForm.assigned_to,
          status: leadForm.status,
          lead_score: score,
          bant_budget: leadForm.bant_budget ? parseFloat(leadForm.bant_budget) : null,
          bant_authority: leadForm.bant_authority,
          bant_need: leadForm.bant_need || null,
          bant_timeline: leadForm.bant_timeline || null,
          qualification_notes: leadForm.qualification_notes || null,
          created_by: leadForm.assigned_to,
        }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error ?? "Erro ao criar lead");

      setToast({ message: "Cadastro criado com sucesso!", type: "success" });
      setTimeout(() => router.push("/crm/leads"), 1500);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erro ao salvar", type: "error" });
      setSubmitting(false);
    }
  }

  const estimatedScore = calcScore(leadForm.bant_budget, leadForm.bant_authority, leadForm.bant_need, leadForm.bant_timeline);
  const scoreClr = scoreColor(estimatedScore);

  return (
    <>
      <Header title="Novo Cadastro" subtitle="Lead · Conta · Contato em um só lugar" />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-container max-w-2xl">
        <button type="button" onClick={() => router.push("/crm")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
          <ChevronLeft size={14} />
          Voltar ao CRM
        </button>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* ── Step 1: Empresa ─────────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-900">Empresa</h2>
                    <span className="text-[11px] text-gray-400 font-normal">(opcional)</span>
                  </div>
                  <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
                    <button type="button"
                      onClick={() => { setAccountMode("search"); setSelectedAccount(null); }}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${accountMode === "search" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      <Search size={11} className="inline mr-1" />Buscar existente
                    </button>
                    <button type="button"
                      onClick={() => { setAccountMode("new"); setSelectedAccount(null); }}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${accountMode === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      <Plus size={11} className="inline mr-1" />Criar nova
                    </button>
                  </div>
                </div>

                {accountMode === "search" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        className={`${inputCls} pl-9`}
                        placeholder="Buscar por nome, nome fantasia ou CNPJ…"
                        value={accountQuery}
                        onChange={e => setAccountQuery(e.target.value)}
                      />
                    </div>
                    {selectedAccount ? (
                      <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <div>
                          <div className="text-sm font-semibold text-blue-900">{selectedAccount.trade_name ?? selectedAccount.account_name}</div>
                          {selectedAccount.trade_name && <div className="text-[11px] text-blue-600">{selectedAccount.account_name}</div>}
                        </div>
                        <button type="button" onClick={() => setSelectedAccount(null)}
                          className="text-blue-400 hover:text-blue-600"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                        {filteredAccounts.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-gray-400">
                            {accountQuery ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada ainda"}
                          </div>
                        ) : filteredAccounts.map(a => (
                          <button key={a.account_id} type="button"
                            onClick={() => { setSelectedAccount(a); setAccountQuery(""); }}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{a.trade_name ?? a.account_name}</div>
                              <div className="text-[11px] text-gray-400">{a.industry ?? "—"} · {a.document_number ?? "sem CNPJ"}</div>
                            </div>
                            <ChevronRight size={13} className="text-gray-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400">Deixe em branco para criar lead sem empresa vinculada.</p>
                  </div>
                )}

                {accountMode === "new" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Razão Social *</label>
                      <input type="text" className={inputCls} placeholder="Ex: Tech Solutions Ltda"
                        value={accountForm.account_name} onChange={e => setAcc("account_name", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Nome Fantasia</label>
                        <input type="text" className={inputCls} placeholder="Ex: TechSol"
                          value={accountForm.trade_name} onChange={e => setAcc("trade_name", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">CNPJ</label>
                        <input type="text" className={inputCls} placeholder="00.000.000/0001-00"
                          value={accountForm.document_number} onChange={e => setAcc("document_number", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Setor</label>
                        <select className={selectCls} value={accountForm.industry} onChange={e => setAcc("industry", e.target.value)}>
                          <option value="">— Selecionar —</option>
                          {[["tech","Tecnologia"],["finance","Finanças"],["education","Educação"],["health","Saúde"],["media","Mídia"],["retail","Varejo"],["other","Outro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Porte</label>
                        <select className={selectCls} value={accountForm.company_size} onChange={e => setAcc("company_size", e.target.value)}>
                          <option value="">— Selecionar —</option>
                          {["1-10","11-50","51-200","201-500","500+"].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Tipo</label>
                        <select className={selectCls} value={accountForm.account_type} onChange={e => setAcc("account_type", e.target.value)}>
                          {[["prospect","Prospect"],["customer","Cliente"],["partner","Parceiro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner</label>
                        <select className={selectCls} value={accountForm.owner} onChange={e => setAcc("owner", e.target.value)}>
                          <option value="Miguel">Miguel</option>
                          <option value="Danilo">Danilo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => router.push("/crm")}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={handleNext}
                  className="btn-primary flex items-center gap-2">
                  Próximo: Contato
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Contato ─────────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-900">Contato</h2>
                    <span className="text-[11px] text-gray-400 font-normal">(opcional)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={skipContact} onChange={e => setSkipContact(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-xs text-gray-500">Pular esta etapa</span>
                  </label>
                </div>

                {!skipContact && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Nome Completo *
                      </label>
                      <input type="text" className={`${inputCls} ${contactErrors.full_name ? "border-red-400" : ""}`}
                        placeholder="Ex: João da Silva"
                        value={contactForm.full_name} onChange={e => setCon("full_name", e.target.value)} />
                      {contactErrors.full_name && <p className="text-[11px] text-red-600 mt-1">{contactErrors.full_name}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">E-mail</label>
                        <div className="relative">
                          <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input type="email" className={`${inputCls} pl-9`} placeholder="joao@empresa.com.br"
                            value={contactForm.email} onChange={e => setCon("email", e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Telefone</label>
                        <div className="relative">
                          <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input type="tel" className={`${inputCls} pl-9`} placeholder="11 99999-0000"
                            value={contactForm.phone} onChange={e => setCon("phone", e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Cargo</label>
                        <div className="relative">
                          <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input type="text" className={`${inputCls} pl-9`} placeholder="CEO, Diretor…"
                            value={contactForm.job_title} onChange={e => setCon("job_title", e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Senioridade</label>
                        <select className={selectCls} value={contactForm.seniority} onChange={e => setCon("seniority", e.target.value)}>
                          {[["c_level","C-Level"],["director","Diretor"],["manager","Gerente"],["ic","Analista/IC"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={contactForm.is_primary_contact}
                        onChange={e => setCon("is_primary_contact", e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Contato principal da empresa</span>
                    </label>
                  </div>
                )}

                {skipContact && (
                  <div className="py-4 text-center text-sm text-gray-400">
                    Etapa de contato ignorada — você pode adicionar contatos depois.
                  </div>
                )}
              </div>

              {/* Empresa selecionada — resumo */}
              {(selectedAccount || (accountMode === "new" && accountForm.account_name)) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <Building2 size={13} className="text-gray-400 shrink-0" />
                  <span className="text-gray-600 truncate">
                    Empresa: <strong>
                      {accountMode === "search"
                        ? (selectedAccount?.trade_name ?? selectedAccount?.account_name)
                        : (accountForm.trade_name || accountForm.account_name)}
                    </strong>
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft size={14} />
                  Voltar
                </button>
                <button type="button" onClick={handleNext}
                  className="btn-primary flex items-center gap-2">
                  Próximo: Lead
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Lead ─────────────────────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
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
                  <span className="text-[11px] text-gray-500 shrink-0">
                    {estimatedScore >= 71 ? "Quente" : estimatedScore >= 41 ? "Morno" : "Frio"}
                  </span>
                </div>
              </div>

              {/* Qualificação */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus size={15} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900">Qualificação</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      BU (Unidade de Negócio) *
                    </label>
                    <select className={`${selectCls} ${leadErrors.bu ? "border-red-400" : ""}`}
                      value={leadForm.bu} onChange={e => setLead("bu", e.target.value)}>
                      <option value="">Selecionar BU…</option>
                      <option value="JACQES">JACQES</option>
                      <option value="CAZA">CAZA</option>
                      <option value="ADVISOR">ADVISOR</option>
                      <option value="VENTURE">VENTURE</option>
                    </select>
                    {leadErrors.bu && <p className="text-[11px] text-red-600 mt-1">{leadErrors.bu}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Fonte do Lead</label>
                    <select className={selectCls} value={leadForm.lead_source} onChange={e => setLead("lead_source", e.target.value)}>
                      <option value="manual">Manual</option>
                      <option value="inbound">Inbound</option>
                      <option value="referral">Referral / Indicação</option>
                      <option value="organic">Orgânico</option>
                      <option value="paid">Pago</option>
                      <option value="outbound">Outbound</option>
                      <option value="event">Evento</option>

                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Responsável *
                    </label>
                    <select className={`${selectCls} ${leadErrors.assigned_to ? "border-red-400" : ""}`}
                      value={leadForm.assigned_to} onChange={e => setLead("assigned_to", e.target.value)}>
                      <option value="">Selecionar…</option>
                      <option value="Miguel">Miguel</option>
                      <option value="Danilo">Danilo</option>
                    </select>
                    {leadErrors.assigned_to && <p className="text-[11px] text-red-600 mt-1">{leadErrors.assigned_to}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Status inicial</label>
                    <select className={selectCls} value={leadForm.status} onChange={e => setLead("status", e.target.value)}>
                      <option value="new">Novo</option>
                      <option value="contacted">Contato feito</option>
                      <option value="qualified">Qualificado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BANT */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={15} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900">BANT</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Budget (Orçamento estimado)
                      <span className="text-gray-400 font-normal ml-1">30pts ≥R$50K</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">R$</span>
                      <input type="number" min="0" step="1000" className={`${inputCls} pl-9`}
                        placeholder="25000"
                        value={leadForm.bant_budget} onChange={e => setLead("bant_budget", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Need (Necessidade)
                      <span className="text-gray-400 font-normal ml-1">25pts Alta</span>
                    </label>
                    <select className={selectCls} value={leadForm.bant_need} onChange={e => setLead("bant_need", e.target.value)}>
                      <option value="">Selecionar…</option>
                      <option value="high">Alta</option>
                      <option value="medium">Média</option>
                      <option value="low">Baixa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Timeline (Prazo de decisão)
                      <span className="text-gray-400 font-normal ml-1">15pts ≤30d</span>
                    </label>
                    <div className="relative">
                      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input type="date" className={`${inputCls} pl-9`}
                        value={leadForm.bant_timeline} onChange={e => setLead("bant_timeline", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Authority (É o decisor?)
                      <span className="text-gray-400 font-normal ml-1">20pts se sim</span>
                    </label>
                    <label className="flex items-center gap-3 mt-2 cursor-pointer">
                      <div onClick={() => setLead("bant_authority", !leadForm.bant_authority)}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer ${leadForm.bant_authority ? "bg-blue-500" : "bg-gray-200"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${leadForm.bant_authority ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                      <span className={`text-sm font-medium ${leadForm.bant_authority ? "text-blue-700" : "text-gray-600"}`}>
                        {leadForm.bant_authority ? "Sim, é o decisor" : "Não é o decisor"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={15} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900">Notas de Qualificação</h2>
                </div>
                <textarea rows={3} className={`${inputCls} resize-none`}
                  placeholder="Descreva o contexto, dores identificadas, próximos passos…"
                  value={leadForm.qualification_notes}
                  onChange={e => setLead("qualification_notes", e.target.value)} />
              </div>

              {/* Resumo do que será criado */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 space-y-1">
                <div className="font-semibold text-gray-800 text-xs uppercase tracking-wide mb-2">O que será criado:</div>
                <div className="flex items-center gap-2">
                  <Building2 size={12} className="text-gray-400 shrink-0" />
                  {accountMode === "search" && selectedAccount
                    ? <span>Empresa vinculada: <strong>{selectedAccount.trade_name ?? selectedAccount.account_name}</strong></span>
                    : accountMode === "new" && accountForm.account_name
                    ? <span>Nova empresa: <strong>{accountForm.trade_name || accountForm.account_name}</strong></span>
                    : <span className="text-gray-400">Sem empresa vinculada</span>}
                </div>
                <div className="flex items-center gap-2">
                  <User size={12} className="text-gray-400 shrink-0" />
                  {!skipContact && contactForm.full_name
                    ? <span>Novo contato: <strong>{contactForm.full_name}</strong></span>
                    : <span className="text-gray-400">Sem contato</span>}
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus size={12} className="text-gray-400 shrink-0" />
                  <span>Novo lead · BU: <strong>{leadForm.bu || "—"}</strong> · Score estimado: <strong>{estimatedScore}/100</strong></span>
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <button type="button" onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft size={14} />
                  Voltar
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
                      Criar Cadastro
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
