"use client";

// ─── /awq/fornecedores — Gestão de Fornecedores (AP) ──────────────────────────

import { useState, useEffect, useCallback, type ChangeEvent, type FocusEvent, type FormEvent, type ReactNode } from "react";
import Header from "@/components/Header";
import {
  Plus, Search, X, Building2, User, AlertCircle, CheckCircle2,
  Pencil, Trash2, RefreshCw, ChevronDown, ChevronUp, Landmark,
  Phone, Mail, MapPin, CreditCard, Shield, Star,
} from "lucide-react";
import type { Supplier, SupplierStatus } from "@/lib/supplier-types";
import {
  SUPPLIER_TYPE_LABELS, PAYMENT_TERMS_LABELS, PAYMENT_METHOD_LABELS,
  PIX_KEY_TYPE_LABELS, BANK_ACCOUNT_TYPE_LABELS, RISK_RATING_CONFIG,
  SUPPLIER_STATUS_CONFIG, UF_LIST,
} from "@/lib/supplier-types";
import { formatDoc, docPlaceholder, validateDoc } from "@/lib/cnpj-cpf";

// ── Empty form ────────────────────────────────────────────────────────────────

type FormState = {
  supplier_code: string; legal_name: string; trade_name: string;
  document_type: "cpf" | "cnpj"; document_number: string; document_number_raw: string;
  state_registration: string; municipal_registration: string;
  supplier_type: string; industry: string; category: string;
  primary_contact_name: string; primary_contact_email: string; primary_contact_phone: string;
  secondary_contact_name: string; secondary_contact_email: string; secondary_contact_phone: string;
  address_street: string; address_number: string; address_complement: string;
  address_neighborhood: string; address_city: string; address_state: string;
  address_zip_code: string; address_country: string;
  bank_code: string; bank_name: string; bank_branch: string; bank_account: string;
  bank_account_type: string; bank_account_holder: string;
  pix_key_type: string; pix_key: string;
  default_payment_terms: string; default_payment_method: string;
  credit_limit: string; current_debt: string; risk_rating: string;
  is_blocked: boolean; block_reason: string;
  requires_nf: boolean; withhold_irrf: boolean; withhold_iss: boolean;
  withhold_inss: boolean; withhold_pis_cofins_csll: boolean;
  avg_delivery_days: string; quality_rating: string; on_time_delivery_rate: string;
  status: string; relationship_start_date: string; relationship_end_date: string;
  notes: string; created_by: string; updated_by: string;
};

const EMPTY: FormState = {
  supplier_code:           "",
  legal_name:              "",
  trade_name:              "",
  document_type:           "cnpj",
  document_number:         "",
  document_number_raw:     "",
  state_registration:      "",
  municipal_registration:  "",
  supplier_type:           "",
  industry:                "",
  category:                "",
  primary_contact_name:    "",
  primary_contact_email:   "",
  primary_contact_phone:   "",
  secondary_contact_name:  "",
  secondary_contact_email: "",
  secondary_contact_phone: "",
  address_street:          "",
  address_number:          "",
  address_complement:      "",
  address_neighborhood:    "",
  address_city:            "",
  address_state:           "",
  address_zip_code:        "",
  address_country:         "BRA",
  bank_code:               "",
  bank_name:               "",
  bank_branch:             "",
  bank_account:            "",
  bank_account_type:       "",
  bank_account_holder:     "",
  pix_key_type:            "",
  pix_key:                 "",
  default_payment_terms:   "",
  default_payment_method:  "",
  credit_limit:            "",
  current_debt:            "0",
  risk_rating:             "",
  is_blocked:              false,
  block_reason:            "",
  requires_nf:             true,
  withhold_irrf:           false,
  withhold_iss:            false,
  withhold_inss:           false,
  withhold_pis_cofins_csll: false,
  avg_delivery_days:       "",
  quality_rating:          "",
  on_time_delivery_rate:   "",
  status:                  "active",
  relationship_start_date: "",
  relationship_end_date:   "",
  notes:                   "",
  created_by:              "",
  updated_by:              "",
};

// ── Sections (for collapsible accordion in form) ──────────────────────────────

const SECTIONS = ["Identificação", "Contato", "Endereço", "Dados Bancários", "Pagamento", "Compliance", "Status"] as const;
type Section = typeof SECTIONS[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FornecedoresPage() {
  const [items,    setItems]    = useState<Supplier[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [statusF,  setStatusF]  = useState<SupplierStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Supplier | null>(null);
  const [form,     setForm]     = useState<FormState>({ ...EMPTY });
  const [docRaw,   setDocRaw]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    "Identificação": true, "Contato": true, "Endereço": false,
    "Dados Bancários": false, "Pagamento": true, "Compliance": true, "Status": false,
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusF !== "all") qs.set("status", statusF);
      if (search.trim())     qs.set("search", search.trim());
      const res = await fetch(`/api/suppliers?${qs}`);
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, [statusF, search]);

  useEffect(() => {
    const t = setTimeout(fetchItems, 250);
    return () => clearTimeout(t);
  }, [fetchItems]);

  // ── ViaCEP lookup ──────────────────────────────────────────────────────────
  async function fetchCEP(cep: string) {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      if (!res.ok) return;
      const data = await res.json() as Record<string, string>;
      if (data.erro) return;
      setForm((prev: FormState) => ({
        ...prev,
        address_street:       data.logradouro  || prev.address_street,
        address_neighborhood: data.bairro       || prev.address_neighborhood,
        address_city:         data.localidade   || prev.address_city,
        address_state:        data.uf           || prev.address_state,
      }));
      setOpenSections((prev: Record<Section, boolean>) => ({ ...prev, "Endereço": true }));
    } catch { /* ignore network errors */ }
  }

  // ── Form helpers ───────────────────────────────────────────────────────────
  function toggleSection(s: Section) {
    setOpenSections((prev: Record<Section, boolean>) => ({ ...prev, [s]: !prev[s] }));
  }

  function f(key: keyof FormState) {
    return {
      value: form[key] == null ? "" : String(form[key]),
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((prev: FormState) => ({ ...prev, [key]: e.target.value })),
    };
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setDocRaw("");
    setErr(null);
    setOpenSections((s: Record<Section, boolean>) => ({ ...s, "Identificação": true, "Contato": true, "Pagamento": true, "Compliance": true }));
    setShowForm(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    const docFormatted = formatDoc(s.document_number, s.document_type);
    setDocRaw(docFormatted);
    setForm({
      supplier_code:           s.supplier_code,
      legal_name:              s.legal_name,
      trade_name:              s.trade_name ?? "",
      document_type:           s.document_type,
      document_number:         docFormatted,
      document_number_raw:     s.document_number,
      state_registration:      s.state_registration ?? "",
      municipal_registration:  s.municipal_registration ?? "",
      supplier_type:           s.supplier_type ?? "",
      industry:                s.industry ?? "",
      category:                s.category ?? "",
      primary_contact_name:    s.primary_contact_name ?? "",
      primary_contact_email:   s.primary_contact_email ?? "",
      primary_contact_phone:   s.primary_contact_phone ?? "",
      secondary_contact_name:  s.secondary_contact_name ?? "",
      secondary_contact_email: s.secondary_contact_email ?? "",
      secondary_contact_phone: s.secondary_contact_phone ?? "",
      address_street:          s.address_street ?? "",
      address_number:          s.address_number ?? "",
      address_complement:      s.address_complement ?? "",
      address_neighborhood:    s.address_neighborhood ?? "",
      address_city:            s.address_city ?? "",
      address_state:           s.address_state ?? "",
      address_zip_code:        s.address_zip_code ?? "",
      address_country:         s.address_country,
      bank_code:               s.bank_code ?? "",
      bank_name:               s.bank_name ?? "",
      bank_branch:             s.bank_branch ?? "",
      bank_account:            s.bank_account ?? "",
      bank_account_type:       s.bank_account_type ?? "",
      bank_account_holder:     s.bank_account_holder ?? "",
      pix_key_type:            s.pix_key_type ?? "",
      pix_key:                 s.pix_key ?? "",
      default_payment_terms:   s.default_payment_terms ?? "",
      default_payment_method:  s.default_payment_method ?? "",
      credit_limit:            s.credit_limit != null ? String(s.credit_limit) : "",
      current_debt:            String(s.current_debt ?? 0),
      risk_rating:             s.risk_rating ?? "",
      is_blocked:              s.is_blocked,
      block_reason:            s.block_reason ?? "",
      requires_nf:             s.requires_nf,
      withhold_irrf:           s.withhold_irrf,
      withhold_iss:            s.withhold_iss,
      withhold_inss:           s.withhold_inss,
      withhold_pis_cofins_csll: s.withhold_pis_cofins_csll,
      avg_delivery_days:       s.avg_delivery_days != null ? String(s.avg_delivery_days) : "",
      quality_rating:          s.quality_rating != null ? String(s.quality_rating) : "",
      on_time_delivery_rate:   s.on_time_delivery_rate != null ? String(s.on_time_delivery_rate) : "",
      status:                  s.status,
      relationship_start_date: s.relationship_start_date ?? "",
      relationship_end_date:   s.relationship_end_date ?? "",
      notes:                   s.notes ?? "",
      created_by:              s.created_by ?? "",
      updated_by:              s.updated_by ?? "",
    });
    setErr(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.legal_name.trim()) { setErr("Razão Social é obrigatória."); return; }
    if (!form.document_number_raw) { setErr("CNPJ/CPF é obrigatório."); return; }
    if (!validateDoc(form.document_number_raw, form.document_type)) {
      setErr(`${form.document_type.toUpperCase()} inválido.`);
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const payload = {
        ...form,
        document_number:  form.document_number_raw,
        credit_limit:     form.credit_limit ? Number(form.credit_limit) : null,
        current_debt:     Number(form.current_debt) || 0,
        avg_delivery_days: form.avg_delivery_days || null,
        quality_rating:   form.quality_rating || null,
        on_time_delivery_rate: form.on_time_delivery_rate || null,
        supplier_type:    form.supplier_type || null,
        bank_account_type: form.bank_account_type || null,
        pix_key_type:     form.pix_key_type || null,
        default_payment_terms:  form.default_payment_terms || null,
        default_payment_method: form.default_payment_method || null,
        risk_rating:      form.risk_rating || null,
      };

      const url    = editing ? `/api/suppliers/${editing.supplier_id}` : "/api/suppliers";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        setErr(String(data.error ?? "Erro ao salvar."));
        return;
      }

      setShowForm(false);
      fetchItems();
    } catch {
      setErr("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: number) {
    if (!confirm("Desativar este fornecedor?")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    fetchItems();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Fornecedores" subtitle="Cadastro master de fornecedores (AP)" />
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {(["all", "active", "inactive", "blocked", "pending_approval"] as const).map((s) => {
              const cfg = s !== "all" ? SUPPLIER_STATUS_CONFIG[s] : null;
              const count = s === "all" ? items.length : items.filter((i: Supplier) => i.status === s).length;
              return (
                <button key={s} onClick={() => setStatusF(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    statusF === s
                      ? s === "all" ? "bg-gray-800 text-white border-gray-800" : `${cfg!.bg} ${cfg!.color} border-current`
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}>
                  {s === "all" ? "Todos" : cfg!.label} ({count})
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Buscar por nome, CNPJ…"
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white w-56 focus:outline-none focus:border-amber-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={fetchItems} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600">
              <Plus className="w-4 h-4" /> Novo Fornecedor
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-16 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum fornecedor cadastrado</p>
            <button onClick={openCreate} className="mt-4 text-sm text-amber-600 hover:underline">Cadastrar primeiro fornecedor</button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Código","Fornecedor","Documento","Tipo","Contato","Dívida Atual","Status","Ações"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((s: Supplier) => {
                  const stCfg = SUPPLIER_STATUS_CONFIG[s.status];
                  const typLabel = s.supplier_type ? SUPPLIER_TYPE_LABELS[s.supplier_type] : "—";
                  return (
                    <tr key={s.supplier_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.supplier_code}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.document_type === "cpf" ? "bg-violet-50" : "bg-blue-50"}`}>
                            {s.document_type === "cpf"
                              ? <User className="w-4 h-4 text-violet-600" />
                              : <Building2 className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate max-w-[180px]">{s.trade_name || s.legal_name}</div>
                            {s.trade_name && <div className="text-[10px] text-gray-400 truncate max-w-[180px]">{s.legal_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{formatDoc(s.document_number, s.document_type)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{typLabel}</td>
                      <td className="px-4 py-3">
                        {s.primary_contact_email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 truncate max-w-[160px]">
                            <Mail className="w-3 h-3 shrink-0" />{s.primary_contact_email}
                          </div>
                        )}
                        {s.primary_contact_phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="w-3 h-3 shrink-0" />{s.primary_contact_phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${s.current_debt > 0 ? "text-red-600" : "text-gray-400"}`}>
                          {fmtR(s.current_debt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${stCfg.bg} ${stCfg.color}`}>
                          {stCfg.label}
                        </span>
                        {s.is_blocked && (
                          <div className="text-[10px] text-red-500 mt-0.5">Bloqueado</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {s.status !== "inactive" && (
                            <button onClick={() => handleDeactivate(s.supplier_id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Desativar">
                              <Trash2 className="w-4 h-4" />
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
      </main>

      {/* ══════════════════ FORM MODAL ══════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-gray-900">
                  {editing ? `Editar — ${editing.supplier_code}` : "Novo Fornecedor"}
                </span>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {err && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {err}
                </div>
              )}

              {/* ── Identificação ── */}
              <Accordion title="Identificação" icon={<Building2 className="w-4 h-4" />}
                open={openSections["Identificação"]} onToggle={() => toggleSection("Identificação")}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <Field label="Tipo Doc." required>
                      <select {...f("document_type")}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                          setDocRaw("");
                          setForm((prev: FormState) => ({ ...prev, document_type: e.target.value as "cpf" | "cnpj", document_number: "", document_number_raw: "" }));
                        }}
                        className="input">
                        <option value="cnpj">CNPJ</option>
                        <option value="cpf">CPF</option>
                      </select>
                    </Field>
                    <Field label={`${form.document_type.toUpperCase()} *`}>
                      <input type="text" value={docRaw}
                        placeholder={docPlaceholder(form.document_type)}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          const formatted = formatDoc(raw, form.document_type);
                          setDocRaw(formatted);
                          setForm((prev: FormState) => ({ ...prev, document_number: formatted, document_number_raw: raw }));
                        }}
                        className="input font-mono" />
                    </Field>
                  </div>
                  <Field label="Razão Social *" className="col-span-2">
                    <input type="text" placeholder="Razão Social / Nome Completo" {...f("legal_name")} className="input" required />
                  </Field>
                  <Field label="Nome Fantasia" className="col-span-2">
                    <input type="text" placeholder="Nome comercial" {...f("trade_name")} className="input" />
                  </Field>
                  <Field label="Tipo de Fornecedor">
                    <select {...f("supplier_type")} className="input">
                      <option value="">— Selecionar —</option>
                      {Object.entries(SUPPLIER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Setor / Indústria">
                    <input type="text" placeholder="Ex: Tecnologia" {...f("industry")} className="input" />
                  </Field>
                  <Field label="IE (Inscrição Estadual)">
                    <input type="text" {...f("state_registration")} className="input" />
                  </Field>
                  <Field label="IM (Inscrição Municipal)">
                    <input type="text" {...f("municipal_registration")} className="input" />
                  </Field>
                </div>
              </Accordion>

              {/* ── Contato ── */}
              <Accordion title="Contato" icon={<Phone className="w-4 h-4" />}
                open={openSections["Contato"]} onToggle={() => toggleSection("Contato")}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contato Principal" className="col-span-2">
                    <input type="text" placeholder="Nome" {...f("primary_contact_name")} className="input" />
                  </Field>
                  <Field label="E-mail Principal">
                    <input type="email" placeholder="financeiro@empresa.com" {...f("primary_contact_email")} className="input" />
                  </Field>
                  <Field label="Telefone Principal">
                    <input type="tel" placeholder="+55 11 99999-9999" {...f("primary_contact_phone")} className="input" />
                  </Field>
                  <Field label="Contato Secundário" className="col-span-2">
                    <input type="text" placeholder="Nome" {...f("secondary_contact_name")} className="input" />
                  </Field>
                  <Field label="E-mail Secundário">
                    <input type="email" {...f("secondary_contact_email")} className="input" />
                  </Field>
                  <Field label="Telefone Secundário">
                    <input type="tel" {...f("secondary_contact_phone")} className="input" />
                  </Field>
                </div>
              </Accordion>

              {/* ── Endereço ── */}
              <Accordion title="Endereço" icon={<MapPin className="w-4 h-4" />}
                open={openSections["Endereço"]} onToggle={() => toggleSection("Endereço")}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CEP">
                    <input type="text" placeholder="00000-000" maxLength={9}
                      value={form.address_zip_code}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        setForm((prev: FormState) => ({ ...prev, address_zip_code: v }));
                        if (v.replace(/\D/g, "").length === 8) fetchCEP(v);
                      }}
                      onBlur={(e: FocusEvent<HTMLInputElement>) => fetchCEP(e.target.value)}
                      className="input font-mono" />
                  </Field>
                  <Field label="UF">
                    <select {...f("address_state")} className="input">
                      <option value="">—</option>
                      {UF_LIST.map((uf) => <option key={uf}>{uf}</option>)}
                    </select>
                  </Field>
                  <Field label="Cidade" className="col-span-2">
                    <input type="text" {...f("address_city")} className="input" />
                  </Field>
                  <Field label="Rua / Logradouro" className="col-span-2">
                    <input type="text" {...f("address_street")} className="input" />
                  </Field>
                  <Field label="Número">
                    <input type="text" {...f("address_number")} className="input" />
                  </Field>
                  <Field label="Complemento">
                    <input type="text" {...f("address_complement")} className="input" />
                  </Field>
                  <Field label="Bairro">
                    <input type="text" {...f("address_neighborhood")} className="input" />
                  </Field>
                </div>
              </Accordion>

              {/* ── Dados Bancários ── */}
              <Accordion title="Dados Bancários" icon={<Landmark className="w-4 h-4" />}
                open={openSections["Dados Bancários"]} onToggle={() => toggleSection("Dados Bancários")}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo Chave PIX">
                    <select {...f("pix_key_type")} className="input">
                      <option value="">— Selecionar —</option>
                      {Object.entries(PIX_KEY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Chave PIX">
                    <input type="text" {...f("pix_key")} className="input" />
                  </Field>
                  <Field label="Banco">
                    <input type="text" placeholder="Ex: Itaú" {...f("bank_name")} className="input" />
                  </Field>
                  <Field label="Código Banco">
                    <input type="text" placeholder="341" maxLength={10} {...f("bank_code")} className="input font-mono" />
                  </Field>
                  <Field label="Agência">
                    <input type="text" placeholder="0001" maxLength={10} {...f("bank_branch")} className="input font-mono" />
                  </Field>
                  <Field label="Conta">
                    <input type="text" placeholder="12345-6" maxLength={20} {...f("bank_account")} className="input font-mono" />
                  </Field>
                  <Field label="Tipo de Conta">
                    <select {...f("bank_account_type")} className="input">
                      <option value="">— Selecionar —</option>
                      {Object.entries(BANK_ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Titular da Conta">
                    <input type="text" {...f("bank_account_holder")} className="input" />
                  </Field>
                </div>
              </Accordion>

              {/* ── Pagamento ── */}
              <Accordion title="Pagamento e Crédito" icon={<CreditCard className="w-4 h-4" />}
                open={openSections["Pagamento"]} onToggle={() => toggleSection("Pagamento")}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prazo Padrão">
                    <select {...f("default_payment_terms")} className="input">
                      <option value="">— Selecionar —</option>
                      {Object.entries(PAYMENT_TERMS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Método Padrão">
                    <select {...f("default_payment_method")} className="input">
                      <option value="">— Selecionar —</option>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Limite de Crédito (R$)">
                    <input type="number" step="0.01" min="0" {...f("credit_limit")} className="input" />
                  </Field>
                  <Field label="Classificação de Risco">
                    <select {...f("risk_rating")} className="input">
                      <option value="">— Selecionar —</option>
                      {Object.entries(RISK_RATING_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </Field>
                </div>
              </Accordion>

              {/* ── Compliance ── */}
              <Accordion title="Compliance Fiscal" icon={<Shield className="w-4 h-4" />}
                open={openSections["Compliance"]} onToggle={() => toggleSection("Compliance")}>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "requires_nf",            label: "Requer Nota Fiscal" },
                    { key: "withhold_irrf",           label: "Reter IRRF" },
                    { key: "withhold_iss",            label: "Reter ISS" },
                    { key: "withhold_inss",           label: "Reter INSS" },
                    { key: "withhold_pis_cofins_csll",label: "Reter PIS/COFINS/CSLL" },
                    { key: "is_blocked",              label: "Bloqueado para novos pedidos" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={Boolean(form[key as keyof FormState])}
                        onChange={(e) => setForm((prev: FormState) => ({ ...prev, [key]: e.target.checked }))}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                {form.is_blocked && (
                  <Field label="Motivo do Bloqueio" className="mt-3">
                    <input type="text" {...f("block_reason")} className="input" placeholder="Descreva o motivo" />
                  </Field>
                )}
              </Accordion>

              {/* ── Status ── */}
              <Accordion title="Status e Vigência" icon={<Star className="w-4 h-4" />}
                open={openSections["Status"]} onToggle={() => toggleSection("Status")}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status">
                    <select {...f("status")} className="input">
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                      <option value="blocked">Bloqueado</option>
                      <option value="pending_approval">Pend. Aprovação</option>
                    </select>
                  </Field>
                  <div />
                  <Field label="Início do Relacionamento">
                    <input type="date" {...f("relationship_start_date")} className="input" />
                  </Field>
                  <Field label="Fim do Relacionamento">
                    <input type="date" {...f("relationship_end_date")} className="input" />
                  </Field>
                  <Field label="Observações" className="col-span-2">
                    <textarea rows={3} {...f("notes")} className="input resize-none" placeholder="Notas internas…" />
                  </Field>
                </div>
              </Accordion>

              {/* ── Actions ── */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? "Salvando…" : editing ? "Salvar Alterações" : "Cadastrar Fornecedor"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Accordion({ title, icon, open, onToggle, children }: {
  title: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}{title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function Field({ label, className = "", required, children }: {
  label: string;
  className?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-0.5">
        {label}{required && " *"}
      </label>
      {children}
    </div>
  );
}
