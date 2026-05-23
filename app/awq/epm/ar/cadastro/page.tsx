"use client";

// ─── /awq/epm/ar/cadastro — AR Registration (Plano de Contas) ─────────────────
// Tab que mostra o Plano de Contas de AR (seção 1.1.2) com saldos por conta,
// formulário de lançamento e painel de orquestração CI/CD:
//   Cadastro → Conciliação → DFC → DRE → Balanço Patrimonial

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ARTabNav from "@/components/ARTabNav";
import {
  AR_COA_TREE, getLeafAccounts, flattenARCoa,
  type ARCoaNode,
} from "@/lib/ar-coa";
import {
  Plus, X, ChevronRight, ChevronDown, Receipt,
  ArrowRight, AlertCircle, CheckCircle2, Clock,
  TrendingUp, Scale, Banknote, BarChart3,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BuCode   = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";
type ARStatus = "PENDING" | "PARTIAL" | "RECEIVED" | "OVERDUE" | "CANCELLED";

interface ARItem {
  id: string; bu_code: BuCode; customer_name: string; description: string;
  category: string; account_code?: string; issue_date: string; due_date: string;
  gross_amount: number; iss_rate: number; iss_amount: number;
  pis_rate: number; pis_amount: number; cofins_rate: number; cofins_amount: number;
  net_amount: number; status: ARStatus; received_date?: string;
  received_amount?: number; cost_center?: string; reference_doc?: string;
}

interface Pipeline {
  conciliacao: {
    pendingCount: number; pendingAmount: number;
    overdueCount: number; overdueAmount: number;
    topPending: { id: string; customer_name: string; net_amount: number; due_date: string; status: string }[];
  };
  dfc: {
    receivedThisMonthAmount: number; receivedLastMonthAmount: number;
    pendingThisMonthCount: number; pendingThisMonthAmount: number;
  };
  dre: {
    grossThisMonth: number; netThisMonth: number; issThisMonth: number;
    grossYtd: number; netYtd: number; invoiceCountYtd: number;
  };
  balanco: {
    grossAr: number; pddEstimate: number; netAr: number; overdueAr: number;
    byAccountGroup: { code: string; label: string; gross: number; pdd: number; net: number }[];
  };
}

interface ARCoaBalances {
  [code: string]: { pending: number; overdue: number; received: number; count: number };
}

// ── Leaf accounts for form ─────────────────────────────────────────────────────

const LEAF_ACCOUNTS = getLeafAccounts().filter((n) => !n.isDeductible);
const ALL_NODES     = flattenARCoa();

// ── Constants ──────────────────────────────────────────────────────────────────

const BUS: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];
const CATEGORIES    = ["Serviço Recorrente", "Projeto", "Consultoria", "Produção", "Adiantamento", "Reembolso", "Outros"];
const AR_SVC_CATS   = new Set(["Serviço Recorrente", "Projeto", "Consultoria", "Produção"]);

function r2(n: number) { return Math.round(n * 100) / 100; }
function fmtBRL(n: number) {
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function calcFiscal(gross: number, cat: string) {
  if (!AR_SVC_CATS.has(cat)) return { iss: 0, pis: 0, cofins: 0, total: 0, net: gross };
  const iss = r2(gross * 0.05); const pis = r2(gross * 0.0065); const cofins = r2(gross * 0.03);
  const total = r2(iss + pis + cofins);
  return { iss, pis, cofins, total, net: r2(gross - total) };
}

// ── CoA balance computation ────────────────────────────────────────────────────

function computeCoaBalances(items: ARItem[]): ARCoaBalances {
  const bal: ARCoaBalances = {};
  const today = new Date().toISOString().slice(0, 10);

  const addTo = (code: string, item: ARItem) => {
    if (!bal[code]) bal[code] = { pending: 0, overdue: 0, received: 0, count: 0 };
    if (item.status === "RECEIVED") {
      bal[code].received += item.received_amount ?? item.net_amount;
    } else if (item.status !== "CANCELLED") {
      if (item.due_date < today) {
        bal[code].overdue += item.net_amount;
      } else {
        bal[code].pending += item.net_amount;
      }
      bal[code].count++;
    }
  };

  for (const item of items) {
    const code = item.account_code;
    if (!code) {
      addTo("__unclassified__", item);
      continue;
    }
    // Roll up to all parent codes too
    addTo(code, item);
    const parts = code.split(".");
    for (let len = parts.length - 1; len >= 3; len--) {
      const parent = parts.slice(0, len).join(".") +
        ".0".repeat(6 - len);
      addTo(parent, item);
    }
  }
  return bal;
}

// ── Pipeline step card ─────────────────────────────────────────────────────────

function PipelineStep({
  icon: Icon, label, sub, value, pill, pillColor, to,
}: {
  icon: React.ElementType; label: string; sub: string; value: string;
  pill?: string; pillColor?: string; to?: string;
}) {
  return (
    <div className="flex-1 min-w-[160px] bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Icon size={16} className="text-brand-500" />
        {pill && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${pillColor ?? "bg-gray-100 text-gray-600"}`}>
            {pill}
          </span>
        )}
      </div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
      {to && (
        <Link href={to} className="text-xs text-brand-600 hover:underline flex items-center gap-0.5 mt-auto">
          Ver detalhes <ArrowRight size={9} />
        </Link>
      )}
    </div>
  );
}

// ── CoA Node row ───────────────────────────────────────────────────────────────

function CoaRow({
  node, depth, balances, onAddAR, expanded, onToggle,
}: {
  node: ARCoaNode; depth: number; balances: ARCoaBalances;
  onAddAR: (code: string, label: string) => void;
  expanded: Set<string>; onToggle: (code: string) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded  = expanded.has(node.code);
  const bal         = balances[node.code];
  const pending     = bal?.pending ?? 0;
  const overdue     = bal?.overdue ?? 0;
  const total       = pending + overdue;

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${node.isDeductible ? "text-red-700" : ""}`}
        onClick={() => hasChildren && onToggle(node.code)}
        style={{ cursor: hasChildren ? "pointer" : "default" }}
      >
        <td className="py-2 px-2" style={{ paddingLeft: `${8 + depth * 16}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              isExpanded
                ? <ChevronDown size={11} className="text-gray-400 shrink-0" />
                : <ChevronRight size={11} className="text-gray-400 shrink-0" />
            ) : <span className="w-3 shrink-0" />}
            <span className="font-mono text-xs text-gray-400 shrink-0">{node.code}</span>
          </div>
        </td>
        <td className="py-2 px-2 text-xs">
          <span className={depth === 0 ? "font-bold text-gray-800" : depth === 1 ? "font-semibold text-gray-700" : "text-gray-600"}>
            {node.label}
          </span>
          {node.currency && node.currency !== "BRL" && (
            <span className="ml-1.5 text-[9px] font-bold text-brand-600 bg-brand-50 px-1 rounded">
              {node.currency}
            </span>
          )}
        </td>
        <td className="py-2 px-2 text-right tabular-nums text-xs">
          {total > 0 ? (
            <span className={overdue > 0 ? "text-red-600 font-semibold" : "text-amber-700"}>
              {fmtBRL(total)}
            </span>
          ) : <span className="text-gray-300">—</span>}
        </td>
        <td className="py-2 px-2 text-right tabular-nums text-xs text-gray-400">
          {overdue > 0 && <span className="text-red-500 font-semibold">{fmtBRL(overdue)}</span>}
        </td>
        <td className="py-2 px-2 text-center">
          {node.pddRate && (
            <span className="text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded font-medium">
              PDD {(node.pddRate * 100).toFixed(1)}%
            </span>
          )}
        </td>
        <td className="py-2 px-2 text-center">
          {node.isLeaf && !node.isDeductible && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddAR(node.code, node.label); }}
              title="Nova AR nesta conta"
              className="p-1 text-brand-500 hover:bg-brand-50 rounded transition-colors"
            >
              <Plus size={11} />
            </button>
          )}
        </td>
      </tr>
      {hasChildren && isExpanded &&
        node.children!.map((child) => (
          <CoaRow
            key={child.code}
            node={child}
            depth={depth + 1}
            balances={balances}
            onAddAR={onAddAR}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  bu_code:       "JACQES" as BuCode,
  customer_name: "",
  description:   "",
  category:      "Serviço Recorrente",
  cost_center:   "",
  reference_doc: "",
  account_code:  "",
  issue_date:    new Date().toISOString().slice(0, 10),
  due_date:      "",
  gross_amount:  "",
  installments:  "1",
};

export default function ARCadastroPage() {
  const [items,      setItems]      = useState<ARItem[]>([]);
  const [pipeline,   setPipeline]   = useState<Pipeline | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [expanded,   setExpanded]   = useState<Set<string>>(
    new Set(["1.1.2.0.0.0", "1.1.2.1.0.0", "1.1.2.2.0.0", "1.1.2.3.0.0", "1.1.2.4.0.0", "1.1.2.5.0.0", "1.1.2.6.0.0"])
  );
  const [costCenters, setCostCenters] = useState<{ id: string; code: string; name: string }[]>([]);
  const [customers,   setCustomers]   = useState<{ id: string; name: string; doc?: string }[]>([]);

  const gross        = parseFloat(form.gross_amount) || 0;
  const fiscalPrev   = gross > 0 ? calcFiscal(gross, form.category) : null;
  const balances     = computeCoaBalances(items);

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, pipeRes, ccRes, custRes] = await Promise.all([
        fetch("/api/epm/ar"),
        fetch("/api/epm/ar/pipeline"),
        fetch("/api/epm/cost-centers"),
        fetch("/api/epm/customers"),
      ]);
      const iJ = await itemsRes.json();
      const pJ = await pipeRes.json();
      const cJ = await ccRes.json();
      const uJ = await custRes.json();
      if (iJ.success) setItems(iJ.data);
      if (pJ.success) setPipeline(pJ.data);
      if (cJ.success) setCostCenters(cJ.data);
      if (uJ.success) setCustomers(uJ.data);
    } catch { /* keep empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function onToggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function onAddAR(code: string, label: string) {
    setForm((f) => ({ ...f, account_code: code, description: label }));
    setShowForm(true);
    setTimeout(() => document.getElementById("ar-form-top")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gross || gross <= 0) return;
    const n = parseInt(form.installments) || 1;
    setSubmitting(true);
    try {
      const payload = {
        bu_code:       form.bu_code,
        customer_name: form.customer_name,
        description:   form.description,
        category:      form.category,
        cost_center:   form.cost_center || undefined,
        reference_doc: form.reference_doc || undefined,
        account_code:  form.account_code || undefined,
        issue_date:    form.issue_date,
        due_date:      form.due_date,
        gross_amount:  gross,
      };
      const endpoint = n > 1 ? "/api/epm/ar/installments" : "/api/epm/ar";
      const body     = n > 1 ? { ...payload, total_installments: n } : payload;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        await loadData();
      }
    } finally { setSubmitting(false); }
  }

  const pl = pipeline;

  return (
    <>
      <Header
        title="Cadastro de AR — Plano de Contas"
        subtitle="EPM · Contas a Receber · 1.1.2.x.x.x"
      />
      <div className="page-container">
        <ARTabNav />

        {/* ── Pipeline CI/CD visualization ──────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
            Pipeline CI/CD
            <span className="text-gray-300 normal-case tracking-normal font-normal">
              — AR Cadastro → Conciliação → DFC → DRE → Balanço
            </span>
          </h2>
          <div className="flex flex-wrap gap-2 items-stretch">
            {/* Cadastro */}
            <PipelineStep
              icon={Receipt}
              label="Cadastro AR"
              value={`${items.filter((i) => i.status !== "CANCELLED").length} lançamentos`}
              sub={`${items.filter((i) => i.account_code).length} com conta CoA`}
              pill={items.filter((i) => !i.account_code && i.status !== "CANCELLED").length > 0
                ? `${items.filter((i) => !i.account_code && i.status !== "CANCELLED").length} sem conta`
                : undefined}
              pillColor="bg-amber-100 text-amber-700"
            />

            <div className="self-center text-gray-300"><ArrowRight size={16} /></div>

            {/* Conciliação */}
            <PipelineStep
              icon={Clock}
              label="Conciliação"
              value={pl ? fmtBRL(pl.conciliacao.pendingAmount) : "—"}
              sub={pl ? `${pl.conciliacao.pendingCount} pendentes` : "carregando…"}
              pill={pl && pl.conciliacao.overdueCount > 0 ? `${pl.conciliacao.overdueCount} vencidos` : undefined}
              pillColor="bg-red-100 text-red-700"
              to="/awq/epm/bank-reconciliation"
            />

            <div className="self-center text-gray-300"><ArrowRight size={16} /></div>

            {/* DFC */}
            <PipelineStep
              icon={Banknote}
              label="DFC (Caixa)"
              value={pl ? fmtBRL(pl.dfc.receivedThisMonthAmount) : "—"}
              sub={pl ? `recebido este mês · esperado: ${fmtBRL(pl.dfc.pendingThisMonthAmount)}` : "carregando…"}
              to="/awq/epm/dfc"
            />

            <div className="self-center text-gray-300"><ArrowRight size={16} /></div>

            {/* DRE */}
            <PipelineStep
              icon={TrendingUp}
              label="DRE (Competência)"
              value={pl ? fmtBRL(pl.dre.netThisMonth) : "—"}
              sub={pl ? `líq. este mês · YTD: ${fmtBRL(pl.dre.netYtd)}` : "carregando…"}
              pill={pl && pl.dre.issThisMonth > 0
                ? `ISS/PIS/COF: ${fmtBRL(pl.dre.issThisMonth)}`
                : undefined}
              pillColor="bg-brand-100 text-brand-700"
              to="/awq/epm/pl"
            />

            <div className="self-center text-gray-300"><ArrowRight size={16} /></div>

            {/* Balanço */}
            <PipelineStep
              icon={Scale}
              label="Balanço (AR líq.)"
              value={pl ? fmtBRL(pl.balanco.netAr) : "—"}
              sub={pl ? `bruto ${fmtBRL(pl.balanco.grossAr)} · PDD (${fmtBRL(pl.balanco.pddEstimate)})` : "carregando…"}
              pill={pl && pl.balanco.overdueAr > 0 ? `Venc: ${fmtBRL(pl.balanco.overdueAr)}` : undefined}
              pillColor="bg-red-100 text-red-700"
              to="/awq/epm/balance-sheet"
            />
          </div>
        </section>

        {/* ── Overdue alert ─────────────────────────────────────────── */}
        {pl && pl.conciliacao.overdueCount > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="text-red-600 mt-0.5 shrink-0" />
            <div className="text-xs text-red-700">
              <span className="font-semibold">{pl.conciliacao.overdueCount} faturas vencidas</span>
              {" · "}{fmtBRL(pl.conciliacao.overdueAmount)} · Acionar cobrança em{" "}
              <Link href="/awq/epm/ar/collections" className="underline">Cobrança →</Link>
            </div>
          </div>
        )}

        {/* ── Balanço by group ──────────────────────────────────────── */}
        {pl && pl.balanco.byAccountGroup.length > 0 && (
          <div className="card p-4">
            <h2 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 size={13} className="text-brand-500" /> AR por grupo — Balanço Patrimonial
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-400">
                    <th className="py-1.5 pr-3 font-semibold">Grupo</th>
                    <th className="py-1.5 px-2 text-right font-semibold">Bruto</th>
                    <th className="py-1.5 px-2 text-right font-semibold text-brand-600">PDD</th>
                    <th className="py-1.5 px-2 text-right font-semibold text-emerald-700">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {pl.balanco.byAccountGroup.map((g) => (
                    <tr key={g.code} className="border-b border-gray-50">
                      <td className="py-1.5 pr-3 text-gray-600">{g.label}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-gray-600">{fmtBRL(g.gross)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-brand-600">({fmtBRL(g.pdd)})</td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-emerald-700">{fmtBRL(g.net)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-gray-200">
                    <td className="py-2 pr-3 text-gray-800">TOTAL</td>
                    <td className="py-2 px-2 text-right tabular-nums">{fmtBRL(pl.balanco.grossAr)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-brand-700">({fmtBRL(pl.balanco.pddEstimate)})</td>
                    <td className="py-2 px-2 text-right tabular-nums text-emerald-700">{fmtBRL(pl.balanco.netAr)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Form toggle ───────────────────────────────────────────── */}
        <div id="ar-form-top" className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Plano de Contas 1.1.2 — AR</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Nova AR"}
          </button>
        </div>

        {/* ── Registration form ─────────────────────────────────────── */}
        {showForm && (
          <form onSubmit={handleSubmit} className="card p-5 border-2 border-brand-200 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Novo Lançamento AR</h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Account CoA selector */}
              <div className="col-span-2">
                <label className="block font-semibold text-gray-600 mb-1">
                  Conta do Plano de Contas (1.1.2.x.x.x) *
                </label>
                <select
                  required
                  value={form.account_code}
                  onChange={(e) => setForm((f) => ({ ...f, account_code: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">— Selecione a conta —</option>
                  {LEAF_ACCOUNTS.map((acc) => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} — {acc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Business Unit</label>
                <select value={form.bu_code}
                  onChange={(e) => setForm((f) => ({ ...f, bu_code: e.target.value as BuCode }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {BUS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Cliente *</label>
                <input required list="cad-cust-list" type="text" value={form.customer_name}
                  onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                <datalist id="cad-cust-list">
                  {customers.map((c) => <option key={c.id} value={c.name}>{c.doc ? `${c.name} — ${c.doc}` : c.name}</option>)}
                </datalist>
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-gray-600 mb-1">Descrição *</label>
                <input required type="text" value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Retainer JACQES Tier 1 — mai/2026"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Categoria</label>
                <select value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}{AR_SVC_CATS.has(c) ? " (ISS+PIS+COFINS)" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Centro de Custo</label>
                <select value={form.cost_center}
                  onChange={(e) => setForm((f) => ({ ...f, cost_center: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  <option value="">— Nenhum —</option>
                  {costCenters.map((cc) => <option key={cc.id} value={cc.code}>{cc.code} · {cc.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Emissão</label>
                <input type="date" value={form.issue_date}
                  onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Vencimento *</label>
                <input required type="date" value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Referência (NF, contrato…)</label>
                <input type="text" value={form.reference_doc}
                  onChange={(e) => setForm((f) => ({ ...f, reference_doc: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Valor Bruto (R$) *</label>
                <input required type="number" step="0.01" min="0.01" value={form.gross_amount}
                  onChange={(e) => setForm((f) => ({ ...f, gross_amount: e.target.value }))}
                  placeholder="0,00"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Parcelas</label>
                <select value={form.installments}
                  onChange={(e) => setForm((f) => ({ ...f, installments: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                    <option key={n} value={n}>{n === 1 ? "À vista (1x)" : `${n}× mensais`}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fiscal preview */}
            {fiscalPrev && gross > 0 && fiscalPrev.total > 0 && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-xs space-y-2">
                <div className="font-semibold text-brand-800 flex items-center gap-1.5">
                  <Receipt size={11} /> Tributos (ISS 5% + PIS 0,65% + COFINS 3%)
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "ISS",    v: fiscalPrev.iss },
                    { label: "PIS",    v: fiscalPrev.pis },
                    { label: "COFINS", v: fiscalPrev.cofins },
                    { label: "Líquido", v: fiscalPrev.net },
                  ].map((t) => (
                    <div key={t.label} className="bg-white rounded-lg py-2 border border-brand-100">
                      <div className="text-[9px] text-gray-400 font-medium">{t.label}</div>
                      <div className={`font-bold tabular-nums ${t.label === "Líquido" ? "text-emerald-700" : "text-brand-700"}`}>
                        {fmtBRL(t.v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors">
              {submitting ? "Registrando…" : parseInt(form.installments) > 1
                ? `Parcelar em ${form.installments}× — ${fmtBRL(r2(gross / parseInt(form.installments)))} cada`
                : "Registrar — entrada no pipeline CI/CD"}
            </button>
          </form>
        )}

        {/* ── CoA Tree ──────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-2 text-gray-400 font-semibold w-36">Código</th>
                  <th className="py-2.5 px-2 text-gray-500 font-semibold">Conta</th>
                  <th className="py-2.5 px-2 text-right text-gray-500 font-semibold w-32">A Receber</th>
                  <th className="py-2.5 px-2 text-right text-red-500 font-semibold w-28">Vencido</th>
                  <th className="py-2.5 px-2 text-center text-brand-500 font-semibold w-24">PDD</th>
                  <th className="py-2.5 px-2 text-center text-gray-400 font-semibold w-10">+</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400">Carregando…</td>
                  </tr>
                ) : (
                  <CoaRow
                    node={AR_COA_TREE}
                    depth={0}
                    balances={balances}
                    onAddAR={onAddAR}
                    expanded={expanded}
                    onToggle={onToggle}
                  />
                )}
              </tbody>
            </table>
          </div>

          {/* Unclassified items */}
          {balances["__unclassified__"]?.count > 0 && (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle size={12} />
              <span>
                <strong>{balances["__unclassified__"].count} lançamentos sem conta CoA</strong>
                {" · "}{fmtBRL(balances["__unclassified__"].pending + balances["__unclassified__"].overdue)}
                {" · "}
                <Link href="/awq/epm/ar" className="underline">Classificar em Lançamentos →</Link>
              </span>
            </div>
          )}
        </div>

        {/* ── Top pending in conciliação ─────────────────────────────── */}
        {pl && pl.conciliacao.topPending.length > 0 && (
          <div className="card p-4">
            <h2 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock size={13} className="text-amber-500" />
              Próximos recebimentos aguardando match bancário
            </h2>
            <div className="space-y-1.5">
              {pl.conciliacao.topPending.map((item) => {
                const overdue = item.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <div key={item.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {overdue
                        ? <AlertCircle size={11} className="text-red-500 shrink-0" />
                        : <CheckCircle2 size={11} className="text-amber-400 shrink-0" />}
                      <span className="font-medium text-gray-700 truncate">{item.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`tabular-nums font-semibold ${overdue ? "text-red-600" : "text-gray-700"}`}>
                        {fmtBRL(item.net_amount)}
                      </span>
                      <span className="text-gray-400">{fmtDate(item.due_date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/awq/epm/bank-reconciliation" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
              Abrir conciliação bancária <ArrowRight size={10} />
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/ar" className="text-brand-600 hover:underline">Lançamentos AR</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/ar/aging" className="text-brand-600 hover:underline">Aging →</Link>
        </div>
      </div>
    </>
  );
}
