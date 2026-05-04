"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { OWNER_OPTIONS } from "@/lib/crm-types";
import type { CrmAccount } from "@/lib/crm-types";
import { SEED_ACCOUNTS } from "@/lib/crm-db";

const LS_KEY = "crm_accounts";

function loadAccounts(): CrmAccount[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as CrmAccount[];
  } catch { /* ignore */ }
  return SEED_ACCOUNTS;
}

function saveAccounts(data: CrmAccount[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function generateId() {
  return "a-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nextCode(accounts: CrmAccount[]): string {
  const nums = accounts
    .map(a => parseInt(a.account_code?.replace("ACC-", "") ?? "0"))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `ACC-${String(max + 1).padStart(3, "0")}`;
}

export default function AddAccountPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    account_name: "", trade_name: "", document_number: "",
    industry: "", company_size: "", website: "", linkedin_url: "",
    address_street: "", address_city: "", address_state: "", address_zip: "",
    account_type: "prospect", owner: "Miguel",
    health_score: "70", churn_risk: "low", renewal_date: "",
  });

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.account_name.trim()) { setError("Nome da empresa é obrigatório"); return; }
    setSaving(true); setError("");

    // Try API first; fall back to localStorage only on network error
    try {
      const res = await fetch("/api/crm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form, health_score: parseInt(form.health_score) }),
      });
      const data = await res.json();
      if (data.success) {
        // Also persist locally so the list page shows it immediately
        const existing = loadAccounts();
        const newAccount: CrmAccount = {
          ...data.data,
          open_opportunities: 0,
          last_activity_at: null,
        };
        saveAccounts([...existing, newAccount]);
        router.push("/crm/accounts");
        return;
      }
      // API is reachable but returned a business error — show it, don't silently fall back
      setError(data.error ?? "Erro ao criar conta");
      setSaving(false);
      return;
    } catch { /* API unavailable (network error) — fall through to localStorage */ }

    // Manual mode: create directly in localStorage
    const existing = loadAccounts();
    const now = new Date().toISOString();
    const newAccount: CrmAccount = {
      account_id:               generateId(),
      account_code:             nextCode(existing),
      account_name:             form.account_name.trim(),
      trade_name:               form.trade_name.trim() || null,
      document_number:          form.document_number.trim() || null,
      industry:                 form.industry || null,
      company_size:             form.company_size || null,
      annual_revenue_estimate:  null,
      website:                  form.website.trim() || null,
      linkedin_url:             form.linkedin_url.trim() || null,
      address_street:           form.address_street.trim() || null,
      address_city:             form.address_city.trim() || null,
      address_state:            form.address_state.trim() || null,
      address_zip:              form.address_zip.trim() || null,
      account_type:             form.account_type as CrmAccount["account_type"],
      owner:                    form.owner,
      health_score:             parseInt(form.health_score) || 70,
      churn_risk:               form.churn_risk as CrmAccount["churn_risk"],
      renewal_date:             form.renewal_date || null,
      epm_customer_id:          null,
      created_at:               now,
      updated_at:               now,
      created_by:               form.owner,
      open_opportunities:       0,
      last_activity_at:         null,
    };
    saveAccounts([...existing, newAccount]);
    setSaving(false);
    router.push("/crm/accounts");
  }

  return (
    <>
      <Header title="Nova Conta" subtitle="Cadastrar empresa ou organização" />
      <div className="page-container max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Dados da Empresa</h2>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Razão Social *</label>
              <input value={form.account_name} onChange={e=>set("account_name",e.target.value)} placeholder="Ex: XP Investimentos S.A."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nome Fantasia</label>
                <input value={form.trade_name} onChange={e=>set("trade_name",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">CNPJ</label>
                <input value={form.document_number} onChange={e=>set("document_number",e.target.value)} placeholder="00.000.000/0001-00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Setor</label>
                <select value={form.industry} onChange={e=>set("industry",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  <option value="">— Selecionar —</option>
                  {[["tech","Tecnologia"],["finance","Finanças"],["education","Educação"],["health","Saúde"],["media","Mídia"],["retail","Varejo"],["other","Outro"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Porte</label>
                <select value={form.company_size} onChange={e=>set("company_size",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  <option value="">— Selecionar —</option>
                  {["1-10","11-50","51-200","201-500","500+"].map(s=><option key={s}>{s}</option>)}
                </select></div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Classificação & Owner</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.account_type} onChange={e=>set("account_type",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {[["prospect","Prospect"],["customer","Cliente"],["partner","Parceiro"],["former_customer","Ex-Cliente"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Owner</label>
                <select value={form.owner} onChange={e=>set("owner",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {OWNER_OPTIONS.map(o=><option key={o}>{o}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Health Score</label>
                <input type="number" min="0" max="100" value={form.health_score} onChange={e=>set("health_score",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Churn Risk</label>
                <select value={form.churn_risk} onChange={e=>set("churn_risk",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {[["low","Baixo"],["medium","Médio"],["high","Alto"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Renovação</label>
                <input type="date" value={form.renewal_date} onChange={e=>set("renewal_date",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" /></div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={()=>router.back()}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? "Salvando…" : "Criar Conta"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
