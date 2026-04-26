"use client";

// ─── ContraparteAutocomplete ──────────────────────────────────────────────────
// Substitui o campo texto livre "Contraparte" no AP/AR.
// • Busca em IndexedDB conforme o usuário digita (debounce 200ms)
// • Mostra dropdown com resultados filtrados por papel (cliente/fornecedor)
// • Botão "+ Cadastrar [query]" abre mini-form de criação rápida sem sair da tela
// • Após criar, auto-seleciona a nova contraparte

import { useState, useEffect, useRef, useCallback } from "react";
import type { ElementType } from "react";
import {
  Search, X, ChevronDown, Plus, User, Building2,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import {
  searchContrapartes,
  createContraparte,
} from "@/lib/contrapartes-repo";
import type { Contraparte, ContraprtePapel, ContraprteTipo, ContraparteRegime } from "@/lib/contraparte-types";
import {
  PAPEL_CONFIG, TIPO_CONFIG, REGIME_LABELS, UF_LIST,
} from "@/lib/contraparte-types";
import { BU_OPTIONS } from "@/lib/bu-config";
import type { BU } from "@/lib/bu-config";
import { formatDoc, docPlaceholder, validateDoc } from "@/lib/cnpj-cpf";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  value:          string;              // display name
  contraparteId?: string;
  onChange:       (nome: string, id?: string) => void;
  papel?:         ContraprtePapel;     // pre-filter (cliente | fornecedor | ambos)
  placeholder?:   string;
  className?:     string;
}

// ─── Quick-create form state ──────────────────────────────────────────────────

const EMPTY_QUICK: {
  tipo: ContraprteTipo; papel: ContraprtePapel; razaoSocial: string;
  cnpjCpf: string; regime: ContraparteRegime; emailFinanceiro: string; bu: BU;
} = {
  tipo: "pj", papel: "fornecedor", razaoSocial: "",
  cnpjCpf: "", regime: "simples", emailFinanceiro: "", bu: "awq",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContraparteAutocomplete({
  value, contraparteId, onChange, papel, placeholder = "Buscar contraparte…", className = "",
}: Props) {
  const [query,      setQuery]      = useState(value);
  const [results,    setResults]    = useState<Contraparte[]>([]);
  const [open,       setOpen]       = useState(false);
  const [selected,   setSelected]   = useState<Contraparte | null>(null);
  const [showQuick,  setShowQuick]  = useState(false);
  const [quick,      setQuick]      = useState({ ...EMPTY_QUICK });
  const [saving,     setSaving]     = useState(false);
  const [quickErr,   setQuickErr]   = useState<string | null>(null);

  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef= useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync external value into display when controlled ─────────────────────
  useEffect(() => {
    if (!contraparteId) { setSelected(null); setQuery(value); }
  }, [value, contraparteId]);

  // ── Search with debounce ──────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    const res = await searchContrapartes(q, { papel: papel ?? "all" });
    setResults(res.slice(0, 8));
  }, [papel]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Select a contraparte ──────────────────────────────────────────────────
  function handleSelect(c: Contraparte) {
    setSelected(c);
    const display = c.nomeFantasia || c.razaoSocial;
    setQuery(display);
    onChange(display, c.id);
    setOpen(false);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    onChange("", undefined);
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // ── Quick-create ──────────────────────────────────────────────────────────
  function openQuick() {
    setQuick({
      ...EMPTY_QUICK,
      razaoSocial: query,
      papel: papel ?? "fornecedor",
    });
    setQuickErr(null);
    setShowQuick(true);
    setOpen(false);
  }

  async function handleQuickSave() {
    if (!quick.razaoSocial.trim()) { setQuickErr("Razão social é obrigatória"); return; }
    if (!quick.cnpjCpf.trim())    { setQuickErr("CNPJ/CPF é obrigatório"); return; }
    if (!validateDoc(quick.cnpjCpf, quick.tipo)) {
      setQuickErr("CNPJ/CPF inválido — verifique os dígitos verificadores");
      return;
    }

    setSaving(true);
    setQuickErr(null);
    try {
      const c = await createContraparte({
        tipo:            quick.tipo,
        papel:           quick.papel,
        razaoSocial:     quick.razaoSocial.trim(),
        cnpjCpf:         quick.cnpjCpf.replace(/\D/g, ""),
        regime:          quick.regime,
        emailFinanceiro: quick.emailFinanceiro.trim() || undefined,
        bu:              quick.bu,
        status:          "ativo",
      });
      handleSelect(c);
      setShowQuick(false);
    } catch {
      setQuickErr("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (selected) {
    const tipoConf  = TIPO_CONFIG[selected.tipo];
    const papelConf = PAPEL_CONFIG[selected.papel];
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border border-emerald-300 rounded-lg bg-emerald-50 ${className}`}>
        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {selected.nomeFantasia || selected.razaoSocial}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tipoConf.bg} ${tipoConf.color}`}>
              {tipoConf.label}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${papelConf.bg} ${papelConf.color}`}>
              {papelConf.label}
            </span>
          </div>
        </div>
        <button
          type="button" onClick={handleClear}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Remover seleção"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
        />
        {query && (
          <button
            type="button" onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        )}
        {!query && (
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        )}
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.length > 0 ? (
            <ul className="max-h-52 overflow-y-auto">
              {results.map((c) => {
                const pc = PAPEL_CONFIG[c.papel];
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelect(c)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        {c.tipo === "pj" || c.tipo === "mei"
                          ? <Building2 size={13} className="text-gray-500" />
                          : <User       size={13} className="text-gray-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {c.nomeFantasia || c.razaoSocial}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-400">
                            {c.cnpjCpf.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pc.bg} ${pc.color}`}>
                            {pc.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-3 text-xs text-gray-400">
              {query ? `Nenhuma contraparte encontrada para "${query}"` : "Digite para buscar contrapartes"}
            </div>
          )}

          {/* "+ Cadastrar" option */}
          <div className="border-t border-gray-100">
            <button
              type="button"
              onMouseDown={openQuick}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
            >
              <Plus size={13} />
              {query ? `Cadastrar "${query}"` : "Cadastrar nova contraparte"}
            </button>
          </div>
        </div>
      )}

      {/* ── Quick-create modal ────────────────────────────────────────────── */}
      {showQuick && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowQuick(false); }}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-brand-600" />
                <span className="text-sm font-bold text-gray-900">Cadastro rápido de contraparte</span>
              </div>
              <button onClick={() => setShowQuick(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {quickErr && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle size={13} />
                  {quickErr}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tipo *</label>
                  <select
                    value={quick.tipo}
                    onChange={(e) => setQuick((q) => ({ ...q, tipo: e.target.value }))}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                  >
                    <option value="pj">PJ — Pessoa Jurídica</option>
                    <option value="pf">PF — Pessoa Física</option>
                    <option value="mei">MEI</option>
                    <option value="estrangeiro">Estrangeiro</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Papel *</label>
                  <select
                    value={quick.papel}
                    onChange={(e) => setQuick((q) => ({ ...q, papel: e.target.value as ContraprtePapel }))}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="fornecedor">Fornecedor</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Razão Social *</label>
                <input
                  type="text" value={quick.razaoSocial}
                  onChange={(e) => setQuick((q) => ({ ...q, razaoSocial: e.target.value }))}
                  placeholder="Nome completo ou razão social"
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {quick.tipo === "pj" ? "CNPJ *" : quick.tipo === "estrangeiro" ? "ID Fiscal" : "CPF *"}
                  </label>
                  <input
                    type="text" value={formatDoc(quick.cnpjCpf, quick.tipo)}
                    onChange={(e) => setQuick((q) => ({ ...q, cnpjCpf: e.target.value }))}
                    placeholder={docPlaceholder(quick.tipo)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Regime Tributário</label>
                  <select
                    value={quick.regime}
                    onChange={(e) => setQuick((q) => ({ ...q, regime: e.target.value }))}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                  >
                    {Object.entries(REGIME_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Email financeiro</label>
                  <input
                    type="email" value={quick.emailFinanceiro}
                    onChange={(e) => setQuick((q) => ({ ...q, emailFinanceiro: e.target.value }))}
                    placeholder="financeiro@empresa.com"
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">BU</label>
                  <select
                    value={quick.bu}
                    onChange={(e) => setQuick((q) => ({ ...q, bu: e.target.value }))}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                  >
                    {BU_OPTIONS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowQuick(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleQuickSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Cadastrar e selecionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
