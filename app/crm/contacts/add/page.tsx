"use client";

import { useEffect, useState, Suspense } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import type { CrmAccount } from "@/lib/crm-types";
import { BU_OPTIONS } from "@/lib/crm-types";
import { SEED_ACCOUNTS } from "@/lib/crm-db";

function AddContactPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", mobile: "",
    job_title: "", department: "", seniority: "manager",
    linkedin_url: "", is_primary_contact: false,
    bu: "JACQES",
    account_id: params?.get("account_id") ?? "",
  });

  useEffect(() => {
    fetch("/api/crm/accounts")
      .then(r=>r.json())
      .then(res=>setAccounts(res.success ? res.data : SEED_ACCOUNTS))
      .catch(()=>setAccounts(SEED_ACCOUNTS));
  }, []);

  function set(f: string, v: string | boolean) { setForm(p=>({...p,[f]:v})); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { setError("Nome completo é obrigatório"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form, account_id: form.account_id || null }),
      });
      const data = await res.json();
      if (data.success) router.push(form.account_id ? `/crm/accounts/${form.account_id}` : "/crm/contacts");
      else setError(data.error ?? "Erro ao criar contato");
    } catch { setError("Erro de rede"); } finally { setSaving(false); }
  }

  return (
    <>
      <Header title="Novo Contato" subtitle="Cadastrar pessoa de contato" />
      <div className="page-container max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Dados Pessoais</h2>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Nome Completo *</label>
              <input value={form.full_name} onChange={e=>set("full_name",e.target.value)} placeholder="Ex: João da Silva"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={e=>set("email",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"/></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                <input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="11 9999-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"/></div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Função & Empresa</h2>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
              <select value={form.account_id} onChange={e=>set("account_id",e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                <option value="">— Sem empresa —</option>
                {accounts.map(a=><option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Cargo</label>
                <input value={form.job_title} onChange={e=>set("job_title",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"/></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Senioridade</label>
                <select value={form.seniority} onChange={e=>set("seniority",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {[["c_level","C-Level"],["director","Diretor"],["manager","Gerente"],["ic","Analista/IC"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">BU</label>
                <select value={form.bu} onChange={e=>set("bu",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {BU_OPTIONS.map(b=><option key={b} value={b}>{b}</option>)}
                </select></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="primary" checked={form.is_primary_contact} onChange={e=>set("is_primary_contact",e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
              <label htmlFor="primary" className="text-sm text-gray-700">Contato principal da empresa</label>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={()=>router.back()}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? "Salvando…" : "Criar Contato"}</button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function AddContactPage() {
  return <Suspense><AddContactPageInner /></Suspense>;
}
