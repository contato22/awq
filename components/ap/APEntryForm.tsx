"use client";

import { useState, useTransition, useRef } from "react";
import { Search, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { searchCOA, coaPath, getCoaNode } from "@/lib/chart-of-accounts";
import type { COANode } from "@/lib/chart-of-accounts";
import type { APEntry, CreateAPEntryInput, EntityLayer } from "@/lib/ap-shared";

const ENTITY_OPTIONS: Array<{ value: EntityLayer; label: string }> = [
  { value: "AWQ_Holding",  label: "AWQ Holding" },
  { value: "JACQES",       label: "JACQES" },
  { value: "Caza_Vision",  label: "Caza Vision" },
  { value: "Intercompany", label: "Intercompany" },
  { value: "Socio_PF",     label: "Sócio PF" },
];

interface Props {
  onCreated: (entry: APEntry) => void;
}

const EMPTY: CreateAPEntryInput = {
  accountCode: "",
  accountDescription: "",
  managerialCategory: "fornecedor_operacional",
  supplierName: "",
  entity: "AWQ_Holding",
  amount: 0,
  currency: "BRL",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
};

export default function APEntryForm({ onCreated }: Props) {
  const [form, setForm] = useState<CreateAPEntryInput>({ ...EMPTY });
  const [coaQuery, setCoaQuery] = useState("");
  const [coaResults, setCoaResults] = useState<COANode[]>([]);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  function handleCoaSearch(q: string) {
    setCoaQuery(q);
    setCoaResults(searchCOA(q));
  }

  function selectAccount(node: COANode) {
    setForm(f => ({
      ...f,
      accountCode: node.code,
      accountDescription: node.description,
      managerialCategory: node.managerialCategory ?? "fornecedor_operacional",
    }));
    setCoaQuery(node.description);
    setCoaResults([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountCode) { setErrorMsg("Selecione uma conta do Plano de Contas."); setStatus("error"); return; }
    if (!form.supplierName.trim()) { setErrorMsg("Informe o fornecedor."); setStatus("error"); return; }
    if (!form.amount || form.amount <= 0) { setErrorMsg("Valor deve ser positivo."); setStatus("error"); return; }
    if (!form.dueDate) { setErrorMsg("Informe a data de vencimento."); setStatus("error"); return; }

    setStatus("idle");
    startTransition(async () => {
      try {
        const res = await fetch("/api/ap/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j.error ?? "Erro ao salvar");
        }
        const { entry } = await res.json();
        onCreated(entry);
        setForm({ ...EMPTY });
        setCoaQuery("");
        setStatus("ok");
        setTimeout(() => setStatus("idle"), 3000);
      } catch (err) {
        setErrorMsg(String(err));
        setStatus("error");
      }
    });
  }

  const selectedNode = form.accountCode ? getCoaNode(form.accountCode) : null;
  const breadcrumb = selectedNode ? coaPath(selectedNode.code).map(n => n.description).join(" › ") : "";

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-4">Nova AP</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* COA Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Conta (Plano de Contas) <span className="text-red-500">*</span>
          </label>
          <div className="relative" ref={searchRef}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar conta... ex: Slack, Freelancer, Aluguel"
              value={coaQuery}
              onChange={e => handleCoaSearch(e.target.value)}
              onFocus={() => coaQuery && setCoaResults(searchCOA(coaQuery))}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
            {coaResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {coaResults.map(n => (
                  <button
                    key={n.code}
                    type="button"
                    onClick={() => selectAccount(n)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 transition-colors"
                  >
                    <span className="font-mono text-gray-400 mr-2">{n.code}</span>
                    <span className="text-gray-700">{n.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {breadcrumb && (
            <p className="mt-1 text-[11px] text-gray-400 truncate">{breadcrumb}</p>
          )}
          {form.accountCode && (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{form.accountCode}</span>
              <span className="text-[11px] text-gray-500">{form.managerialCategory}</span>
            </div>
          )}
        </div>

        {/* Fornecedor */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Fornecedor / Prestador <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Nome do fornecedor"
            value={form.supplierName}
            onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* CNPJ/CPF (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">CNPJ / CPF</label>
          <input
            type="text"
            placeholder="Opcional"
            value={form.supplierDocument ?? ""}
            onChange={e => setForm(f => ({ ...f, supplierDocument: e.target.value || undefined }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Entity */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Entidade</label>
          <select
            value={form.entity}
            onChange={e => setForm(f => ({ ...f, entity: e.target.value as EntityLayer }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 bg-white"
          >
            {ENTITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Amount + Currency */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Valor <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={form.amount || ""}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Moeda</label>
            <select
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 bg-white"
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Emissão</label>
            <input
              type="date"
              value={form.issueDate}
              onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vencimento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Invoice Number */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nº NF / Documento</label>
          <input
            type="text"
            placeholder="Opcional"
            value={form.invoiceNumber ?? ""}
            onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value || undefined }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Descrição / Histórico</label>
          <textarea
            placeholder="Opcional — detalhes adicionais"
            rows={2}
            value={form.description ?? ""}
            onChange={e => setForm(f => ({ ...f, description: e.target.value || undefined }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 resize-none"
          />
        </div>

        {/* Status message */}
        {status === "ok" && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={14} /> AP registrada com sucesso
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle size={14} /> {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : "Registrar AP"}
        </button>
      </form>
    </div>
  );
}
