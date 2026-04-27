"use client";

// ─── SupplierSelect ───────────────────────────────────────────────────────────
// Autocomplete de fornecedores backed pela API /api/suppliers.
// Inclui modal de cadastro rápido (campos essenciais).

import React, { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { Search, X, Plus, Building2, User, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Supplier } from "@/lib/supplier-types";
import { SUPPLIER_STATUS_CONFIG, PAYMENT_TERMS_LABELS, PAYMENT_METHOD_LABELS, PIX_KEY_TYPE_LABELS, BANK_ACCOUNT_TYPE_LABELS } from "@/lib/supplier-types";
import { formatDoc, docPlaceholder, validateDoc } from "@/lib/cnpj-cpf";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  value:       string;              // display name
  supplierId?: number;
  onChange:    (name: string, supplier?: Supplier) => void;
  placeholder?: string;
  className?:   string;
}

// ── Quick-create defaults ─────────────────────────────────────────────────────

const EMPTY_QUICK = {
  document_type:           "cnpj" as "cpf" | "cnpj",
  document_number:         "",
  legal_name:              "",
  trade_name:              "",
  supplier_type:           "" as string,
  primary_contact_email:   "",
  primary_contact_phone:   "",
  default_payment_terms:   "" as string,
  default_payment_method:  "" as string,
  pix_key_type:            "" as string,
  pix_key:                 "",
  bank_code:               "",
  bank_name:               "",
  bank_branch:             "",
  bank_account:            "",
  bank_account_type:       "" as string,
  bank_account_holder:     "",
  requires_nf:             true,
  withhold_irrf:           false,
  withhold_iss:            false,
  withhold_inss:           false,
  withhold_pis_cofins_csll: false,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SupplierSelect({ value, supplierId, onChange, placeholder = "Buscar fornecedor…", className = "" }: Props) {
  const [query,     setQuery]     = useState(value);
  const [results,   setResults]   = useState<Supplier[]>([]);
  const [open,      setOpen]      = useState(false);
  const [selected,  setSelected]  = useState<Supplier | null>(null);
  const [showQuick, setShowQuick] = useState(false);
  const [quick,     setQuick]     = useState({ ...EMPTY_QUICK });
  const [saving,    setSaving]    = useState(false);
  const [quickErr,  setQuickErr]  = useState<string | null>(null);
  const [docRaw,    setDocRaw]    = useState("");

  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sync external value
  useEffect(() => {
    if (!supplierId) { setSelected(null); setQuery(value); }
  }, [value, supplierId]);

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    try {
      const res = await fetch(`/api/suppliers?status=active&search=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ }
  }, []);

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    setSelected(null);
    onChange(v, undefined);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 200);
  }

  function handleSelect(s: Supplier) {
    const display = s.trade_name || s.legal_name;
    setSelected(s);
    setQuery(display);
    onChange(display, s);
    setOpen(false);
    setResults([]);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    onChange("", undefined);
    setResults([]);
    inputRef.current?.focus();
  }

  // ── Quick-create ─────────────────────────────────────────────────────────────

  function openQuick(name: string) {
    setQuick({ ...EMPTY_QUICK, legal_name: name });
    setDocRaw("");
    setShowQuick(true);
    setOpen(false);
    setQuickErr(null);
  }

  async function handleQuickSave() {
    if (!quick.legal_name.trim() || !quick.document_number) {
      setQuickErr("Razão Social e CNPJ/CPF são obrigatórios.");
      return;
    }
    if (!validateDoc(quick.document_number, quick.document_type)) {
      setQuickErr(`${quick.document_type.toUpperCase()} inválido.`);
      return;
    }
    setSaving(true);
    setQuickErr(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quick,
          document_number: quick.document_number.replace(/\D/g, ""),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, unknown>;
        setQuickErr(String(err.error ?? "Erro ao cadastrar fornecedor."));
        return;
      }
      const supplier = await res.json() as Supplier;
      handleSelect(supplier);
      setShowQuick(false);
    } catch {
      setQuickErr("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  const st = selected ? SUPPLIER_STATUS_CONFIG[selected.status as keyof typeof SUPPLIER_STATUS_CONFIG] : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 bg-white transition-colors ${open ? "border-brand-500 ring-1 ring-brand-200" : "border-gray-200"}`}>
        <Search size={13} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (query) { setOpen(true); doSearch(query); } }}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent text-gray-900 placeholder:text-gray-400 outline-none min-w-0"
        />
        {selected && st && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${st.bg} ${st.color} shrink-0`}>
            {selected.supplier_code}
          </span>
        )}
        {query && (
          <button onClick={handleClear} className="p-0.5 rounded text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {results.length > 0 ? (
            results.map((s: Supplier) => {
              const cfg = SUPPLIER_STATUS_CONFIG[s.status];
              return (
                <button
                  key={s.supplier_id}
                  onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); handleSelect(s); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.document_type === "cpf" ? "bg-violet-50" : "bg-blue-50"}`}>
                    {s.document_type === "cpf"
                      ? <User size={13} className="text-violet-600" />
                      : <Building2 size={13} className="text-blue-600" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">
                      {s.trade_name || s.legal_name}
                    </div>
                    {s.trade_name && (
                      <div className="text-[10px] text-gray-400 truncate">{s.legal_name}</div>
                    )}
                    <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                      {formatDoc(s.document_number, s.document_type)} · {s.supplier_code}
                    </div>
                  </div>
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-xs text-gray-400">
              Nenhum resultado{query ? ` para "${query}"` : ""}.
            </div>
          )}
          <button
            onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); openQuick(query); }}
            className="w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <Plus size={13} /> Cadastrar "{query || "novo fornecedor"}"
          </button>
        </div>
      )}

      {/* Quick-create modal */}
      {showQuick && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-brand-600" />
                <span className="text-sm font-semibold text-gray-800">Cadastro Rápido de Fornecedor</span>
              </div>
              <button onClick={() => setShowQuick(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={15} />
              </button>
            </div>

            {quickErr && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs">
                <AlertCircle size={13} /> {quickErr}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Tipo documento */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Tipo Doc.</label>
                <select
                  value={quick.document_type}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, document_type: e.target.value as "cpf" | "cnpj", document_number: "" }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                >
                  <option value="cnpj">CNPJ</option>
                  <option value="cpf">CPF</option>
                </select>
              </div>

              {/* Documento */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">
                  {quick.document_type.toUpperCase()} *
                </label>
                <input
                  type="text"
                  value={docRaw}
                  placeholder={docPlaceholder(quick.document_type)}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setDocRaw(formatDoc(raw, quick.document_type));
                    setQuick((q: typeof EMPTY_QUICK) => ({ ...q, document_number: raw }));
                  }}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 font-mono placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Razão Social */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Razão Social *</label>
                <input
                  type="text"
                  value={quick.legal_name}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, legal_name: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                  placeholder="Razão Social / Nome Completo"
                />
              </div>

              {/* Nome Fantasia */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={quick.trade_name}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, trade_name: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                  placeholder="Nome comercial (opcional)"
                />
              </div>

              {/* Tipo de fornecedor */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Tipo</label>
                <select
                  value={quick.supplier_type}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, supplier_type: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                >
                  <option value="">— Selecionar —</option>
                  <option value="service_provider">Prestador de Serviços</option>
                  <option value="product_supplier">Fornecedor de Produtos</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="consultant">Consultor</option>
                </select>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">E-mail</label>
                <input
                  type="email"
                  value={quick.primary_contact_email}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, primary_contact_email: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                  placeholder="financeiro@empresa.com"
                />
              </div>

              {/* Pgto prazo */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Prazo Padrão</label>
                <select
                  value={quick.default_payment_terms}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, default_payment_terms: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                >
                  <option value="">— Selecionar —</option>
                  {Object.entries(PAYMENT_TERMS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Pgto método */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Método Padrão</label>
                <select
                  value={quick.default_payment_method}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, default_payment_method: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                >
                  <option value="">— Selecionar —</option>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* PIX */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Tipo Chave PIX</label>
                <select
                  value={quick.pix_key_type}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, pix_key_type: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                >
                  <option value="">— Selecionar —</option>
                  {Object.entries(PIX_KEY_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Chave PIX</label>
                <input
                  type="text"
                  value={quick.pix_key}
                  placeholder={quick.pix_key_type === "cpf" ? "000.000.000-00" : quick.pix_key_type === "cnpj" ? "00.000.000/0001-00" : quick.pix_key_type === "phone" ? "+55 11 99999-9999" : quick.pix_key_type === "email" ? "email@exemplo.com" : "Chave aleatória"}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, pix_key: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Dados Bancários */}
              <div className="col-span-2">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Dados Bancários (TED/DOC)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Banco</label>
                    <input
                      type="text" placeholder="Ex: 341 — Itaú" value={quick.bank_name}
                      onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, bank_name: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Código</label>
                    <input
                      type="text" placeholder="341" value={quick.bank_code} maxLength={10}
                      onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, bank_code: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Agência</label>
                    <input
                      type="text" placeholder="0001" value={quick.bank_branch} maxLength={10}
                      onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, bank_branch: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Conta</label>
                    <input
                      type="text" placeholder="12345-6" value={quick.bank_account} maxLength={20}
                      onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, bank_account: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Tipo</label>
                    <select value={quick.bank_account_type}
                      onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, bank_account_type: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500">
                      <option value="">— Tipo —</option>
                      {Object.entries(BANK_ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Titular</label>
                    <input
                      type="text" placeholder="Nome do titular" value={quick.bank_account_holder}
                      onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, bank_account_holder: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Retenções */}
              <div className="col-span-2">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Compliance Fiscal</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "requires_nf",            label: "Requer NF" },
                    { key: "withhold_irrf",           label: "Reter IRRF" },
                    { key: "withhold_iss",            label: "Reter ISS" },
                    { key: "withhold_inss",           label: "Reter INSS" },
                    { key: "withhold_pis_cofins_csll",label: "Reter PIS/COFINS/CSLL" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(quick[key as keyof typeof quick])}
                        onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuick((q: typeof EMPTY_QUICK) => ({ ...q, [key]: (e as ChangeEvent<HTMLInputElement>).target.checked }))}
                        className="w-3.5 h-3.5 accent-brand-600"
                      />
                      <span className="text-xs text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleQuickSave}
                disabled={saving || !quick.legal_name.trim() || !quick.document_number}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Salvando…" : <><CheckCircle2 size={14} /> Salvar Fornecedor</>}
              </button>
              <button
                onClick={() => setShowQuick(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
