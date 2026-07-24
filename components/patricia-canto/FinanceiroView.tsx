"use client";

import { useMemo, useState } from "react";
import type { Lancamento, TipoLancamento } from "@/lib/patricia-canto/financeiro";
import { computeDfc, computeDre, isOverdue } from "@/lib/patricia-canto/financeiro";
import type { NewLancamentoInput } from "./AddLancamentoModal";
import AddLancamentoModal from "./AddLancamentoModal";
import LancamentoModal from "./LancamentoModal";
import StatTile from "./StatTile";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

type SubTab = "receber" | "pagar" | "dfc" | "dre";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "receber", label: "Contas a Receber" },
  { id: "pagar", label: "Contas a Pagar" },
  { id: "dfc", label: "DFC" },
  { id: "dre", label: "DRE" },
];

export default function FinanceiroView({
  lancamentos,
  onAdd,
  onSave,
  onDelete,
}: {
  lancamentos: Lancamento[];
  onAdd: (item: NewLancamentoInput) => void;
  onSave: (item: Lancamento) => void;
  onDelete: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("receber");
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const open = lancamentos.find((l) => l.id === openId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-canto-100 p-1">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                subTab === t.id ? "bg-white text-canto-900 shadow-sm" : "text-canto-600 hover:text-canto-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {(subTab === "receber" || subTab === "pagar") && (
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-lg bg-canto-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canto-800"
          >
            + Novo lançamento
          </button>
        )}
      </div>

      <div className="mt-4">
        {subTab === "receber" && (
          <LancamentosTable tipo="receita" lancamentos={lancamentos} onOpen={setOpenId} />
        )}
        {subTab === "pagar" && <LancamentosTable tipo="despesa" lancamentos={lancamentos} onOpen={setOpenId} />}
        {subTab === "dfc" && <DfcTable lancamentos={lancamentos} />}
        {subTab === "dre" && <DreTable lancamentos={lancamentos} />}
      </div>

      {open && (
        <LancamentoModal
          item={open}
          onClose={() => setOpenId(null)}
          onSave={(item) => {
            onSave(item);
            setOpenId(null);
          }}
          onDelete={(id) => {
            onDelete(id);
            setOpenId(null);
          }}
        />
      )}
      {addOpen && (
        <AddLancamentoModal
          defaultTipo={subTab === "pagar" ? "despesa" : "receita"}
          onClose={() => setAddOpen(false)}
          onAdd={onAdd}
        />
      )}
    </div>
  );
}

function LancamentosTable({
  tipo,
  lancamentos,
  onOpen,
}: {
  tipo: TipoLancamento;
  lancamentos: Lancamento[];
  onOpen: (id: string) => void;
}) {
  const items = useMemo(
    () => lancamentos.filter((l) => l.tipo === tipo).sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)),
    [lancamentos, tipo],
  );

  const stats = useMemo(() => {
    const pendentes = items.filter((l) => l.status === "pendente");
    const atrasados = pendentes.filter((l) => isOverdue(l));
    const totalPendente = pendentes.reduce((s, l) => s + l.valor, 0);
    const totalAtrasado = atrasados.reduce((s, l) => s + l.valor, 0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const liquidadoNoMes = items
      .filter((l) => l.status === "liquidado" && l.dataLiquidacao?.slice(0, 7) === thisMonth)
      .reduce((s, l) => s + l.valor, 0);
    return { totalPendente, totalAtrasado, atrasadosCount: atrasados.length, liquidadoNoMes };
  }, [items]);

  const liquidadoLabel = tipo === "receita" ? "Recebido no mês" : "Pago no mês";
  const contraparteLabel = tipo === "receita" ? "Cliente" : "Fornecedor";

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={`Total pendente`} value={currency(stats.totalPendente)} />
        <StatTile
          label="Vencido"
          value={`${currency(stats.totalAtrasado)} (${stats.atrasadosCount})`}
          variant={stats.atrasadosCount > 0 ? "warn" : "default"}
        />
        <StatTile label={liquidadoLabel} value={currency(stats.liquidadoNoMes)} variant="accent" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-canto-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-canto-200 text-left text-xs uppercase tracking-wide text-canto-500">
              <th className="px-3 py-2">{contraparteLabel}</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => {
              const overdue = isOverdue(l);
              return (
                <tr
                  key={l.id}
                  onClick={() => onOpen(l.id)}
                  className="cursor-pointer border-b border-canto-100 last:border-0 hover:bg-canto-50"
                >
                  <td className="px-3 py-2 font-medium text-canto-900">{l.contraparte}</td>
                  <td className="px-3 py-2 text-canto-600">{l.descricao}</td>
                  <td className="px-3 py-2 text-canto-500">{l.categoria}</td>
                  <td className="px-3 py-2 text-canto-500">{formatDate(l.dataVencimento)}</td>
                  <td className="px-3 py-2 font-semibold text-canto-800">{currency(l.valor)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        l.status === "liquidado"
                          ? "bg-emerald-50 text-emerald-700"
                          : overdue
                            ? "bg-rose-50 text-rose-700"
                            : "bg-canto-100 text-canto-600"
                      }`}
                    >
                      {l.status === "liquidado" ? (tipo === "receita" ? "Recebido" : "Pago") : overdue ? "Vencido" : "Pendente"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-canto-500">
                  Nenhum lançamento ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DfcTable({ lancamentos }: { lancamentos: Lancamento[] }) {
  const rows = useMemo(() => computeDfc(lancamentos), [lancamentos]);
  return (
    <div className="rounded-xl border border-canto-200 bg-white p-4">
      <h3 className="font-canto-serif text-base font-semibold text-canto-900">
        Demonstração de Fluxo de Caixa (DFC)
      </h3>
      <p className="mt-1 text-xs text-canto-500">
        Regime de caixa — considera só o que já foi efetivamente pago/recebido, agrupado pelo mês da liquidação.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-canto-200 text-left text-xs uppercase tracking-wide text-canto-500">
              <th className="py-2 pr-3">Mês</th>
              <th className="py-2 pr-3">Entradas</th>
              <th className="py-2 pr-3">Saídas</th>
              <th className="py-2 pr-3">Saldo do mês</th>
              <th className="py-2 pr-3">Saldo acumulado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-b border-canto-100 last:border-0">
                <td className="py-2 pr-3 font-medium text-canto-900">{r.label}</td>
                <td className="py-2 pr-3 text-emerald-700">{currency(r.entradas)}</td>
                <td className="py-2 pr-3 text-rose-600">{currency(r.saidas)}</td>
                <td className={`py-2 pr-3 font-semibold ${r.saldoMes >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {currency(r.saldoMes)}
                </td>
                <td className="py-2 pr-3 font-semibold text-canto-900">{currency(r.saldoAcumulado)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-canto-500">
                  Nenhum lançamento liquidado ainda — marque contas como pagas/recebidas para ver o fluxo de caixa
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DreTable({ lancamentos }: { lancamentos: Lancamento[] }) {
  const rows = useMemo(() => computeDre(lancamentos), [lancamentos]);
  return (
    <div className="rounded-xl border border-canto-200 bg-white p-4">
      <h3 className="font-canto-serif text-base font-semibold text-canto-900">
        Demonstração de Resultado do Exercício (DRE)
      </h3>
      <p className="mt-1 text-xs text-canto-500">
        Regime de competência — considera todo lançamento pelo mês do vencimento, mesmo que ainda não tenha sido
        liquidado.
      </p>
      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.month} className="rounded-lg border border-canto-100 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-canto-900">{r.label}</p>
              <p className={`text-sm font-bold ${r.resultado >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                Resultado: {currency(r.resultado)}
                {r.margem != null && <span className="ml-1 font-normal text-canto-400">({r.margem.toFixed(0)}% margem)</span>}
              </p>
            </div>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <p className="text-canto-600">
                Receita: <span className="font-semibold text-emerald-700">{currency(r.receita)}</span>
              </p>
              <p className="text-canto-600">
                Despesa: <span className="font-semibold text-rose-600">{currency(r.despesa)}</span>
              </p>
            </div>
            {r.despesasPorCategoria.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-canto-500">
                {r.despesasPorCategoria.map(([cat, v]) => (
                  <li key={cat} className="flex justify-between">
                    <span>{cat}</span>
                    <span>{currency(v)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-xs text-canto-500">Nenhum lançamento ainda</p>}
      </div>
    </div>
  );
}
