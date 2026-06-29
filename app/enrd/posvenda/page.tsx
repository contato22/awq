// ─── /enrd/posvenda — Gestão Pós-venda/O&M Enerdy ────────────────────────────
// Ancorado na tese apurada: margem ≈ 0% a −2% (folha fixa vs faturamento ~16k);
// break-even em DEGRAU pelo bônus; gatilho do bônus ABAIXO do break-even (zona
// morta). Modelo de custeio rígido: variáveis por OS = material + combustível;
// folha NUNCA rateada por OS no número principal.
//
// Tipos de vazio: premissa de modelo (estimável, painel PREMISSAS) vs fato
// transacional (nunca estimado). Resultado mostrado em DOIS modos lado a lado.

import Header from "@/components/Header";
import EnrdPosVendaImport from "@/components/EnrdPosVendaImport";
import EnrdPosVendaConfigEditor from "@/components/EnrdPosVendaConfigEditor";
import {
  getOS,
  getConfig,
  kpiSubnotificacao,
  normalizeDate,
  type StoredOS,
} from "@/lib/enrd-posvenda-db";
import {
  getInstallations,
  getProximasLimpezas,
} from "@/lib/enrd-montagem-db";
import { getLiveMontagem, proximasLimpezas as liveProximas } from "@/lib/enrd-montagem-live";
import {
  contribuicaoOS,
  resultadoMes,
  resultadoPorMes,
  custoFixoSemBonus,
  custoFixoComBonus,
  classificarDono,
  kpiNaoCobrados,
  isRealizado,
  type OS,
  type OSContribuicao,
  type DonoOS,
} from "@/lib/enrd-posvenda-costing";
import { getLiveProjetosPosVenda } from "@/lib/enerdy-projetos";
import { getTransactionsByEntity } from "@/lib/financial-db";
import EnrdPosVendaChart, { type Series, type SeriePonto } from "@/components/EnrdPosVendaChart";
import type { PosVendaConfig } from "@/lib/enrd-posvenda-config";
import {
  premissasEstimadas,
  configSoReais,
  pctDependenteDeEstimativas,
  TEMPO_MEDIO_POR_TIPO,
} from "@/lib/enrd-posvenda-premissas";
import {
  AlertTriangle,
  TrendingDown,
  Wrench,
  CalendarClock,
  Users2,
  Gauge,
  Info,
  CircleDollarSign,
  FlaskConical,
} from "lucide-react";

export const dynamic = "force-dynamic";

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const PCT = (v: number) => `${(v * 100).toFixed(1)}%`;

// Monta as séries (diária/mensal/anual) do gráfico comparativo a partir das OS
// realizadas, das transações Cora (conciliação ENRD) e do custo fixo (degrau).
type SerieOS = { data: string | null; valor: number; contribuicao: number };
type SerieCora = { transactionDate: string; amount: number; excludedFromConsolidated: boolean };
function buildSeries(os: SerieOS[], cora: SerieCora[], config: PosVendaConfig): Series {
  const semBonus = custoFixoSemBonus(config);
  const comBonus = custoFixoComBonus(config);
  const fatMes = new Map<string, number>();
  for (const o of os) {
    if (!o.data) continue;
    const ym = o.data.slice(0, 7);
    fatMes.set(ym, (fatMes.get(ym) ?? 0) + o.valor);
  }
  const fixoMes = (ym: string) => ((fatMes.get(ym) ?? 0) > config.gatilhoBonus ? comBonus : semBonus);
  const diasNoMes = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  };
  // meses com atividade (OS ou Cora) → para somar o fixo no agregado anual
  const meses = new Set<string>();
  for (const o of os) if (o.data) meses.add(o.data.slice(0, 7));
  for (const t of cora) if (t.transactionDate) meses.add(t.transactionDate.slice(0, 7));
  const mesesPorAno = new Map<string, string[]>();
  for (const ym of meses) {
    const y = ym.slice(0, 4);
    (mesesPorAno.get(y) ?? mesesPorAno.set(y, []).get(y)!).push(ym);
  }

  function build(keyOf: (d: string) => string, esperadoOf: (k: string) => number): SeriePonto[] {
    const m = new Map<string, SeriePonto>();
    const get = (k: string) => {
      let p = m.get(k);
      if (!p) {
        p = { periodo: k, faturamento: 0, contribuicao: 0, esperado: 0, resultado: 0, cora: 0 };
        m.set(k, p);
      }
      return p;
    };
    for (const o of os) {
      if (!o.data) continue;
      const p = get(keyOf(o.data));
      p.faturamento += o.valor;
      p.contribuicao += o.contribuicao;
    }
    for (const t of cora) {
      if (t.excludedFromConsolidated || !t.transactionDate) continue;
      get(keyOf(t.transactionDate)).cora += t.amount;
    }
    for (const [k, p] of m) {
      p.esperado = esperadoOf(k);
      p.resultado = p.contribuicao - p.esperado;
    }
    return [...m.values()].sort((a, b) => a.periodo.localeCompare(b.periodo));
  }

  const dia = build(
    (d) => d.slice(0, 10),
    (k) => fixoMes(k.slice(0, 7)) / diasNoMes(k.slice(0, 7))
  );
  const mes = build((d) => d.slice(0, 7), (k) => fixoMes(k));
  const ano = build(
    (d) => d.slice(0, 4),
    (y) => (mesesPorAno.get(y) ?? []).reduce((s, ym) => s + fixoMes(ym), 0)
  );
  return { dia, mes, ano };
}

export default async function EnrdPosVendaPage() {
  const config = await getConfig();
  type DashOS = OS & { status?: string | null };
  let os: DashOS[] = [];
  let osSource: "projetos" | "tamara" | "none" = "none";
  let osLiveAt: string | null = null;
  let osStale = false; // veio do snapshot estático
  let installations: Awaited<ReturnType<typeof getInstallations>> = [];
  let proximas: Awaited<ReturnType<typeof getProximasLimpezas>> = [];
  let loadError: string | null = null;
  // Fonte das OS: CRM de pós-venda do projetos (pos_venda_servicos) AO VIVO;
  // fallback para as OS importadas da planilha Tamara (banco AWQ).
  try {
    const pv = await getLiveProjetosPosVenda();
    if (pv) {
      os = pv.servicos;
      osSource = "projetos";
      osLiveAt = pv.fetchedAt;
      osStale = !!pv.stale;
    } else {
      const t: StoredOS[] = await getOS();
      os = t;
      osSource = t.length ? "tamara" : "none";
    }
  } catch (e) {
    try {
      const t: StoredOS[] = await getOS();
      os = t;
      osSource = t.length ? "tamara" : "none";
    } catch {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }
  // Enriquecimento (instalações + agenda) AO VIVO do gestão; fallback ao espelho.
  try {
    const snap = await getLiveMontagem();
    if (snap) {
      installations = snap.installations;
      proximas = liveProximas(snap);
    } else {
      [installations, proximas] = await Promise.all([getInstallations(), getProximasLimpezas()]);
    }
  } catch {
    try {
      [installations, proximas] = await Promise.all([getInstallations(), getProximasLimpezas()]);
    } catch {
      /* mantém vazio */
    }
  }

  // ── Mês corrente (MTD) ──────────────────────────────────────────────────────
  const mesAtual = new Date().toISOString().slice(0, 7);
  const configReais = configSoReais(config);
  type ContribStatus = OSContribuicao & { status: string | null; dono: DonoOS };
  // realizado = fechado/concluído/pago. Pipeline (negociação/contato) NÃO entra no resultado.
  const realizado = isRealizado;
  const mapC = (cfg: typeof config): ContribStatus[] =>
    os.map((o) => ({ ...contribuicaoOS(o, cfg), status: o.status ?? null, dono: classificarDono(o.tipoServico) }));
  const contribCom = mapC(config);
  const contribReais = mapC(configReais);
  // PERÍMETRO do vesting do Miguel: SÓ OS pos_venda realizada. Montagem (Felipe) e
  // híbridas (split a definir) ficam FORA do P&L do pós-venda.
  const noPerimetro = (o: ContribStatus) => o.dono === "pos_venda" && realizado(o.status);
  const realCom = contribCom.filter(noPerimetro);
  const realReais = contribReais.filter(noPerimetro);
  const mtdCom = realCom.filter((o) => (o.data ?? "").startsWith(mesAtual));
  const mtdReais = realReais.filter((o) => (o.data ?? "").startsWith(mesAtual));

  const resCom = resultadoMes(mtdCom, config);
  const resReais = resultadoMes(mtdReais, configReais);
  const be = resCom.breakEven;
  const historico = resultadoPorMes(realCom, config);
  const pctEstim = pctDependenteDeEstimativas(resCom.resultado, resReais.resultado, resCom.faturamento);
  const premissas = premissasEstimadas(config);

  // ── Receita por DONO (contaminação de fronteira) ────────────────────────────
  const receitaPorDono: Record<DonoOS, number> = { pos_venda: 0, montagem: 0, hibrido: 0 };
  const countPorDono: Record<DonoOS, number> = { pos_venda: 0, montagem: 0, hibrido: 0 };
  for (const o of contribCom) {
    receitaPorDono[o.dono] += o.valor;
    countPorDono[o.dono] += 1;
  }
  const totalReceitaTodos = receitaPorDono.pos_venda + receitaPorDono.montagem + receitaPorDono.hibrido;
  const pctReceitaPos = totalReceitaTodos > 0 ? receitaPorDono.pos_venda / totalReceitaTodos : 0;
  const pctReceitaFronteira =
    totalReceitaTodos > 0 ? (receitaPorDono.montagem + receitaPorDono.hibrido) / totalReceitaTodos : 0;

  // ── Pós-venda NÃO COBRADO (perda por não cobrar) ────────────────────────────
  // Só o perímetro do pós-venda (Miguel). "Não cobrado" = OS com R$0 lançado.
  const naoCob = kpiNaoCobrados(
    contribCom
      .filter((o) => o.dono === "pos_venda")
      .map((o) => ({
        id: o.id,
        cliente: o.cliente,
        cidade: o.cidade,
        tipoServico: o.tipoServico,
        status: o.status,
        valor: o.valor,
      }))
  );

  // Comissão de originação (default 0): % sobre venda de integração (montagem) do mês.
  // Base = montagem MTD (assume originação sobre toda integração; Miguel refina).
  const montagemMTD = contribCom
    .filter((o) => o.dono === "montagem" && (o.data ?? "").startsWith(mesAtual))
    .reduce((s, o) => s + o.valor, 0);
  const receitaOriginacao = config.pctOriginacao * montagemMTD;
  const resultadoComOriginacao = resCom.resultado + receitaOriginacao;

  // Breakdown por status (CRM projetos) + conciliação (só p/ fonte Tamara)
  const statusCount = new Map<string, number>();
  for (const o of os) statusCount.set(o.status || "—", (statusCount.get(o.status || "—") ?? 0) + 1);
  const subnot = osSource === "tamara" ? kpiSubnotificacao(os as StoredOS[]) : null;

  const semOS = os.length === 0;

  // ── Cora (conciliação ENRD) + séries do gráfico comparativo ─────────────────
  let coraTx: Awaited<ReturnType<typeof getTransactionsByEntity>> = [];
  try {
    coraTx = await getTransactionsByEntity("ENERDY");
  } catch {
    /* sem dados Cora — gráfico mostra só resultado/esperado */
  }
  const series: Series = buildSeries(realCom, coraTx, config);

  // ── Completude (fato transacional) ──────────────────────────────────────────
  const comData = os.filter((o) => o.data).length;
  const completudeData = os.length > 0 ? comData / os.length : 1;

  // ── Concentração por técnico (gestão installations) ─────────────────────────
  const porMontador = new Map<string, number>();
  for (const i of installations) {
    const m = (i.montador || "—").trim() || "—";
    porMontador.set(m, (porMontador.get(m) ?? 0) + 1);
  }
  const montadores = [...porMontador.entries()].sort((a, b) => b[1] - a[1]);
  const topMont = montadores[0];
  const concentracao = installations.length > 0 && topMont ? topMont[1] / installations.length : 0;

  // ── Capacidade (estimativa via gestão — proxy até importar OS Tamara) ───────
  const instMes = installations.filter((i) => (normalizeDate(i.raw?.data_int) ?? "").startsWith(mesAtual));
  const baseCap = instMes.length > 0 ? instMes : installations;
  const horasEstimadas = baseCap.reduce(
    (s, i) => s + (TEMPO_MEDIO_POR_TIPO[(i.tipo as string) ?? ""] ?? 3),
    0
  );
  const utilizacao = config.horasProdutivasMes > 0 ? horasEstimadas / config.horasProdutivasMes : 0;
  const capProxy = instMes.length === 0;

  // posição do faturamento na régua de break-even
  const escalaMax = Math.max(be.breakEvenCom * 1.2, resCom.faturamento * 1.1, 1);
  const pos = (v: number) => `${Math.min(100, (v / escalaMax) * 100)}%`;

  return (
    <>
      <Header title="Pós-venda / O&M — ENRD" subtitle="Agência Solar · AWQ Group" />
      <div className="page-container">

        {/* Perímetro do vesting (regra-mãe) */}
        <div className="card p-3 bg-orange-50 border-orange-200 text-xs text-orange-900 flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0 text-orange-600" />
          <span>
            <strong>Perímetro:</strong> este painel mede <strong>só o pós-venda/O&amp;M</strong> = vesting do
            Miguel. Montagem, instalação e venda de integração são do <strong>Felipe</strong> e ficam FORA.
            Receita e custo caem no <strong>mesmo perímetro</strong>.
          </span>
        </div>

        {/* KPI — receita por dono (contaminação de fronteira) */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Receita por dono (perímetro)</h2>
            <span className="text-xs text-gray-400">
              {PCT(pctReceitaFronteira)} da receita é fronteira (fora do pós-venda)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([
              { dono: "pos_venda" as DonoOS, label: "Pós-venda (Miguel)", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
              { dono: "montagem" as DonoOS, label: "Montagem (Felipe · fora)", cls: "text-gray-600 bg-gray-50 border-gray-200" },
              { dono: "hibrido" as DonoOS, label: "Híbrido (a verificar)", cls: "text-amber-700 bg-amber-50 border-amber-200" },
            ]).map((d) => (
              <div key={d.dono} className={`rounded-lg border p-3 ${d.cls}`}>
                <div className="text-lg font-bold">{BRL(receitaPorDono[d.dono])}</div>
                <div className="text-xs mt-0.5">
                  {d.label} · {countPorDono[d.dono]} OS ·{" "}
                  {PCT(totalReceitaTodos > 0 ? receitaPorDono[d.dono] / totalReceitaTodos : 0)}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Só <strong>{PCT(pctReceitaPos)}</strong> da receita entra no P&amp;L do pós-venda. Híbridas só
            contam a parte pós quando o split for informado (senão: RATEAR/VERIFICAR, não contadas).
          </p>
        </div>

        {/* KPI — Pós-venda NÃO COBRADO (perda por não cobrar) */}
        <div className="card p-4 border-l-4 border-l-red-400">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-500" /> Pós-venda não cobrado
            </h2>
            <span className="text-xs text-gray-400">
              perímetro Miguel · {naoCob.naoCobrados.length} OS sem valor lançado
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Perda certa: realizados de graça */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="text-2xl font-bold text-red-700">{BRL(naoCob.perdaCerta)}</div>
              <div className="text-xs text-red-900 mt-0.5">
                Perda certa — {naoCob.nRealizadosGratis} serviço(s) <strong>realizado(s) de graça</strong> (status
                fechado, R$0)
              </div>
            </div>
            {/* Não cobrados em aberto (pipeline a R$0) */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="text-2xl font-bold text-amber-700">
                {naoCob.naoCobrados.length - naoCob.nRealizadosGratis}
              </div>
              <div className="text-xs text-amber-900 mt-0.5">
                Não cobrados em aberto — pós-venda sem valor, ainda não fechado
              </div>
            </div>
            {/* Cotado, ainda a cobrar */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-2xl font-bold text-gray-900">{BRL(naoCob.cotadoACobrar)}</div>
              <div className="text-xs text-gray-600 mt-0.5">
                Cotado a cobrar — {naoCob.nCotadoACobrar} OS em negociação, receita ainda não capturada
              </div>
            </div>
          </div>

          {/* Perda total estimada se nenhum dos não-cobrados for cobrado */}
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="text-xs text-gray-500">
              Perda estimada se nada disso for cobrado:
            </span>
            <span className="text-base font-bold text-red-700">{BRL(naoCob.perdaEstimada)}</span>
            <span className="text-[11px] text-gray-400">
              (ESTIMATIVA · {naoCob.naoCobrados.length} × ticket mediano {BRL(naoCob.ticketMediano)})
            </span>
          </div>

          {naoCob.naoCobrados.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left py-1 pr-3 font-medium">Cliente</th>
                    <th className="text-left py-1 pr-3 font-medium">Serviço</th>
                    <th className="text-left py-1 pr-3 font-medium">Cidade</th>
                    <th className="text-left py-1 pr-3 font-medium">Situação</th>
                    <th className="text-right py-1 font-medium">Perda estim.</th>
                  </tr>
                </thead>
                <tbody>
                  {naoCob.naoCobrados.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50">
                      <td className="py-1.5 pr-3 text-gray-900">{o.cliente ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{o.tipoServico ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{o.cidade ?? "—"}</td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            o.realizado ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {o.realizado ? "REALIZADO · R$0" : (o.status ?? "pipeline")}
                        </span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-red-600">{BRL(naoCob.ticketMediano)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">
            <strong>&ldquo;Não cobrado&rdquo;</strong> = OS de pós-venda com <strong>R$0 lançado</strong>. O fato
            (cobrou ou não) nunca é estimado; só o <strong>valor potencial</strong> é — pelo ticket mediano dos
            serviços cobrados (conservador, ignora outlier). Lançar o valor no CRM remove o serviço daqui.
          </p>
        </div>

        {/* Cabeçalho: tese + % estimado + import */}
        <div className="card p-4 border-l-4 border-l-orange-500">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2 max-w-2xl">
              <TrendingDown size={18} className="text-orange-600 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Perímetro corrigido:</strong> o custo de pessoal agora é só a fração de{" "}
                <strong>dedicação</strong> ao pós-venda (William {PCT(config.dedWilliam)} · Tamara{" "}
                {PCT(config.dedTamara)} · bônus 100%), não 100% da folha. Com isso o break-even cai para{" "}
                <strong>{BRL(be.breakEvenCom)}</strong> (com bônus){" "}
                {be.gatilhoAbaixoDoBreakEven ? (
                  <>e a zona morta do bônus persiste.</>
                ) : (
                  <>
                    e a <strong>zona morta do bônus desaparece</strong> (gatilho {BRL(be.gatilhoBonus)} já
                    acima do break-even).
                  </>
                )}{" "}
                Margem do pós-venda no perímetro:{" "}
                <strong className={resCom.resultado < 0 ? "text-red-600" : "text-emerald-700"}>
                  {PCT(resCom.resultadoPct)}
                </strong>
                .
              </p>
            </div>
            <div className="text-right">
              <div className={`text-xs font-semibold ${pctEstim > 0.3 ? "text-red-600" : "text-gray-500"}`}>
                {PCT(pctEstim)} do resultado depende de premissas estimadas
              </div>
              {pctEstim > 0.3 && (
                <div className="text-xs text-red-600 mt-0.5">⚠ número ainda direcional</div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-3">
            <EnrdPosVendaImport />
            <span className="text-xs text-gray-400">
              {osSource === "projetos" ? (
                <>
                  {osStale ? (
                    <span className="text-amber-600 font-medium">● SNAPSHOT</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">● AO VIVO</span>
                  )}{" "}
                  · CRM pós-venda <span className="font-medium text-gray-600">projetos.enerdy</span>
                  {osLiveAt
                    ? ` (${osStale ? new Date(osLiveAt).toLocaleString("pt-BR") : new Date(osLiveAt).toLocaleTimeString("pt-BR")})`
                    : ""}
                </>
              ) : osSource === "tamara" ? (
                <>Fonte receita: planilha Tamara (lote)</>
              ) : (
                <>Fonte receita: configure o CRM (projetos) ou importe a planilha Tamara</>
              )}{" "}
              · enriquecimento gestão.enerdy · MTD {mesAtual}
            </span>
          </div>
        </div>

        {loadError && (
          <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {loadError} — rode as migrações 006/007 no SQL Editor do ERP.
          </div>
        )}

        {/* ─── SEÇÃO 1 — RESULTADO DO MÊS (MTD) ─── */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <CircleDollarSign size={15} className="text-orange-600" /> 1 · Resultado do mês (MTD {mesAtual})
          </h2>

          {/* Régua break-even em degrau */}
          <div className="mb-5">
            <div className="relative h-9 rounded-lg bg-gray-100 overflow-hidden">
              {/* zona morta entre gatilho e break-even com bônus */}
              <div
                className="absolute top-0 bottom-0 bg-red-100"
                style={{ left: pos(be.gatilhoBonus), width: `calc(${pos(be.breakEvenCom)} - ${pos(be.gatilhoBonus)})` }}
                title="Zona morta: ativa o bônus mas ainda dá prejuízo"
              />
              {/* faturamento atual */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-gray-900" style={{ left: pos(resCom.faturamento) }} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
              <span className="flex items-center gap-1 text-gray-700">
                <span className="inline-block w-2.5 h-0.5 bg-gray-900" /> Faturamento {BRL(resCom.faturamento)}
              </span>
              <span className="flex items-center gap-1 text-gray-600">
                <span className="inline-block w-2 h-2 rounded-sm bg-red-200" /> Gatilho do bônus {BRL(be.gatilhoBonus)}
              </span>
              <span className="text-emerald-700">BE s/ bônus {BRL(be.breakEvenSem)}</span>
              <span className="text-red-700">BE c/ bônus {BRL(be.breakEvenCom)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <AlertTriangle size={11} className="text-red-500" /> Zona morta (faixa vermelha):{" "}
              {BRL(be.zonaMorta.de)} → {BRL(be.zonaMorta.ate)}. Taxa de contribuição{" "}
              <span className={be.taxaFonte === "estimativa" ? "text-orange-600 font-medium" : "text-gray-700"}>
                {PCT(be.taxaContribuicao)} {be.taxaFonte === "estimativa" ? "(ESTIMADA)" : "(real)"}
              </span>
            </div>
          </div>

          {/* Dois modos lado a lado */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="py-2 font-medium">Indicador</th>
                  <th className="py-2 px-3 font-medium text-right">Só dados reais</th>
                  <th className="py-2 px-3 font-medium text-right">
                    Com estimativas <FlaskConical size={11} className="inline text-orange-500" />
                  </th>
                  <th className="py-2 pl-3 font-medium text-right">Δ estimativa</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Faturamento", r: resReais.faturamento, c: resCom.faturamento },
                  { label: "Σ Contribuição", r: resReais.somaContribuicao, c: resCom.somaContribuicao },
                  { label: "Custo fixo aplicado", r: -resReais.custoFixoAplicado, c: -resCom.custoFixoAplicado },
                  { label: "Resultado", r: resReais.resultado, c: resCom.resultado, bold: true },
                ].map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className={`py-2 ${row.bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>{row.label}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-700">{BRL(row.r)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-900">{BRL(row.c)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-gray-400">{BRL(row.c - row.r)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 font-semibold text-gray-900">Margem %</td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-700">{PCT(resReais.resultadoPct)}</td>
                  <td className={`py-2 px-3 text-right tabular-nums font-semibold ${resCom.resultado < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {PCT(resCom.resultadoPct)}
                  </td>
                  <td className="py-2 pl-3" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Status do bônus + zona morta */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs border ${resCom.bonusDevido ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
              Bônus {resCom.bonusDevido ? "DEVIDO (faturamento > gatilho)" : "não devido"}
            </span>
            {resCom.emZonaMorta && (
              <span className="px-2.5 py-1 rounded-full text-xs border bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                <AlertTriangle size={11} /> EM ZONA MORTA — o bônus ativou mas a operação ainda dá prejuízo
              </span>
            )}
            {be.gatilhoAbaixoDoBreakEven && (
              <span className="px-2.5 py-1 rounded-full text-xs border bg-orange-50 text-orange-700 border-orange-200">
                Distorção: gatilho ({BRL(be.gatilhoBonus)}) &lt; break-even c/ bônus ({BRL(be.breakEvenCom)})
              </span>
            )}
          </div>

          {/* Comissão de originação (separada da receita de serviço) */}
          {config.pctOriginacao > 0 ? (
            <div className="mt-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3">
              <span className="text-gray-600">
                + Originação ({PCT(config.pctOriginacao)} s/ integração): {BRL(receitaOriginacao)}
              </span>
              <span className="font-semibold text-gray-900">
                Resultado total (serviço + originação): {BRL(resultadoComOriginacao)}
              </span>
              <span className="text-xs text-amber-600">
                base assume originação sobre toda integração — Miguel deve refinar
              </span>
            </div>
          ) : (
            <div className="mt-3 text-xs text-gray-400 border-t pt-3">
              Comissão de originação: <strong>0%</strong> (a definir pelo Miguel). Quando &gt; 0, entra como
              receita separada do serviço.
            </div>
          )}

          {/* Tendência histórica */}
          <div className="mt-4">
            <div className="text-xs font-medium text-gray-400 mb-2">Tendência (meses lançados)</div>
            {historico.length === 0 ? (
              <div className="text-xs text-gray-400">
                {semOS ? "Aguardando import da planilha Tamara — sem lançamentos." : "Sem meses fechados."}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {historico.map((h) => (
                  <div key={h.mes} className="text-xs border rounded-lg px-2.5 py-1.5">
                    <div className="text-gray-500">{h.mes}</div>
                    <div className={`font-semibold ${h.resultado.resultado < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {BRL(h.resultado.resultado)} ({PCT(h.resultado.resultadoPct)})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── GRÁFICO COMPARATIVO (filtros diário/mensal/anual) ─── */}
        <EnrdPosVendaChart series={series} />

        {/* ─── SEÇÃO 2 — PROJETO A PROJETO ─── */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Wrench size={15} className="text-orange-600" /> 2 · Projeto a projeto (mitigação)
            </h2>
            <span className="text-xs text-gray-400">
              {os.length} OS ·{" "}
              {osSource === "tamara" && subnot
                ? `conciliação: ${subnot.revisar} em REVISAR (${PCT(subnot.pct)})`
                : [...statusCount.entries()].map(([s, c]) => `${s} ${c}`).join(" · ")}
            </span>
          </div>

          {semOS ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Nenhuma OS encontrada. Configure as credenciais para ler o CRM de pós-venda
              (projetos.enerdy), ou importe a planilha da Tamara.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b">
                    <th className="py-2 pr-3 font-medium">Cliente / Cidade</th>
                    <th className="py-2 px-3 font-medium">Tipo</th>
                    <th className="py-2 px-3 font-medium">Dono</th>
                    <th className="py-2 px-3 font-medium">Status</th>
                    <th className="py-2 px-3 font-medium text-right">Valor</th>
                    <th className="py-2 px-3 font-medium text-right">Material</th>
                    <th className="py-2 px-3 font-medium text-right">Comb.<FlaskConical size={9} className="inline text-orange-400" /></th>
                    <th className="py-2 px-3 font-medium text-right">Contribuição</th>
                    <th className="py-2 pl-3 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {[...contribCom]
                    .sort((a, b) => a.contribuicao - b.contribuicao)
                    .slice(0, 80)
                    .map((o) => (
                      <tr
                        key={o.id}
                        className={`border-b last:border-0 ${
                          o.flagNegativa ? "bg-red-50" : o.dono !== "pos_venda" ? "bg-gray-50/60" : ""
                        }`}
                      >
                        <td className={`py-2 pr-3 ${o.dono !== "pos_venda" ? "opacity-60" : ""}`}>
                          <div className="font-medium text-gray-900">{o.cliente || "—"}</div>
                          <div className="text-xs text-gray-400">{o.cidade || "—"}</div>
                        </td>
                        <td className="py-2 px-3 text-gray-600">{o.tipoServico || "—"}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] border ${
                              o.dono === "pos_venda"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : o.dono === "montagem"
                                ? "bg-gray-100 text-gray-500 border-gray-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {o.dono === "pos_venda" ? "PÓS" : o.dono === "montagem" ? "MONTAGEM" : "VERIFICAR"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {o.status ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs border ${
                                /fechad|conclu|pago|ganho|ativo/i.test(o.status)
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : /negoci/i.test(o.status)
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {o.status}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-700">{BRL(o.valor)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-500">{BRL(o.custoMaterial)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-500">{BRL(o.combustivel)}</td>
                        <td className={`py-2 px-3 text-right tabular-nums font-semibold ${o.contribuicao < 0 ? "text-red-600" : "text-gray-900"}`}>
                          {BRL(o.contribuicao)} <span className="text-xs font-normal text-gray-400">({PCT(o.contribuicaoPct)})</span>
                        </td>
                        <td className="py-2 pl-3">
                          <div className="flex gap-1">
                            {o.flagNegativa && <span className="text-xs text-red-600" title="Não cobre nem o variável">⛔</span>}
                            {o.flagDistante && <span className="text-xs text-amber-600" title="Combustível alto vs ticket">⚑</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── SEÇÃO 3 — CAPACIDADE & AGENDA ─── */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Gauge size={15} className="text-orange-600" /> 3 · Capacidade & agenda (por que a margem é zero)
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Concentração + capacidade */}
            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                  <Users2 size={13} /> Concentração no técnico
                </div>
                {topMont ? (
                  <>
                    <div className={`text-lg font-bold ${concentracao > 0.5 ? "text-red-600" : "text-gray-900"}`}>
                      {topMont[0]} — {PCT(concentracao)}
                    </div>
                    {concentracao > 0.5 && (
                      <div className="text-xs text-red-600">⚠ &gt;50% das OS num só técnico (risco de gargalo)</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {montadores.slice(0, 4).map(([m, c]) => `${m}: ${c}`).join(" · ")}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">Sem dados de gestão.</div>
                )}
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                  <Gauge size={13} /> Capacidade (estimativa <FlaskConical size={10} className="inline text-orange-500" />)
                </div>
                <div className="text-lg font-bold text-gray-900">{PCT(utilizacao)} utilização</div>
                <div className="text-xs text-gray-500">
                  ~{horasEstimadas.toFixed(0)}h estimadas / {config.horasProdutivasMes}h-mês ·{" "}
                  ociosidade {PCT(Math.max(0, 1 - utilizacao))} = custo fixo não coberto.
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {capProxy ? "proxy via gestão (até importar OS Tamara)" : `base: ${instMes.length} instalações do mês`} ·
                  tempo por tipo é estimativa, não medição.
                </div>
              </div>
            </div>

            {/* Agenda de reativação */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                <CalendarClock size={13} /> Agenda de reativação — próximas limpezas (pipeline de receita)
              </div>
              {proximas.length === 0 ? (
                <div className="text-sm text-gray-400 py-4 text-center">
                  Sem próximas limpezas no espelho (rode a sync do gestão).
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {proximas.slice(0, 30).map((p) => {
                        const venc = p.proxima_limpeza && p.proxima_limpeza < mesAtual + "-01";
                        return (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-1.5 pr-2 text-gray-700">{p.cliente_nome || p.local_instalacao || "—"}</td>
                            <td className="py-1.5 px-2 text-gray-400">{p.capacidade_kwp ? `${p.capacidade_kwp} kWp` : ""}</td>
                            <td className={`py-1.5 pl-2 text-right tabular-nums ${venc ? "text-red-600 font-medium" : "text-gray-600"}`}>
                              {p.proxima_limpeza}
                              {venc ? " ⚠" : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-2">
                Esta agenda é a ação que preenche a capacidade ociosa e resolve a margem.
              </div>
            </div>
          </div>
        </section>

        {/* ─── PREMISSAS ESTIMADAS ─── */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <FlaskConical size={15} className="text-orange-600" /> Premissas estimadas
          </h2>
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
            <Info size={11} /> Fatos transacionais (valor/cliente/data) nunca são estimados. Edite estes
            valores na config — quando o real entrar, o selo “ESTIMADO” some sozinho. Completude de datas
            das OS: {PCT(completudeData)}{completudeData < 0.8 ? " (base parcial)" : ""}.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="py-2 pr-3 font-medium">Parâmetro</th>
                  <th className="py-2 px-3 font-medium">Valor estimado</th>
                  <th className="py-2 px-3 font-medium">Base do cálculo</th>
                  <th className="py-2 pl-3 font-medium">Confiança</th>
                </tr>
              </thead>
              <tbody>
                {premissas.map((p) => (
                  <tr key={p.key} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-gray-700">{p.parametro}</td>
                    <td className={`py-2 px-3 font-medium ${p.semBase ? "text-red-600" : "text-gray-900"}`}>{p.valorEstimado}</td>
                    <td className="py-2 px-3 text-xs text-gray-500 max-w-md">{p.base}</td>
                    <td className="py-2 pl-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          p.confianca === "alta"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.confianca === "média"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : p.confianca === "baixa"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {p.confianca === "sem-base" ? "SEM BASE" : p.confianca}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── CONFIG EDITÁVEL ─── */}
        <EnrdPosVendaConfigEditor config={config} />

      </div>
    </>
  );
}
