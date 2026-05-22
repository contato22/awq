"use client";

// ReconcileDrawer — slide-in panel for linking a bank transaction to AP/AR
// Opens when user clicks "Vincular" on a pending bank transaction.
// Flow: suggest matches → select or create AP/AR → mark as conciliado

import { useEffect, useMemo, useState, useRef } from "react";
import { X, Search, Plus, ChevronDown, Check, Loader2, ArrowUpRight, ArrowDownRight, AlertCircle } from "lucide-react";
import type { BankTransaction, ManagerialCategory } from "@/lib/financial-db";
import { fmtDate } from "@/lib/utils";
import { getLeafAccounts } from "@/lib/ar-coa";

// ─── Types ────────────────────────────────────────────────────────────────────

interface APItem {
  id: string; bu_code: string; supplier_name: string; description: string;
  category: string; due_date: string; gross_amount: number; net_amount: number;
  status: string; paid_date?: string; supplier_doc?: string;
}
interface ARItem {
  id: string; bu_code: string; customer_name: string; description: string;
  category: string; due_date: string; gross_amount: number; net_amount: number;
  status: string; received_date?: string; customer_doc?: string;
}
type APARItem = (APItem & { _type: "AP" }) | (ARItem & { _type: "AR" });

interface Candidate { item: APARItem; score: number; amtDiff: number; daysDiff: number }

interface Props {
  transaction: BankTransaction;
  isStatic?: boolean;
  onClose: () => void;
  onConciliado: (txId: string, updatedTx?: Partial<BankTransaction>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CAT_LABELS: Partial<Record<ManagerialCategory, string>> = {
  receita_recorrente: "Receita Recorrente", receita_projeto: "Receita de Projeto",
  receita_consultoria: "Consultoria", receita_producao: "Produção",
  receita_social_media: "Social Media", receita_revenue_share: "Revenue Share",
  receita_fee_venture: "Fee Venture", receita_eventual: "Receita Eventual",
  rendimento_financeiro: "Rendimento Financeiro", aporte_socio: "Aporte de Sócio",
  transferencia_interna_recebida: "Transf. Interna Recebida",
  ajuste_bancario_credito: "Ajuste Bancário",
  recebimento_ambiguo: "Recebimento (Revisar)",
  fornecedor_operacional: "Fornecedor", freelancer_terceiro: "Freelancer",
  folha_remuneracao: "Folha de Pagamento", prolabore_retirada: "Pró-labore",
  imposto_tributo: "Impostos/Tributos", juros_multa_iof: "Juros/Multa/IOF",
  tarifa_bancaria: "Tarifa Bancária", software_assinatura: "Software/Assinatura",
  marketing_midia: "Marketing/Mídia", deslocamento_combustivel: "Deslocamento",
  alimentacao_representacao: "Alimentação", viagem_hospedagem: "Viagem",
  aluguel_locacao: "Aluguel/Locação", energia_agua_internet: "Energia/Água/Internet",
  servicos_contabeis_juridicos: "Contábil/Jurídico",
  cartao_compra_operacional: "Cartão Operacional",
  despesa_pessoal_misturada: "Despesa Pessoal", aplicacao_financeira: "Aplicação",
  resgate_financeiro: "Resgate", transferencia_interna_enviada: "Transf. Enviada",
  reserva_limite_cartao: "Reserva Cartão", despesa_ambigua: "Despesa (Revisar)",
  unclassified: "Não classificado",
};

const ALL_CATS = (Object.entries(CAT_LABELS) as [ManagerialCategory, string][])
  .map(([value, label]) => ({ value, label }));

function getName(item: APARItem): string {
  return item._type === "AP" ? (item as APItem).supplier_name : (item as ARItem).customer_name;
}

function getDueDate(item: APARItem): string {
  return item._type === "AP" ? (item as APItem).due_date : (item as ARItem).due_date;
}

function scoreCandidate(tx: BankTransaction, item: APARItem): Candidate {
  const txAmt = Math.abs(tx.amount);
  const itemAmt = item._type === "AP"
    ? (item as APItem).net_amount
    : (item as ARItem).net_amount;
  const amtDiff = Math.abs(txAmt - itemAmt);
  const amtRatio = amtDiff / Math.max(txAmt, 1);
  const txDate = new Date(tx.transactionDate + "T12:00:00").getTime();
  const dueDate = new Date(getDueDate(item) + "T12:00:00").getTime();
  const daysDiff = Math.abs(txDate - dueDate) / (1000 * 86400);
  const score = (1 - Math.min(amtRatio, 1)) * 0.7 + (1 - Math.min(daysDiff / 30, 1)) * 0.3;
  return { item, score, amtDiff, daysDiff };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReconcileDrawer({ transaction: tx, isStatic = false, onClose, onConciliado }: Props) {
  const isCredit = tx.direction === "credit";

  const [allItems, setAllItems]       = useState<APARItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchErr, setFetchErr]       = useState<string | null>(null);

  // UI state
  const [search, setSearch]           = useState("");
  const [filterTab, setFilterTab]     = useState<"sugeridos" | "todos" | "criar">("sugeridos");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saveErr, setSaveErr]         = useState<string | null>(null);

  // Category override (edit category before conciling)
  const [category, setCategory]       = useState<ManagerialCategory>(tx.managerialCategory);
  const [counterparty, setCounterparty] = useState(tx.counterpartyName ?? "");

  // Create form state
  const [createType, setCreateType]       = useState<"AP" | "AR">(isCredit ? "AR" : "AP");
  const [createDesc, setCreateDesc]       = useState(tx.descriptionOriginal);
  const [createParty, setCreateParty]     = useState(tx.counterpartyName ?? "");
  const [createDue, setCreateDue]         = useState(tx.transactionDate);
  const [createAmt, setCreateAmt]         = useState(String(Math.abs(tx.amount)));
  const [createCat, setCreateCat]         = useState(tx.managerialCategory === "unclassified" ? "" : (CAT_LABELS[tx.managerialCategory] ?? ""));
  const [createAccCode, setCreateAccCode] = useState("");
  const [creating, setCreating]           = useState(false);
  const arLeafAccounts = useMemo(() => getLeafAccounts(), []);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch AP/AR on mount
  useEffect(() => {
    if (isStatic) { setLoading(false); return; }
    void (async () => {
      try {
        const [apRes, arRes] = await Promise.all([
          fetch("/api/epm/ap"),
          fetch("/api/epm/ar"),
        ]);
        const apData = apRes.ok ? (await apRes.json() as { success: boolean; data: APItem[] }) : null;
        const arData = arRes.ok ? (await arRes.json() as { success: boolean; data: ARItem[] }) : null;
        const aps: APARItem[] = (apData?.data ?? [])
          .filter((a) => a.status !== "PAID" && a.status !== "CANCELLED")
          .map((a) => ({ ...a, _type: "AP" as const }));
        const ars: APARItem[] = (arData?.data ?? [])
          .filter((a) => a.status !== "RECEIVED" && a.status !== "CANCELLED")
          .map((a) => ({ ...a, _type: "AR" as const }));
        setAllItems([...aps, ...ars]);
      } catch (e) {
        setFetchErr(e instanceof Error ? e.message : "Erro ao buscar AP/AR");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus search on tab switch
  useEffect(() => {
    if (filterTab === "todos") searchRef.current?.focus();
  }, [filterTab]);

  const filteredAll = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allItems;
    return allItems.filter((item) =>
      getName(item).toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      String(item.gross_amount).includes(q)
    );
  }, [search, allItems]);

  const selectedItem = allItems.find((i) => i.id === selectedItemId) ?? null;

  // Score all items once; reused in both "sugeridos" and "todos" tabs
  const scoreMap = useMemo(() => {
    const m = new Map<string, { score: number; amtDiff: number; daysDiff: number }>();
    for (const item of allItems) {
      const { score, amtDiff, daysDiff } = scoreCandidate(tx, item);
      m.set(item.id, { score, amtDiff, daysDiff });
    }
    return m;
  }, [allItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const candidates = useMemo(() => {
    const expected = isCredit ? "AR" : "AP";
    return allItems
      .filter((item) => item._type === expected)
      .map((item) => ({ item, ...(scoreMap.get(item.id) ?? { score: 0, amtDiff: 0, daysDiff: 0 }) }))
      .sort((a, b) => b.score - a.score);
  }, [allItems, scoreMap, isCredit]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  function buildPatch(): Partial<BankTransaction> {
    return {
      reconciliationStatus: "conciliado",
      managerialCategory: category,
      counterpartyName: counterparty || tx.counterpartyName,
      classifiedAt: new Date().toISOString(),
    };
  }

  async function handleConciliarDireto() {
    setSaving(true); setSaveErr(null);
    try {
      const patch = buildPatch();
      if (!isStatic) {
        const res = await fetch(`/api/transactions/${tx.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Falha ao salvar");
      }
      onConciliado(tx.id, patch);
      onClose();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function handleVincularEConciliar() {
    if (!selectedItem) return;
    setSaving(true); setSaveErr(null);
    try {
      const patch = buildPatch();
      if (!isStatic) {
        // 1. Update bank transaction
        const txRes = await fetch(`/api/transactions/${tx.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!txRes.ok) throw new Error("Falha ao atualizar transação");

        // 2. Mark AP/AR as paid/received
        const apiPath = selectedItem._type === "AP" ? "/api/epm/ap" : "/api/epm/ar";
        const action  = selectedItem._type === "AP" ? "pay" : "receive";
        const dateField   = selectedItem._type === "AP" ? "paid_date"     : "received_date";
        const amtField    = selectedItem._type === "AP" ? "paid_amount"   : "received_amount";
        const refField    = selectedItem._type === "AP" ? "payment_ref"   : "receipt_ref";
        await fetch(apiPath, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedItem.id,
            action,
            [dateField]: tx.transactionDate,
            [amtField]: Math.abs(tx.amount),
            [refField]: tx.id,
          }),
        });
      }
      onConciliado(tx.id, patch);
      onClose();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function handleCriarEConciliar() {
    setCreating(true); setSaveErr(null);
    try {
      const grossAmt = parseFloat(createAmt.replace(",", "."));
      if (isNaN(grossAmt) || grossAmt <= 0) throw new Error("Valor inválido");
      if (!createParty.trim()) throw new Error("Nome da contraparte obrigatório");
      if (!isStatic) {
        if (createType === "AP") {
          const res = await fetch("/api/epm/ap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bu_code: tx.entity === "AWQ_Holding" ? "AWQ" : tx.entity,
              supplier_name: createParty,
              supplier_type: "other",
              description: createDesc,
              category: createCat || "outros",
              issue_date: tx.transactionDate,
              due_date: createDue,
              gross_amount: grossAmt,
              source_system: "conciliacao",
            }),
          });
          if (!res.ok) {
            const body = await res.json() as { error?: string };
            throw new Error(body.error ?? "Falha ao criar AP");
          }
        } else {
          const res = await fetch("/api/epm/ar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bu_code: tx.entity === "AWQ_Holding" ? "AWQ" : tx.entity,
              customer_name: createParty,
              description: createDesc,
              category: createCat || "outros",
              issue_date: tx.transactionDate,
              due_date: createDue,
              gross_amount: grossAmt,
              source_system: "conciliacao",
              ...(createAccCode ? { account_code: createAccCode } : {}),
            }),
          });
          if (!res.ok) {
            const body = await res.json() as { error?: string };
            throw new Error(body.error ?? "Falha ao criar AR");
          }
        }
      }
      // Then conciliar the bank transaction
      await handleConciliarDireto();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Erro");
      setCreating(false);
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const txAmt = Math.abs(tx.amount); // already in reais (cora-api.ts divides by 100 at source)
  const catLabel = CAT_LABELS[tx.managerialCategory] ?? tx.managerialCategory;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isCredit ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isCredit ? "bg-emerald-100" : "bg-red-100"}`}>
              {isCredit
                ? <ArrowUpRight size={18} className="text-emerald-600" />
                : <ArrowDownRight size={18} className="text-red-600" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {isCredit ? "Recebimento" : "Pagamento"} — {fmtDate(tx.transactionDate)}
              </p>
              <p className={`text-lg font-extrabold leading-tight ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                {isCredit ? "+" : "−"}{fmtBRL(txAmt)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors">
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Transaction detail strip */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
          <div>
            <span className="text-gray-400">Descrição: </span>
            <span className="text-gray-800 font-medium">{tx.descriptionOriginal}</span>
          </div>
          <div>
            <span className="text-gray-400">Banco: </span>
            <span className="text-gray-700">{tx.bank} · {tx.accountName}</span>
          </div>
          {tx.counterpartyName && (
            <div>
              <span className="text-gray-400">Contraparte: </span>
              <span className="text-gray-700 font-medium">{tx.counterpartyName}</span>
            </div>
          )}
          <div>
            <span className="text-gray-400">Categoria atual: </span>
            <span className="text-gray-700">{catLabel}</span>
          </div>
        </div>

        {/* Category + counterparty editable fields */}
        <div className="px-5 py-3 border-b border-gray-100 flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Categoria</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ManagerialCategory)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 pr-7 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 appearance-none"
              >
                {ALL_CATS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Contraparte</label>
            <input
              type="text"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder={tx.counterpartyName ?? "Nome do cliente/fornecedor"}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {([
            { id: "sugeridos", label: `Sugeridos${candidates.length > 0 ? ` (${candidates.slice(0,5).length})` : ""}` },
            { id: "todos",     label: "Buscar AP/AR" },
            { id: "criar",     label: "Criar lançamento" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                filterTab === t.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ── Sugeridos tab ── */}
          {filterTab === "sugeridos" && (
            <div className="space-y-2">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
                  <Loader2 size={16} className="animate-spin" /> Buscando lançamentos…
                </div>
              )}
              {fetchErr && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertCircle size={14} /> {fetchErr}
                </div>
              )}
              {isStatic && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                  Conexão com AP/AR não disponível em modo estático.
                </div>
              )}
              {!loading && !fetchErr && !isStatic && candidates.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 font-medium">Nenhum lançamento sugerido</p>
                  <p className="text-xs text-gray-400 mt-1">Tente buscar manualmente ou crie um novo lançamento.</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <button onClick={() => setFilterTab("todos")} className="text-xs text-blue-600 hover:underline">Buscar AP/AR</button>
                    <span className="text-gray-300">·</span>
                    <button onClick={() => setFilterTab("criar")} className="text-xs text-blue-600 hover:underline">Criar lançamento</button>
                  </div>
                </div>
              )}
              {candidates.slice(0, 8).map(({ item, score, amtDiff, daysDiff }) => (
                <CandidateCard
                  key={item.id} item={item} score={score} amtDiff={amtDiff} daysDiff={daysDiff}
                  selected={selectedItemId === item.id}
                  onSelect={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                />
              ))}
            </div>
          )}

          {/* ── Todos / buscar tab ── */}
          {filterTab === "todos" && (
            <div className="space-y-2">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, descrição ou valor…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
                  <Loader2 size={16} className="animate-spin" /> Carregando…
                </div>
              )}
              {!loading && filteredAll.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">Nenhum AP/AR aberto encontrado.</p>
              )}
              {filteredAll.map((item) => {
                const s = scoreMap.get(item.id) ?? { score: 0, amtDiff: 0, daysDiff: 0 };
                return (
                  <CandidateCard
                    key={item.id} item={item} score={s.score} amtDiff={s.amtDiff} daysDiff={s.daysDiff}
                    selected={selectedItemId === item.id}
                    onSelect={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                  />
                );
              })}
            </div>
          )}

          {/* ── Criar lançamento tab ── */}
          {filterTab === "criar" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Cria um novo lançamento em AP/AR e já o vincula a esta transação bancária.
              </p>

              {/* AP vs AR selector */}
              <div className="flex gap-2">
                {(["AP", "AR"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCreateType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      createType === t
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {t === "AP" ? "📤 A Pagar (AP)" : "📥 A Receber (AR)"}
                  </button>
                ))}
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                    {createType === "AP" ? "Fornecedor / Credor" : "Cliente / Devedor"}
                  </label>
                  <input
                    type="text" value={createParty} onChange={(e) => setCreateParty(e.target.value)}
                    placeholder={createType === "AP" ? "Nome do fornecedor" : "Nome do cliente"}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Descrição</label>
                  <input
                    type="text" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="Descrição do lançamento"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Vencimento</label>
                    <input
                      type="date" value={createDue} onChange={(e) => setCreateDue(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Valor (R$)</label>
                    <input
                      type="text" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)}
                      placeholder="0,00"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Categoria</label>
                  <input
                    type="text" value={createCat} onChange={(e) => setCreateCat(e.target.value)}
                    placeholder="ex: servicos, fornecedor, folha"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                {createType === "AR" && (
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                      Conta CoA (1.1.2)
                    </label>
                    <select
                      value={createAccCode}
                      onChange={(e) => setCreateAccCode(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                    >
                      <option value="">— selecione a conta AR —</option>
                      {arLeafAccounts.map((n) => (
                        <option key={n.code} value={n.code}>
                          {n.code} — {n.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {saveErr && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <AlertCircle size={12} /> {saveErr}
                </div>
              )}

              <button
                onClick={() => void handleCriarEConciliar()}
                disabled={creating || saving || !createParty.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {creating || saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Criar e Conciliar
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 flex items-center gap-3 bg-white">
          {saveErr && filterTab !== "criar" && (
            <p className="text-xs text-red-600 flex-1">{saveErr}</p>
          )}
          <div className="flex gap-2 ml-auto flex-wrap justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleConciliarDireto()}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="inline animate-spin" /> : null}
              {" "}Conciliar sem vincular
            </button>
            {(filterTab === "sugeridos" || filterTab === "todos") && selectedItem && (
              <button
                onClick={() => void handleVincularEConciliar()}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Vincular e Conciliar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── CandidateCard ────────────────────────────────────────────────────────────

function CandidateCard({
  item, score, amtDiff, daysDiff, selected, onSelect,
}: {
  item: APARItem; score: number; amtDiff: number; daysDiff: number;
  selected: boolean; onSelect: () => void;
}) {
  const isAP    = item._type === "AP";
  const name    = getName(item);
  const dueDate = getDueDate(item);
  const netAmt = item.net_amount;
  const pct = Math.round(score * 100);

  const quality =
    pct >= 85 ? { label: "Ótima correspondência", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" } :
    pct >= 60 ? { label: "Boa correspondência",   cls: "bg-blue-50 text-blue-700 border-blue-200" } :
                { label: "Correspondência parcial", cls: "bg-gray-50 text-gray-600 border-gray-200" };

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3.5 transition-all ${
        selected
          ? "border-blue-400 bg-blue-50 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
            {selected && <Check size={11} className="text-white" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${isAP ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                {isAP ? "AP" : "AR"}
              </span>
              <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Venc. {fmtDate(dueDate)} · {Math.round(daysDiff)} dias de diferença
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-800">{fmtBRL(netAmt)}</p>
          {amtDiff > 0 && (
            <p className="text-[10px] text-amber-600">Δ {fmtBRL(amtDiff)}</p>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium mt-1 inline-block ${quality.cls}`}>
            {quality.label}
          </span>
        </div>
      </div>
    </button>
  );
}
