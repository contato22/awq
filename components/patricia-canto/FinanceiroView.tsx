"use client";

import { useMemo, useState } from "react";
import type { Lancamento, TipoLancamento } from "@/lib/patricia-canto/financeiro";
import { computeDfc, computeDre, isOverdue } from "@/lib/patricia-canto/financeiro";
import type { SalesGoals } from "@/lib/patricia-canto/goals";
import { computeGoalProgress } from "@/lib/patricia-canto/goals";
import type { BusinessUnit } from "@/lib/patricia-canto/business-units";
import type { NewLancamentoInput } from "./AddLancamentoModal";
import AddLancamentoModal from "./AddLancamentoModal";
import LancamentoModal from "./LancamentoModal";
import StatTile from "./StatTile";
import GaugeChart from "./GaugeChart";
import HorizontalBarChart from "./HorizontalBarChart";
import VerticalBarChart from "./VerticalBarChart";

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
  salesGoals,
  businessUnits,
}: {
  lancamentos: Lancamento[];
  onAdd: (item: NewLancamentoInput) => void;
  onSave: (item: Lancamento) => void;
  onDelete: (id: string) => void;
  salesGoals: SalesGoals;
  businessUnits: BusinessUnit[];
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
          <>
            <FluxoDeVendas lancamentos={lancamentos} />
            <LancamentosTable tipo="receita" lancamentos={lancamentos} onOpen={setOpenId} />
            <RecebimentoDetalhamento lancamentos={lancamentos} salesGoals={salesGoals} />
          </>
        )}
        {subTab === "pagar" && <LancamentosTable tipo="despesa" lancamentos={lancamentos} onOpen={setOpenId} />}
        {subTab === "dfc" && <DfcTable lancamentos={lancamentos} />}
        {subTab === "dre" && <DreTable lancamentos={lancamentos} />}
      </div>

      {open && (
        <LancamentoModal
          item={open}
          businessUnits={businessUnits}
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
          businessUnits={businessUnits}
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

type Granularidade = "diario" | "mensal" | "anual";

const GRANULARIDADE_LABEL: Record<Granularidade, string> = {
  diario: "Diário",
  mensal: "Mensal",
  anual: "Anual",
};

// Fluxo de vendas = regime de competência (dataVencimento), igual à definição
// de "vendas" usada nas Metas do mês — o negócio foi fechado nessa data,
// mesmo que o recebimento ainda não tenha caído. BU já vem filtrada de fora
// (seletor de unidade no cabeçalho do board), então não duplicamos o filtro aqui.
function FluxoDeVendas({ lancamentos }: { lancamentos: Lancamento[] }) {
  const [granularidade, setGranularidade] = useState<Granularidade>("mensal");
  const [mesSelecionado, setMesSelecionado] = useState<string>("");

  const vendas = useMemo(() => lancamentos.filter((l) => l.tipo === "receita"), [lancamentos]);

  const meses = useMemo(
    () => [...new Set(vendas.map((l) => l.dataVencimento.slice(0, 7)))].sort().reverse(),
    [vendas],
  );

  const flowData = useMemo(() => {
    const now = new Date();
    if (granularidade === "diario") {
      const buckets: { key: string; label: string; value: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        buckets.push({
          key: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          value: 0,
        });
      }
      const map = new Map(buckets.map((b) => [b.key, b]));
      for (const l of vendas) {
        const b = map.get(l.dataVencimento.slice(0, 10));
        if (b) b.value += l.valor;
      }
      return buckets;
    }
    if (granularidade === "anual") {
      const anos = vendas.length > 0 ? vendas.map((l) => Number(l.dataVencimento.slice(0, 4))) : [now.getFullYear()];
      const minAno = Math.min(...anos, now.getFullYear());
      const maxAno = Math.max(...anos, now.getFullYear());
      const buckets: { key: string; label: string; value: number }[] = [];
      for (let ano = minAno; ano <= maxAno; ano++) buckets.push({ key: String(ano), label: String(ano), value: 0 });
      const map = new Map(buckets.map((b) => [b.key, b]));
      for (const l of vendas) {
        const b = map.get(l.dataVencimento.slice(0, 4));
        if (b) b.value += l.valor;
      }
      return buckets;
    }
    // mensal — últimos 12 meses
    const buckets: { key: string; label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
        value: 0,
      });
    }
    const map = new Map(buckets.map((b) => [b.key, b]));
    for (const l of vendas) {
      const b = map.get(l.dataVencimento.slice(0, 7));
      if (b) b.value += l.valor;
    }
    return buckets;
  }, [vendas, granularidade]);

  const relatorioMes = useMemo(() => {
    if (!mesSelecionado) return null;
    const items = vendas.filter((l) => l.dataVencimento.slice(0, 7) === mesSelecionado);
    const total = items.reduce((sum, l) => sum + l.valor, 0);
    const fechados = items.filter((l) => l.status === "liquidado").length;
    return {
      items: items.sort((a, b) => b.valor - a.valor),
      total,
      quantidade: items.length,
      ticketMedio: items.length > 0 ? total / items.length : 0,
      fechados,
    };
  }, [vendas, mesSelecionado]);

  return (
    <div className="mb-6 rounded-xl border border-canto-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-canto-serif text-base font-semibold text-canto-900">Fluxo de Vendas</h3>
          <p className="mt-0.5 text-xs text-canto-500">Regime de competência (data de vencimento)</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-canto-100 p-1">
          {(Object.keys(GRANULARIDADE_LABEL) as Granularidade[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularidade(g)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                granularidade === g ? "bg-white text-canto-900 shadow-sm" : "text-canto-600 hover:text-canto-900"
              }`}
            >
              {GRANULARIDADE_LABEL[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <VerticalBarChart data={flowData} formatValue={currency} color="#847455" />
      </div>

      <div className="mt-5 border-t border-canto-line pt-4">
        <label className="text-xs text-canto-500">
          Relatório de um mês específico
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500 sm:inline-block"
          >
            <option value="">Selecione um mês...</option>
            {meses.map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </label>

        {relatorioMes && (
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Total vendido" value={currency(relatorioMes.total)} variant="accent" />
              <StatTile label="Qtd. de vendas" value={relatorioMes.quantidade.toString()} />
              <StatTile label="Ticket médio" value={currency(relatorioMes.ticketMedio)} />
              <StatTile label="Já recebidos" value={`${relatorioMes.fechados}/${relatorioMes.quantidade}`} />
            </div>
            <div className="mt-3 overflow-x-auto rounded-lg border border-canto-line">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-canto-line text-left text-xs uppercase tracking-wide text-canto-500">
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Vencimento</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioMes.items.map((l) => (
                    <tr key={l.id} className="border-b border-canto-line/60 last:border-0">
                      <td className="px-3 py-2 text-canto-900">{l.contraparte}</td>
                      <td className="px-3 py-2 text-canto-500">{formatDate(l.dataVencimento)}</td>
                      <td className="px-3 py-2 text-canto-500">{l.status === "liquidado" ? "Recebido" : "Pendente"}</td>
                      <td className="px-3 py-2 font-semibold text-canto-900">{currency(l.valor)}</td>
                    </tr>
                  ))}
                  {relatorioMes.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-xs text-canto-500">
                        Nenhuma venda nesse mês
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecebimentoDetalhamento({ lancamentos, salesGoals }: { lancamentos: Lancamento[]; salesGoals: SalesGoals }) {
  const receitas = useMemo(() => lancamentos.filter((l) => l.tipo === "receita"), [lancamentos]);
  const goalProgress = useMemo(() => computeGoalProgress(lancamentos, salesGoals), [lancamentos, salesGoals]);
  const dfcRows = useMemo(() => computeDfc(lancamentos).slice(-6), [lancamentos]);

  const porCliente = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of receitas.filter((l) => l.status === "liquidado")) {
      map.set(l.contraparte, (map.get(l.contraparte) ?? 0) + l.valor);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [receitas]);

  const proximos = useMemo(
    () =>
      receitas
        .filter((l) => l.status === "pendente" && !isOverdue(l))
        .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
        .slice(0, 5),
    [receitas],
  );

  return (
    <div className="mt-6 space-y-4">
      <div>
        <h3 className="font-canto-serif text-lg text-canto-900">Detalhamento de Recebimentos</h3>
        <p className="mt-0.5 text-xs text-canto-500">Meta do mês, histórico de caixa e previsão dos próximos recebimentos</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-xl border border-canto-line bg-white p-5">
          <GaugeChart
            label="Recebido no mês"
            value={currency(goalProgress.recebidoDoMes)}
            pct={goalProgress.pctRecebimento}
            color="#847455"
            size={160}
          />
          <p className="mt-2 text-center text-xs text-canto-500">
            Meta: {currency(salesGoals.metaRecebimentoMensal)} ({goalProgress.pctRecebimento.toFixed(0)}%)
          </p>
        </div>

        <div className="rounded-xl border border-canto-line bg-white p-5">
          <p className="text-sm font-semibold text-canto-900">Recebido por mês</p>
          <p className="mt-0.5 text-xs text-canto-500">Regime de caixa — últimos meses com liquidação</p>
          <div className="mt-3">
            <HorizontalBarChart
              data={dfcRows.map((r) => ({
                label: r.label,
                value: r.entradas,
                displayValue: currency(r.entradas),
                color: "#8FA890",
              }))}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-canto-line bg-white p-5">
          <p className="text-sm font-semibold text-canto-900">Top clientes (recebido)</p>
          <ul className="mt-3 space-y-2">
            {porCliente.map(([cliente, valor]) => (
              <li key={cliente} className="flex items-center justify-between text-sm">
                <span className="text-canto-700">{cliente}</span>
                <span className="font-semibold text-canto-900">{currency(valor)}</span>
              </li>
            ))}
            {porCliente.length === 0 && <p className="text-xs text-canto-500">Nenhum recebimento ainda.</p>}
          </ul>
        </div>

        <div className="rounded-xl border border-canto-line bg-white p-5">
          <p className="text-sm font-semibold text-canto-900">Próximos recebimentos esperados</p>
          <ul className="mt-3 space-y-2">
            {proximos.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-canto-900">{l.contraparte}</p>
                  <p className="text-xs text-canto-500">{formatDate(l.dataVencimento)}</p>
                </div>
                <span className="shrink-0 font-semibold text-canto-700">{currency(l.valor)}</span>
              </li>
            ))}
            {proximos.length === 0 && <p className="text-xs text-canto-500">Nenhum recebimento previsto.</p>}
          </ul>
        </div>
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
