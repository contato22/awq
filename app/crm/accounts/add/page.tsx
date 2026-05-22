"use client";

import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { OWNER_OPTIONS } from "@/lib/crm-types";
import {
  Search, CheckCircle2, AlertCircle, Loader2,
  Building2, MapPin, Users, ChevronLeft,
} from "lucide-react";
import type { CnpjData } from "@/app/api/crm/cnpj/route";

const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

const INDUSTRIES = [
  ["technology",        "Tecnologia"],
  ["financial_services","Financeiro"],
  ["real_estate",       "Imobiliário"],
  ["education",         "Educação"],
  ["healthcare",        "Saúde"],
  ["retail",            "Varejo"],
  ["consulting",        "Consultoria"],
  ["other",             "Outro"],
] as const;

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

type FormState = {
  account_name: string; trade_name: string; document_number: string;
  industry: string; company_size: string; website: string; linkedin_url: string;
  address_street: string; address_city: string; address_state: string; address_zip: string;
  account_type: string; owner: string;
  health_score: string; churn_risk: string; renewal_date: string;
};

const BLANK: FormState = {
  account_name: "", trade_name: "", document_number: "",
  industry: "", company_size: "", website: "", linkedin_url: "",
  address_street: "", address_city: "", address_state: "", address_zip: "",
  account_type: "prospect", owner: "Miguel",
  health_score: "70", churn_risk: "low", renewal_date: "",
};

export default function AddAccountPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // CNPJ lookup state
  const [cnpjQuery, setCnpjQuery] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [lookupMsg, setLookupMsg] = useState("");
  const [importedData, setImportedData] = useState<CnpjData | null>(null);
  const cnpjRef = useRef<HTMLInputElement>(null);

  function set(f: keyof FormState, v: string) { setForm(p => ({ ...p, [f]: v })); }

  function applyImport(data: CnpjData) {
    setImportedData(data);
    setForm(p => ({
      ...p,
      account_name:   data.account_name,
      trade_name:     data.trade_name ?? "",
      document_number: data.document_number,
      industry:       data.industry ?? "",
      company_size:   data.company_size ?? "",
      address_street: data.address_street ?? "",
      address_city:   data.address_city ?? "",
      address_state:  data.address_state ?? "",
      address_zip:    data.address_zip ?? "",
    }));
  }

  async function handleLookup() {
    const raw = cnpjQuery.replace(/\D/g, "");
    if (raw.length !== 14) { setLookupMsg("Digite 14 dígitos do CNPJ"); setLookupState("error"); return; }
    setLookupState("loading"); setLookupMsg("");
    try {
      const res = await fetch(`/api/crm/cnpj?cnpj=${raw}`).then(r => r.json());
      if (!res.success) throw new Error(res.error ?? "Erro na consulta");
      applyImport(res.data.cnpj_data as CnpjData);
      setLookupState("ok");
      setLookupMsg(`Dados importados da Receita Federal — situação: ${res.data.cnpj_data.situacao ?? "—"}`);
    } catch (e) {
      setLookupState("error");
      setLookupMsg(e instanceof Error ? e.message : "Erro na consulta");
    }
  }

  function formatCnpjInput(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 14);
    if (d.length <= 2)  return d;
    if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`;
    if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.account_name.trim()) { setError("Razão Social é obrigatória"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/crm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          account_name:   form.account_name.trim(),
          trade_name:     form.trade_name   || null,
          document_number: form.document_number || null,
          industry:       form.industry     || null,
          company_size:   form.company_size || null,
          website:        form.website      || null,
          linkedin_url:   form.linkedin_url || null,
          address_street: form.address_street || null,
          address_city:   form.address_city   || null,
          address_state:  form.address_state  || null,
          address_zip:    form.address_zip    || null,
          account_type:   form.account_type,
          owner:          form.owner,
          health_score:   parseInt(form.health_score) || 70,
          churn_risk:     form.churn_risk,
          renewal_date:   form.renewal_date || null,
          created_by:     form.owner,
        }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error ?? "Erro ao criar conta");
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

          <button type="button" onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft size={14} />Voltar
          </button>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <AlertCircle size={14} className="shrink-0" />{error}
            </div>
          )}

          {/* ── CNPJ Lookup ──────────────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
              <Search size={14} className="text-blue-500" />
              <span className="text-sm font-semibold text-gray-900">Buscar por CNPJ</span>
              <span className="text-[11px] text-gray-400 ml-1">— preenche todos os campos automaticamente</span>
            </div>
            <div className="p-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={cnpjRef}
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpjQuery}
                    onChange={e => { setCnpjQuery(formatCnpjInput(e.target.value)); setLookupState("idle"); }}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleLookup())}
                    className={`${inputCls} font-mono tracking-wide`}
                    maxLength={18}
                  />
                </div>
                <button type="button" onClick={handleLookup}
                  disabled={lookupState === "loading" || cnpjQuery.replace(/\D/g, "").length !== 14}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0">
                  {lookupState === "loading"
                    ? <><Loader2 size={14} className="animate-spin" />Buscando…</>
                    : <><Search size={14} />Buscar</>}
                </button>
              </div>

              {lookupState !== "idle" && (
                <div className={`mt-3 flex items-start gap-2 text-[12px] px-3 py-2.5 rounded-lg ${
                  lookupState === "ok"    ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                  lookupState === "error" ? "bg-red-50 text-red-700 border border-red-200" : ""
                }`}>
                  {lookupState === "ok"    && <CheckCircle2 size={13} className="shrink-0 mt-0.5" />}
                  {lookupState === "error" && <AlertCircle  size={13} className="shrink-0 mt-0.5" />}
                  <span>{lookupMsg}</span>
                </div>
              )}

              {/* Sócios preview */}
              {importedData?.socios && importedData.socios.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {importedData.socios.slice(0, 4).map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-[11px] text-gray-700">
                      <Users size={10} className="text-gray-400" />
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-gray-400">· {s.cargo}</span>
                    </div>
                  ))}
                  {importedData.socios.length > 4 && (
                    <div className="px-2.5 py-1 bg-gray-100 rounded-full text-[11px] text-gray-500">
                      +{importedData.socios.length - 4} sócios
                    </div>
                  )}
                </div>
              )}

              {importedData?.cnae_descricao && (
                <p className="mt-2 text-[11px] text-gray-400">
                  CNAE: <span className="text-gray-600">{importedData.cnae_descricao}</span>
                </p>
              )}
            </div>
          </div>

          {/* ── Dados da Empresa ─────────────────────────────────────────── */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Dados da Empresa</h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Razão Social *</label>
              <input value={form.account_name} onChange={e => set("account_name", e.target.value)}
                placeholder="Ex: XP Investimentos S.A." className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Nome Fantasia</label>
                <input value={form.trade_name} onChange={e => set("trade_name", e.target.value)}
                  placeholder="Ex: XP" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">CNPJ</label>
                <input value={form.document_number}
                  onChange={e => set("document_number", formatCnpjInput(e.target.value))}
                  placeholder="00.000.000/0001-00" className={`${inputCls} font-mono`} maxLength={18} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Setor</label>
                <select value={form.industry} onChange={e => set("industry", e.target.value)} className={selectCls}>
                  <option value="">— Selecionar —</option>
                  {INDUSTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Porte</label>
                <select value={form.company_size} onChange={e => set("company_size", e.target.value)} className={selectCls}>
                  <option value="">— Selecionar —</option>
                  {COMPANY_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Website</label>
                <input type="url" value={form.website} onChange={e => set("website", e.target.value)}
                  placeholder="https://empresa.com.br" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">LinkedIn</label>
                <input type="url" value={form.linkedin_url} onChange={e => set("linkedin_url", e.target.value)}
                  placeholder="https://linkedin.com/company/…" className={inputCls} />
              </div>
            </div>
          </div>

          {/* ── Endereço ─────────────────────────────────────────────────── */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Endereço</h2>
              {lookupState === "ok" && (
                <span className="ml-auto text-[10px] text-emerald-600 font-medium">Preenchido automaticamente</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Logradouro</label>
              <input value={form.address_street} onChange={e => set("address_street", e.target.value)}
                placeholder="Av. Paulista, 100, Bela Vista" className={inputCls} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Cidade</label>
                <input value={form.address_city} onChange={e => set("address_city", e.target.value)}
                  placeholder="São Paulo" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">UF</label>
                <input value={form.address_state} onChange={e => set("address_state", e.target.value)}
                  placeholder="SP" maxLength={2} className={`${inputCls} uppercase`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">CEP</label>
                <input value={form.address_zip} onChange={e => set("address_zip", e.target.value.replace(/\D/g, "").slice(0,8))}
                  placeholder="01310900" maxLength={8} className={`${inputCls} font-mono`} />
              </div>
            </div>
          </div>

          {/* ── Classificação & Owner ──────────────────────────────────── */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Classificação &amp; Owner</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Tipo</label>
                <select value={form.account_type} onChange={e => set("account_type", e.target.value)} className={selectCls}>
                  {[["prospect","Prospect"],["customer","Cliente"],["partner","Parceiro"],["former_customer","Ex-Cliente"]].map(([v,l])=>(
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner</label>
                <select value={form.owner} onChange={e => set("owner", e.target.value)} className={selectCls}>
                  {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Health Score</label>
                <input type="number" min="0" max="100" value={form.health_score}
                  onChange={e => set("health_score", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Churn Risk</label>
                <select value={form.churn_risk} onChange={e => set("churn_risk", e.target.value)} className={selectCls}>
                  {[["low","Baixo"],["medium","Médio"],["high","Alto"]].map(([v,l])=>(
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Renovação</label>
                <input type="date" value={form.renewal_date} onChange={e => set("renewal_date", e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving
                ? <><Loader2 size={14} className="animate-spin" />Salvando…</>
                : <><CheckCircle2 size={14} />Criar Conta</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
