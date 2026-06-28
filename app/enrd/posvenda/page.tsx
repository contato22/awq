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
  type OSContribuicao,
} from "@/lib/enrd-posvenda-costing";
import {
  premissasEstimadas,
  configSoReais,
  pctDependenteDeEstimativas,
  TEMPO_MEDIO_POR_TIPO,
  HORAS_UTEIS_MES,
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

export default async function EnrdPosVendaPage() {
  const config = await getConfig();
  let os: StoredOS[] = [];
  let installations: Awaited<ReturnType<typeof getInstallations>> = [];
  let proximas: Awaited<ReturnType<typeof getProximasLimpezas>> = [];
  let loadError: string | null = null;
  // OS (Tamara) vêm do banco AWQ (dado armazenado, não do gestão).
  try {
    os = await getOS();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
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
  const contribCom: OSContribuicao[] = os.map((o) => contribuicaoOS(o, config));
  const contribReais: OSContribuicao[] = os.map((o) => contribuicaoOS(o, configReais));
  const mtdCom = contribCom.filter((o) => (o.data ?? "").startsWith(mesAtual));
  const mtdReais = contribReais.filter((o) => (o.data ?? "").startsWith(mesAtual));

  const resCom = resultadoMes(mtdCom, config);
  const resReais = resultadoMes(mtdReais, configReais);
  const be = resCom.breakEven;
  const historico = resultadoPorMes(contribCom, config);
  const pctEstim = pctDependenteDeEstimativas(resCom.resultado, resReais.resultado, resCom.faturamento);
  const premissas = premissasEstimadas(config);
  const subnot = kpiSubnotificacao(os);

  const semOS = os.length === 0;

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
  const utilizacao = HORAS_UTEIS_MES > 0 ? horasEstimadas / HORAS_UTEIS_MES : 0;
  const capProxy = instMes.length === 0;

  // posição do faturamento na régua de break-even
  const escalaMax = Math.max(be.breakEvenCom * 1.2, resCom.faturamento * 1.1, 1);
  const pos = (v: number) => `${Math.min(100, (v / escalaMax) * 100)}%`;

  return (
    <>
      <Header title="Pós-venda / O&M — ENRD" subtitle="Agência Solar · AWQ Group" />
      <div className="page-container">

        {/* Cabeçalho: tese + % estimado + import */}
        <div className="card p-4 border-l-4 border-l-orange-500">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2 max-w-2xl">
              <TrendingDown size={18} className="text-orange-600 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tese:</strong> a operação de pós-venda opera com margem ≈ <strong>0% a −2%</strong>:
                mão de obra é <strong>fixa</strong> (William + Tamara + bônus) e o faturamento (~R$16k/mês)
                fica em cima do break-even. O <strong>gatilho do bônus (R$10k) está abaixo do break-even
                com bônus</strong> — faturar mais ativa o bônus e empurra o mês para o prejuízo.
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
              Fonte receita: planilha Tamara (lote) · enriquecimento: gestão.enerdy · MTD {mesAtual}
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

        {/* ─── SEÇÃO 2 — PROJETO A PROJETO ─── */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Wrench size={15} className="text-orange-600" /> 2 · Projeto a projeto (mitigação)
            </h2>
            <span className="text-xs text-gray-400">
              {subnot.total} OS · conciliação: {subnot.revisar} em REVISAR ({PCT(subnot.pct)})
            </span>
          </div>

          {semOS ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Nenhuma OS lançada. Importe a planilha da Tamara para ver a contribuição por OS,
              as flags vermelhas (contribuição negativa) e o ranking dos piores lançamentos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b">
                    <th className="py-2 pr-3 font-medium">Cliente / Cidade</th>
                    <th className="py-2 px-3 font-medium">Tipo</th>
                    <th className="py-2 px-3 font-medium text-right">Valor</th>
                    <th className="py-2 px-3 font-medium text-right">Material</th>
                    <th className="py-2 px-3 font-medium text-right">Comb.<FlaskConical size={9} className="inline text-orange-400" /></th>
                    <th className="py-2 px-3 font-medium text-right">Contribuição</th>
                    <th className="py-2 px-3 font-medium">Téc.</th>
                    <th className="py-2 pl-3 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {[...contribCom]
                    .sort((a, b) => a.contribuicao - b.contribuicao)
                    .slice(0, 80)
                    .map((o) => (
                      <tr key={o.id} className={`border-b last:border-0 ${o.flagNegativa ? "bg-red-50" : ""}`}>
                        <td className="py-2 pr-3">
                          <div className="font-medium text-gray-900">{o.cliente || "—"}</div>
                          <div className="text-xs text-gray-400">{o.cidade || "—"}</div>
                        </td>
                        <td className="py-2 px-3 text-gray-600">{o.tipoServico || "—"}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-700">{BRL(o.valor)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-500">{BRL(o.custoMaterial)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-500">{BRL(o.combustivel)}</td>
                        <td className={`py-2 px-3 text-right tabular-nums font-semibold ${o.contribuicao < 0 ? "text-red-600" : "text-gray-900"}`}>
                          {BRL(o.contribuicao)} <span className="text-xs font-normal text-gray-400">({PCT(o.contribuicaoPct)})</span>
                        </td>
                        <td className="py-2 px-3 text-gray-600">{o.tecnico || "—"}</td>
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
                  ~{horasEstimadas.toFixed(0)}h estimadas / {HORAS_UTEIS_MES}h-mês ·{" "}
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
