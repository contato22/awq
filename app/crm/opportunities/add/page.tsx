"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { STAGE_LABELS, STAGE_PROBABILITY, BU_OPTIONS, OWNER_OPTIONS } from "@/lib/crm-types";
import type { CrmAccount } from "@/lib/crm-types";
import { Search, X, ChevronDown, Building2, CheckCircle2 } from "lucide-react";

const ACTIVE_STAGES = ["discovery","qualification","proposal","negotiation","closed_won","closed_lost"] as const;

function AccountAutocomplete({
  value, accountId, onChange,
}: {
  value: string;
  accountId: string;
  onChange: (name: string, id: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CrmAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CrmAccount | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    const url = q.trim() ? `/api/crm/accounts?search=${encodeURIComponent(q)}` : "/api/crm/accounts";
    const res = await fetch(url).then(r => r.json()).catch(() => ({ success: false }));
    setResults(res.success ? res.data.slice(0, 8) : []);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSelect(a: CrmAccount) {
    setSelected(a);
    setQuery(a.account_name);
    onChange(a.account_name, a.account_id);
    setOpen(false);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    onChange("", "");
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  if (selected || accountId) {
    const display = selected?.account_name ?? value;
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-emerald-300 rounded-lg bg-emerald-50">
        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
        <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{display}</span>
        <button type="button" onClick={handleClear} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Buscar conta pelo nome…"
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
        />
        {query
          ? <button type="button" onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600"><X size={12} /></button>
          : <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        }
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.length > 0 ? (
            <ul className="max-h-52 overflow-y-auto">
              {results.map(a => (
                <li key={a.account_id}>
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(a)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Building2 size={13} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{a.account_name}</div>
                      {a.industry && <div className="text-[11px] text-gray-400 truncate">{a.industry}</div>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-xs text-gray-400">
              {query ? `Nenhuma conta encontrada para "${query}"` : "Digite para buscar contas"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddOpportunityPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultStage = (params?.get("stage") ?? "discovery") as typeof ACTIVE_STAGES[number];

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    opportunity_name: "",
    bu: "JACQES",
    owner: "Miguel",
    stage: defaultStage,
    deal_value: "",
    expected_close_date: "",
    account_id: "",
    account_name: "",
    lost_reason: "",
    proposal_sent_date: "",
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const probability = STAGE_PROBABILITY[form.stage as keyof typeof STAGE_PROBABILITY] ?? 25;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.opportunity_name.trim()) { setError("Nome da oportunidade é obrigatório"); return; }
    if (!form.bu) { setError("BU é obrigatória"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          opportunity_name: form.opportunity_name.trim(),
          bu: form.bu,
          owner: form.owner,
          stage: form.stage,
          deal_value: parseFloat(form.deal_value) || 0,
          expected_close_date: form.expected_close_date || null,
          account_id: form.account_id || null,
          lost_reason: form.lost_reason || null,
          proposal_sent_date: form.proposal_sent_date || null,
        }),
      });
      const data = await res.json();
      if (data.success) router.push("/crm/opportunities");
      else setError(data.error ?? "Erro ao criar oportunidade");
    } catch {
      setError("Erro de rede — tente novamente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header title="Nova Oportunidade" subtitle="Registrar oportunidade no pipeline" />
      <div className="page-container max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Informações Básicas */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Informações Básicas</h2>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Oportunidade *</label>
              <input value={form.opportunity_name} onChange={e => set("opportunity_name", e.target.value)}
                placeholder="Ex: XP — Campanha Performance Q3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Business Unit *</label>
                <select value={form.bu} onChange={e => set("bu", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {BU_OPTIONS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Owner</label>
                <select value={form.owner} onChange={e => set("owner", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Conta (opcional)</label>
              <AccountAutocomplete
                value={form.account_name}
                accountId={form.account_id}
                onChange={(name, id) => setForm(prev => ({ ...prev, account_name: name, account_id: id }))}
              />
            </div>
          </div>

          {/* Estágio & Valores */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Estágio & Valores</h2>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estágio</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                {ACTIVE_STAGES.map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]} — {STAGE_PROBABILITY[s]}%</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">Probabilidade automática: <strong>{probability}%</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor do Deal (R$)</label>
                <input type="number" min="0" step="100" value={form.deal_value} onChange={e => set("deal_value", e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Previsão de Fechamento</label>
                <input type="date" value={form.expected_close_date} onChange={e => set("expected_close_date", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
            </div>

            {(form.stage === "proposal" || form.stage === "negotiation" || form.stage === "closed_won") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data de Envio da Proposta</label>
                <input type="date" value={form.proposal_sent_date} onChange={e => set("proposal_sent_date", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
            )}

            {form.stage === "closed_lost" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Motivo da Perda</label>
                <select value={form.lost_reason} onChange={e => set("lost_reason", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
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

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? "Salvando…" : "Criar Oportunidade"}
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
