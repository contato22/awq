"use client";

import { useEffect, useState, Suspense } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { STAGE_LABELS, STAGE_PROBABILITY, BU_OPTIONS, OWNER_OPTIONS } from "@/lib/crm-types";
import type { CrmAccount } from "@/lib/crm-types";
import { SEED_ACCOUNTS } from "@/lib/crm-db";

const ACTIVE_STAGES = ["discovery","qualification","proposal","negotiation","closed_won","closed_lost"] as const;

function AddOpportunityPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultStage = (params?.get("stage") ?? "discovery") as typeof ACTIVE_STAGES[number];

  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
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
    lost_reason: "",
    proposal_sent_date: "",
  });

  useEffect(() => {
    fetch("/api/crm/accounts")
      .then(r => r.json())
      .then(res => setAccounts(res.success ? res.data : SEED_ACCOUNTS))
      .catch(() => setAccounts(SEED_ACCOUNTS));
  }, []);

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
              <select value={form.account_id} onChange={e => set("account_id", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                <option value="">— Selecionar conta —</option>
                {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
              </select>
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
