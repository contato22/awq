"use client";

// ─── /awq/epm/ap — Contas a Pagar (Accounts Payable) ─────────────────────────
//
// Client component: AP management with aging, add, and status tracking.
// Persists to localStorage (same pattern as /awq/ap-ar) — zero cost, instant.

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  ArrowDownLeft, Plus, X, AlertTriangle, CheckCircle2, Clock, Trash2, Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type APStatus = "PENDING" | "SCHEDULED" | "PAID" | "OVERDUE" | "CANCELLED";
type BuCode   = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";

interface APItem {
  id:           string;
  bu_code:      BuCode;
  supplier:     string;
  description:  string;
  amount:       number;
  issue_date:   string;
  due_date:     string;
  status:       APStatus;
  category:     string;
  reference_doc?: string;
  created_at:   string;
}

type AgingBucket = "CURRENT" | "1-30d" | "31-60d" | "61-90d" | "+90d" | "PAID";

function agingBucket(item: APItem): AgingBucket {
  if (item.status === "PAID") return "PAID";
  const today = new Date();
  const due   = new Date(item.due_date);
  const diff  = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  if (diff <= 0)  return "CURRENT";
  if (diff <= 30) return "1-30d";
  if (diff <= 60) return "31-60d";
  if (diff <= 90) return "61-90d";
  return "+90d";
}

function fmtBRL(n: number) {
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const STATUS_CFG: Record<APStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "Pendente",   color: "text-amber-700",   bg: "bg-amber-50"   },
  SCHEDULED: { label: "Agendado",   color: "text-brand-700",   bg: "bg-brand-50"   },
  PAID:      { label: "Pago",       color: "text-emerald-700", bg: "bg-emerald-50" },
  OVERDUE:   { label: "Vencido",    color: "text-red-700",     bg: "bg-red-50"     },
  CANCELLED: { label: "Cancelado",  color: "text-gray-500",    bg: "bg-gray-100"   },
};

const AGING_CFG: Record<AgingBucket, { label: string; color: string }> = {
  CURRENT: { label: "A vencer",  color: "text-emerald-600" },
  "1-30d": { label: "1-30d",     color: "text-amber-600"   },
  "31-60d":{ label: "31-60d",    color: "text-orange-600"  },
  "61-90d":{ label: "61-90d",    color: "text-red-600"     },
  "+90d":  { label: "+90 dias",  color: "text-red-800"     },
  PAID:    { label: "Pago",      color: "text-gray-400"    },
};

const STORAGE_KEY = "awq_epm_ap_items";
const CATEGORIES = ["Freelancer","Fornecedor","Aluguel","Software","Marketing","Tributário","Folha","Outros"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function APPage() {
  const [items, setItems]       = useState<APItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    bu_code: "AWQ" as BuCode,
    supplier: "", description: "", amount: "",
    issue_date: today, due_date: "", status: "PENDING" as APStatus,
    category: "Fornecedor", reference_doc: "",
  });

  // Load + auto-overdue
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: APItem[] = JSON.parse(raw);
        const updated = parsed.map((item) => {
          if (item.status === "PENDING" && new Date(item.due_date) < new Date()) {
            return { ...item, status: "OVERDUE" as APStatus };
          }
          return item;
        });
        setItems(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((next: APItem[]) => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  function addItem() {
    if (!form.supplier || !form.description || !form.amount || !form.due_date) return;
    const item: APItem = {
      id:           crypto.randomUUID(),
      bu_code:      form.bu_code,
      supplier:     form.supplier,
      description:  form.description,
      amount:       parseFloat(form.amount),
      issue_date:   form.issue_date,
      due_date:     form.due_date,
      status:       form.status,
      category:     form.category,
      reference_doc:form.reference_doc || undefined,
      created_at:   new Date().toISOString(),
    };
    save([...items, item]);
    setForm((f) => ({ ...f, supplier: "", description: "", amount: "", due_date: "", reference_doc: "" }));
    setShowForm(false);
  }

  function markPaid(id: string) {
    save(items.map((i) => i.id === id ? { ...i, status: "PAID" as APStatus } : i));
  }

  function deleteItem(id: string) {
    save(items.filter((i) => i.id !== id));
  }

  // Filter
  const filtered = items.filter((i) =>
    search === "" ||
    i.supplier.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  // Aging buckets summary
  const outstanding = items.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED");
  const agingGroups: Partial<Record<AgingBucket, number>> = {};
  for (const item of outstanding) {
    const b = agingBucket(item);
    agingGroups[b] = (agingGroups[b] ?? 0) + item.amount;
  }

  const totalOutstanding = outstanding.reduce((s, i) => s + i.amount, 0);
  const totalOverdue     = items.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.amount, 0);
  const totalPaid        = items.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <Header
        title="Contas a Pagar (AP)"
        subtitle={`EPM · AWQ Group · ${outstanding.length} itens em aberto`}
      />
      <div className="page-container">

        {/* ── Summary cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total em Aberto",  value: fmtBRL(totalOutstanding), color: "text-amber-700",   bg: "bg-amber-50"   },
            { label: "Vencido",          value: fmtBRL(totalOverdue),     color: "text-red-700",     bg: "bg-red-50"     },
            { label: "Total Pago",       value: fmtBRL(totalPaid),        color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Qtd em Aberto",    value: String(outstanding.length),color: "text-brand-700",  bg: "bg-brand-50"   },
          ].map((card) => (
            <div key={card.label} className={`card p-4 text-center ${card.bg}`}>
              <div className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── Aging summary ─────────────────────────────────────────── */}
        {outstanding.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Aging Report — AP</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              {(["CURRENT","1-30d","31-60d","61-90d","+90d"] as AgingBucket[]).map((b) => (
                <div key={b} className="bg-gray-50 rounded-lg py-3">
                  <div className={`font-bold tabular-nums ${AGING_CFG[b].color}`}>
                    {fmtBRL(agingGroups[b] ?? 0)}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{AGING_CFG[b].label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar fornecedor ou descrição…"
              className="flex-1 text-xs py-2 border-b border-gray-200 focus:outline-none focus:border-brand-500 bg-transparent"
            />
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Adicionar AP"}
          </button>
        </div>

        {/* ── Add form ──────────────────────────────────────────────── */}
        {showForm && (
          <div className="card p-5 border-brand-200 border-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Nova Conta a Pagar</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Fornecedor</label>
                <input type="text" value={form.supplier}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Nome do fornecedor" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Business Unit</label>
                <select value={form.bu_code}
                  onChange={(e) => setForm((f) => ({ ...f, bu_code: e.target.value as BuCode }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {["AWQ","JACQES","CAZA","ADVISOR","VENTURE"].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block font-semibold text-gray-600 mb-1">Descrição</label>
                <input type="text" value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Ex: Serviço de design — fev/2026" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="0,00" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Categoria</label>
                <select value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Emissão</label>
                <input type="date" value={form.issue_date}
                  onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Vencimento</label>
                <input type="date" value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Doc. referência</label>
                <input type="text" value={form.reference_doc}
                  onChange={(e) => setForm((f) => ({ ...f, reference_doc: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="NF, boleto, contrato…" />
              </div>
              <div className="col-span-2">
                <button onClick={addItem}
                  className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors">
                  Adicionar Conta a Pagar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Items table ───────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="card p-12 flex flex-col items-center gap-3 text-center">
            <ArrowDownLeft size={32} className="text-gray-200" />
            <div className="text-sm text-gray-400">
              {items.length === 0 ? "Nenhuma conta a pagar registrada" : "Nenhum resultado para a busca"}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Vencimento</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Fornecedor</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">BU</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Categoria</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Valor</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-center">Aging</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.sort((a, b) => a.due_date.localeCompare(b.due_date)).map((item) => {
                    const sc  = STATUS_CFG[item.status];
                    const bucket = agingBucket(item);
                    const ac  = AGING_CFG[bucket];
                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-3 tabular-nums text-gray-500 whitespace-nowrap">
                          {fmtDate(item.due_date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-gray-800">{item.supplier}</div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{item.description}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded text-[10px] font-bold">
                            {item.bu_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{item.category}</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-gray-900">
                          {fmtBRL(item.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`font-semibold ${ac.color}`}>{ac.label}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color} ${sc.bg}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {item.status !== "PAID" && item.status !== "CANCELLED" && (
                              <button
                                onClick={() => markPaid(item.id)}
                                title="Marcar como pago"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <CheckCircle2 size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteItem(item.id)}
                              title="Excluir"
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Link href="/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/epm/ar" className="text-brand-600 hover:underline">Contas a Receber →</Link>
        </div>

      </div>
    </>
  );
}
