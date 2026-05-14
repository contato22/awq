"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { OWNER_OPTIONS } from "@/lib/crm-types";
import { supabase } from "@/lib/supabase-client";

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
    try {
      const { error: err } = await supabase.from("crm_accounts").insert({
        account_name: form.account_name.trim(),
        trade_name: form.trade_name || null,
        document_number: form.document_number || null,
        industry: form.industry || null,
        company_size: form.company_size || null,
        website: form.website || null,
        linkedin_url: form.linkedin_url || null,
        address_street: form.address_street || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_zip: form.address_zip || null,
        account_type: form.account_type,
        owner: form.owner,
        health_score: parseInt(form.health_score),
        churn_risk: form.churn_risk,
        renewal_date: form.renewal_date || null,
        created_by: form.owner,
      });
      if (err) throw new Error(err.message);
      router.push("/crm/accounts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
      setSaving(false);
    }
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
                  {[["tech","Tecnologia"],["finance","Finanças"],["education","Educação"],["health","Saúde"],["mídia","Mídia"],["retail","Varejo"],["other","Outro"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
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
