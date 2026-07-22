// ─── /enrd/relatorio — Relatório de Operações (Pós-venda/O&M) ────────────────
// Segue a estrutura do relatório de RI (Panorama · Serviço a serviço · Perfil de
// recebimento · Recebimento na Cora · Pontos de atenção), AO VIVO.
// ÂNCORA = CAIXA REAL (Cora). Antes o "cobrável" era Σ de estimativas soltas e
// inflava (~R$16k vs R$12k reais). Agora o total bate com o que entrou no banco:
// serviço não-logado recebe RATEIO do caixa da Cora (marcado ⌁), não ticket fixo.
// Fonte serviço-a-serviço: montagem (installations Serviço/Limpeza do mês);
// valor real quando há no CRM projetos, senão rateio. Reconciliação em
// lib/enrd-reconciliacao.ts (usada por todas as telas → números consistentes).

import Header from "@/components/Header";
import { getLiveMontagem } from "@/lib/enrd-montagem-live";
import { getInstallations } from "@/lib/enrd-montagem-db";
import { getLiveProjetosFull } from "@/lib/enerdy-projetos";
import { getConfig, normalizeDate } from "@/lib/enrd-posvenda-db";
import { contribuicaoOS, classificarDono, isRealizado } from "@/lib/enrd-posvenda-costing";
import { getReconciliacaoMes } from "@/lib/enrd-reconciliacao";
import { AlertTriangle, CheckCircle2, TrendingUp, Wallet, Info } from "lucide-react";

export const dynamic = "force-dynamic";

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const PCT = (v: number) => `${Math.round(v * 100)}%`;
const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
// Encurta local: some coordenada crua (lat,lng) e endereço completo → cidade/bairro.
// A fonte às vezes grava GPS em vez de um nome de lugar; melhor "—" que "-22.36,-42.94".
function localCurto(raw: string | null): string | null {
  if (!raw) return null;
  if (/^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/.test(raw.trim())) return null;
  const partes = raw.split(",").map((p) => p.trim()).filter(Boolean);
  return partes.length > 2 ? partes.slice(-3, -1).join(", ") : raw;
}

// Cabeçalho de seção no estilo do relatório (número + título espaçado).
function SecHead({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-3">
        <span className="text-orange-600 font-bold tabular-nums">{n}</span>
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-900">{title}</h2>
      </div>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

type Recebimento = "À vista" | "Risco" | "Cortesia";

export default async function EnrdRelatorioPage() {
  const config = await getConfig();

  // ── Fontes ──────────────────────────────────────────────────────────────────
  let installations: Awaited<ReturnType<typeof getInstallations>> = [];
  let stale = false;
  try {
    const snap = await getLiveMontagem();
    if (snap) {
      installations = snap.installations;
      stale = !!snap.stale;
    } else {
      installations = await getInstallations();
    }
  } catch {
    /* vazio */
  }

  let cobrancas: { cliente: string | null; valor: number; status: string | null }[] = [];
  try {
    const pv = await getLiveProjetosFull();
    cobrancas = (pv?.servicos ?? []).map((s) => ({ cliente: s.cliente, valor: s.valor, status: s.status }));
  } catch {
    /* vazio */
  }
  const cobrancaPorCliente = new Map<string, { valor: number; status: string | null }>();
  for (const c of cobrancas) {
    const k = norm(c.cliente);
    if (!k) continue;
    const cur = cobrancaPorCliente.get(k);
    if (!cur || c.valor > cur.valor) cobrancaPorCliente.set(k, { valor: c.valor, status: c.status });
  }

  // ── Mês corrente ──────────────────────────────────────────────────────────────
  const now = new Date();
  const mes = now.toISOString().slice(0, 7);
  const mesLabel = now
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  // Reconciliação canônica (âncora = Cora real). O valor por serviço não-logado
  // é o RATEIO calibrado para o total bater com o caixa, não Σ de estimativas.
  const recon = await getReconciliacaoMes(mes);
  const valorEstimadoServico = recon.valorRateioPorServico || 400;

  // ── Serviço a serviço: O&M executado/agendado no mês (montagem) ──────────────
  type Servico = {
    id: string;
    data: string | null;
    cliente: string | null;
    tipo: string | null;
    local: string | null;
    montador: string | null;
    valor: number;
    estimado: boolean;
    recebimento: Recebimento;
  };
  const doMes = installations.filter(
    (i) => /servi|limpez/i.test(i.tipo ?? "") && (normalizeDate(i.raw?.data_int) ?? "").startsWith(mes)
  );
  const servicos: Servico[] = doMes
    .map((i) => {
      const match = cobrancaPorCliente.get(norm(i.nome));
      const temCobranca = match && match.valor > 0;
      const cortesia = match != null && match.valor <= 0 && isRealizado(match.status);
      const risco = match != null && !isRealizado(match.status);
      const valor = cortesia ? 0 : temCobranca ? match!.valor : valorEstimadoServico;
      const recebimento: Recebimento = cortesia ? "Cortesia" : risco ? "Risco" : "À vista";
      return {
        id: i.id,
        data: normalizeDate(i.raw?.data_int) ?? i.data_int,
        cliente: i.nome,
        tipo: i.tipo,
        local: localCurto(i.localizacao),
        montador: i.montador,
        valor,
        estimado: !temCobranca && !cortesia,
        recebimento,
      };
    })
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));

  const equipe = (() => {
    const m = new Map<string, number>();
    for (const s of servicos) m.set(s.montador || "—", (m.get(s.montador || "—") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const equipeLabel = equipe[0]?.[0] ?? "—";

  // ── Panorama — âncora no CAIXA REAL (Cora), não em Σ de estimativas ──────────
  const cortesias = servicos.filter((s) => s.recebimento === "Cortesia");
  const riscos = servicos.filter((s) => s.recebimento === "Risco");
  const aVista = servicos.filter((s) => s.recebimento === "À vista");
  const somaAVista = aVista.reduce((s, x) => s + x.valor, 0);
  const somaRisco = riscos.reduce((s, x) => s + x.valor, 0);
  const somaCortesia = cortesias.reduce((s, x) => s + x.valor, 0);
  const semValor = servicos.filter((s) => s.estimado).length;

  // Três camadas reais + resultado. Cora = verdade; CRM = o que está rastreado.
  const recebidoCora = recon.recebidoCora; // AR realizado real (receita O&M)
  const logadoCRM = recon.valorLogado; // valor lançado no CRM (rastreado)
  const custoFixoPremissa = recon.custoFixoPremissa; // folha O&M (premissa)
  const resultadoOM = recon.resultadoOM; // receita real − folha premissa (perímetro Miguel)
  const suporteIntegracao = recon.suporteIntegracao; // pagamentos → terceirizados da integração
  // Gap que importa: quanto do que ENTROU não tem lançamento no CRM.
  const gapRastreio = Math.max(0, recebidoCora - logadoCRM);

  // ── Pontos de atenção (derivados) ────────────────────────────────────────────
  const nomes = new Map<string, number>();
  for (const s of servicos) nomes.set(norm(s.cliente), (nomes.get(norm(s.cliente)) ?? 0) + 1);
  const repetidos = [...nomes.entries()].filter(([k, n]) => k && n > 1);
  const maiorCortesia = [...cortesias].sort((a, b) => b.valor - a.valor)[0];
  // dispersão cara: contribuição ruim por combustível (ticket baixo + distante)
  const dispersos = servicos.filter((s) => {
    const c = contribuicaoOS(
      { id: s.id, data: s.data, cliente: s.cliente, cidade: s.local, tipoServico: s.tipo, valor: s.valor, custoMaterial: 0, tecnico: null },
      config
    );
    return c.flagDistante;
  });
  const topTicket = [...servicos].sort((a, b) => b.valor - a.valor)[0];

  const pontos: { t: string; d: string }[] = [];
  if (semValor > 0)
    pontos.push({
      t: `${semValor} de ${servicos.length} sem valor lançado`,
      d: "Serviços marcados com ⌁ têm valor por rateio do caixa da Cora (não medição). Lançar o valor real no CRM é o que faz o BI parar de subestimar.",
    });
  if (maiorCortesia)
    pontos.push({
      t: `${maiorCortesia.cliente} — cortesia`,
      d: `${BRL(0)} de caixa: serviço executado sem cobrança. É vazamento direto de receita.`,
    });
  for (const [k, n] of repetidos.slice(0, 1)) {
    const ex = servicos.find((s) => norm(s.cliente) === k);
    pontos.push({
      t: `${ex?.cliente ?? k} aparece ${n}×`,
      d: "Mesmo cliente em mais de um serviço no mês. Confirmar se é um contrato único ou valores separados.",
    });
  }
  if (dispersos.length > 0)
    pontos.push({
      t: "Dispersão cara",
      d: `${dispersos.length} serviço(s) com combustível alto vs ticket (cidade distante, valor pequeno). O deslocamento come a contribuição.`,
    });
  if (topTicket && servicos.length > 0)
    pontos.push({
      t: `${topTicket.cliente} concentra o mês`,
      d: `Maior ticket (${BRL(topTicket.valor)}) — ${PCT(recebidoCora > 0 ? topTicket.valor / recebidoCora : 0)} do recebido num só serviço.`,
    });

  const semDados = servicos.length === 0;

  return (
    <>
      <Header title="Relatório de Operações — ENRD" subtitle={`Pós-venda / O&M · ${mesLabel}`} />
      <div className="page-container">
        {/* Capa */}
        <section className="card p-6 bg-gradient-to-br from-orange-50 via-white to-white border-orange-100">
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-600">
            Enerdy · Pós-venda / O&amp;M
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Relatório de Operações</h1>
          <div className="text-sm text-gray-500 mt-0.5">
            {mesLabel} · serviço a serviço · Equipe {equipeLabel} · {servicos.length} serviços
            <span className="ml-2 inline-flex items-center gap-1 align-middle">
              {stale ? (
                <span className="text-[11px] text-amber-600">● snapshot</span>
              ) : (
                <span className="text-[11px] text-emerald-600">● ao vivo</span>
              )}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-3 max-w-3xl">
            No pós-venda recebemos quando executamos — esta lista é a receita que já está a caminho. O que decide o
            caixa não é o cliente, é a <strong>execução da cobrança</strong> na Cora.
          </p>
        </section>

        {semDados ? (
          <div className="card p-8 text-center text-sm text-gray-400">
            Nenhum serviço de O&amp;M no mês de {mesLabel}. (Fonte: montagem — configure as credenciais ou rode a
            sync do gestão.)
          </div>
        ) : (
          <>
            {/* 01 PANORAMA */}
            <section className="card p-5">
              <SecHead n="01" title="Panorama" sub="O mês em números — ancorado no caixa real (Cora)" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Verdade: dinheiro que entrou */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-blue-600 flex items-center gap-1">
                    Recebido na Cora <span className="text-[9px] font-bold bg-blue-600 text-white px-1 rounded">REAL</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">{BRL(recebidoCora)}</div>
                  <div className="text-xs text-blue-800/70 mt-0.5">{recon.nCoraTx} créditos ENERDY no mês</div>
                </div>
                {/* Rastreado no CRM */}
                <div className="rounded-xl border border-gray-100 p-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Logado no CRM</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{BRL(logadoCRM)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{recon.nLogados} de {servicos.length} serviços com valor</div>
                </div>
                {/* Volume executado */}
                <div className="rounded-xl border border-gray-100 p-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Executados</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{servicos.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{riscos.length} em risco · {cortesias.length} cortesia</div>
                </div>
                {/* Resultado do perímetro O&M (Miguel) */}
                <div className={`rounded-xl border p-3.5 ${resultadoOM >= 0 ? "border-emerald-100 bg-emerald-50/40" : "border-red-100 bg-red-50/40"}`}>
                  <div className={`text-[11px] uppercase tracking-wide ${resultadoOM >= 0 ? "text-emerald-600" : "text-red-600"}`}>Resultado O&amp;M (Miguel)</div>
                  <div className={`text-2xl font-bold mt-1 ${resultadoOM >= 0 ? "text-emerald-700" : "text-red-700"}`}>{BRL(resultadoOM)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    receita real − folha (premissa {BRL(custoFixoPremissa)})
                    {recon.combustivelClassificado && <> − combustível real ({BRL(recon.combustivelReal)})</>}
                  </div>
                </div>
              </div>

              {!recon.combustivelClassificado && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">
                    <strong>Combustível: 0 débitos classificados na Cora este mês.</strong> Todos os pagamentos caem
                    em &ldquo;fornecedor operacional&rdquo; (categoria genérica) — nenhum foi marcado como{" "}
                    <em>Deslocamento/Combustível</em>. Por isso o custo variável por serviço (seção 03) usa a{" "}
                    <strong>tabela estimada por cidade</strong>, não um valor real. Reclassificar os débitos de
                    combustível na conciliação faz esse custo virar real automaticamente.
                  </p>
                </div>
              )}

              {/* Fronteira: a pós-venda bancou o caixa da integração */}
              {suporteIntegracao > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                  <TrendingUp size={14} className="text-amber-600 mt-0.5 shrink-0 rotate-180" />
                  <p className="text-xs text-amber-900">
                    <strong>Suporte de caixa à integração: {BRL(suporteIntegracao)}.</strong> Os pagamentos da conta
                    ENRD (fora do combustível já classificado) foram para <strong>terceirizados da integração</strong>{" "}
                    (lado do Felipe), não para a equipe de O&amp;M. Ou seja, a pós-venda{" "}
                    <strong>bancou o caixa da integração</strong> — isso reduz o saldo da conta ({BRL(recon.saldoCaixa)}
                    ) mas <strong>não é custo do O&amp;M</strong> e fica fora do resultado do Miguel.
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                <strong>{BRL(recebidoCora)}</strong> entraram na Cora (real), mas só <strong>{BRL(logadoCRM)}</strong>{" "}
                estão lançados no CRM — <strong className="text-red-600">{BRL(gapRastreio)}</strong> de receita recebida
                <strong> sem rastro</strong>. O O&amp;M está no positivo; o que falta é <strong>lançar e conciliar</strong>{" "}
                para o BI parar de subestimar. A folha do O&amp;M é premissa (não há folha lançada na Cora) — por isso o
                resultado é <em>aproximado</em>.
              </p>
            </section>

            {/* 02 EFICIÊNCIA DE CAPITAL (ROCE · EBIT · Capital Empregado) */}
            <section className="card p-5">
              <SecHead
                n="02"
                title="Eficiência de capital"
                sub="EBIT, Capital Empregado e ROCE do perímetro O&M (Miguel) — aproximado, sem balanço formal"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`rounded-xl border p-3.5 ${recon.ebit >= 0 ? "border-emerald-100 bg-emerald-50/40" : "border-red-100 bg-red-50/40"}`}>
                  <div className={`text-[11px] uppercase tracking-wide ${recon.ebit >= 0 ? "text-emerald-600" : "text-red-600"}`}>EBIT</div>
                  <div className={`text-2xl font-bold mt-1 ${recon.ebit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{BRL(recon.ebit)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">= Resultado O&amp;M (sem juros/impostos no perímetro)</div>
                </div>
                <div className="rounded-xl border border-gray-100 p-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Capital empregado (proxy)</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{BRL(recon.capitalEmpregado)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    folha em operação ({PCT(recon.pctTempoOperacaoOM)}) + veículo
                  </div>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-orange-600">ROCE mensal</div>
                  <div className="text-2xl font-bold text-orange-700 mt-1">{PCT(recon.roceMensal)}</div>
                  <div className="text-xs text-orange-900/60 mt-0.5">EBIT ÷ capital empregado (mensal, não anualizado)</div>
                </div>
              </div>

              {/* Detalhamento do tempo: vendas de O&M vs operação de O&M */}
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Tempo de O&amp;M — vendas vs operação <span className="text-orange-400">(estimativa, confiança baixa)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <span className="text-xs text-gray-600">Vendas / renovação de O&amp;M</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {PCT(recon.pctTempoVendasOM)} · ~{((config.horasProdutivasMes * (config.dedWilliam + config.dedTamara)) * recon.pctTempoVendasOM).toFixed(0)}h/mês
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <span className="text-xs text-gray-600">Operação de O&amp;M (campo)</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {PCT(recon.pctTempoOperacaoOM)} · ~{((config.horasProdutivasMes * (config.dedWilliam + config.dedTamara)) * recon.pctTempoOperacaoOM).toFixed(0)}h/mês
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                  Base: {config.horasProdutivasMes}h produtivas/mês × dedicação O&amp;M (William {PCT(config.dedWilliam)} +
                  Tamara {PCT(config.dedTamara)}) = ~{(config.horasProdutivasMes * (config.dedWilliam + config.dedTamara)).toFixed(0)}h/mês
                  de O&amp;M no total. Sem apontamento real de horas — William/Tamara são majoritariamente técnicos de
                  campo, então a fração de vendas é estimada baixa. Editável em Pós-venda/O&amp;M → Parâmetros.
                </p>
              </div>

              <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                <strong>Leia com cautela:</strong> Capital Empregado aqui é um <strong>proxy simplificado</strong> — o
                O&amp;M não tem balanço patrimonial próprio (sem ativo fixo além do veículo, sem estoque segregado).
                Por isso ROCE mensal ({PCT(recon.roceMensal)}) compara um resultado mensal com um proxy de opex
                mensal — é uma <strong>medida de eficiência aproximada</strong>, não o ROCE anualizado clássico de
                balanço. Sobe/desce junto com o custo fixo premissa e a % de tempo em operação.
              </p>
            </section>

            {/* 03 SERVIÇO A SERVIÇO */}
            <section className="card p-5">
              <SecHead n="03" title="Serviço a serviço" sub={`Os ${servicos.length} serviços de ${mesLabel}`} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">Data</th>
                      <th className="py-2 pr-3 font-medium">Cliente</th>
                      <th className="py-2 pr-3 font-medium">Tipo</th>
                      <th className="py-2 pr-3 font-medium">Local</th>
                      <th className="py-2 pr-3 font-medium text-right">Valor</th>
                      <th className="py-2 pl-3 font-medium">Recebimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicos.map((s, i) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-gray-400 tabular-nums">{i + 1}</td>
                        <td className="py-2 pr-3 text-gray-600 tabular-nums">{s.data?.slice(8, 10)}/{s.data?.slice(5, 7)}</td>
                        <td className="py-2 pr-3 font-medium text-gray-900">{s.cliente || "—"}</td>
                        <td className="py-2 pr-3 text-gray-600">{s.tipo || "—"}</td>
                        <td className="py-2 pr-3 text-gray-500">{s.local || "—"}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-gray-800">
                          {BRL(s.valor)}
                          {s.estimado && <span className="text-orange-400" title="rateio do caixa da Cora">⌁</span>}
                        </td>
                        <td className="py-2 pl-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] border ${
                              s.recebimento === "À vista"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : s.recebimento === "Risco"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                            }`}
                          >
                            {s.recebimento}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                <span className="text-orange-400">⌁</span> valor por <strong>rateio do caixa da Cora</strong> (o total
                da coluna bate com o que entrou no banco, {BRL(recebidoCora)}) — o gestão registra a execução, não o
                valor. Recebimento é inferido; a forma de pagamento não vem da fonte.
              </p>
            </section>

            {/* 05 PERFIL DE RECEBIMENTO */}
            <section className="card p-5">
              <SecHead n="05" title="Perfil de recebimento" sub="Como o dinheiro entra" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <Wallet size={15} /> À vista
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{BRL(somaAVista)}</div>
                  <div className="text-xs text-emerald-900/70 mt-0.5">{aVista.length} serviços · cai rápido na Cora quando recolhido.</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <AlertTriangle size={15} /> Risco / backlog
                  </div>
                  <div className="text-2xl font-bold text-amber-700 mt-1">{BRL(somaRisco)}</div>
                  <div className="text-xs text-amber-900/70 mt-0.5">{riscos.length} serviços em negociação/arrastados — podem não pagar.</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                    <Info size={15} /> Cortesia
                  </div>
                  <div className="text-2xl font-bold text-gray-700 mt-1">{BRL(somaCortesia)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{cortesias.length} serviço(s) sem cobrança — R$ 0 de caixa.</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                <strong>Leitura:</strong> {somaAVista + somaRisco > 0 ? PCT(somaAVista / (somaAVista + somaRisco + somaCortesia)) : "—"} da
                execução é à vista e deveria cair na Cora em dias. O que arrisca o caixa é o backlog/risco ({BRL(somaRisco)}).
                Estes valores são rateio do caixa real — a composição real por forma de pagamento aparece quando o CRM
                for preenchido.
              </p>
            </section>

            {/* 06 RECEBIMENTO NA CORA */}
            <section className="card p-5">
              <SecHead n="06" title="Recebimento na Cora" sub="O caixa real da conta ENRD (bate com /enrd/conciliacao)" />
              <div className={recon.combustivelClassificado ? "grid grid-cols-1 sm:grid-cols-4 gap-3" : "grid grid-cols-1 sm:grid-cols-3 gap-3"}>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-emerald-600">Recebido (AR realizado)</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{BRL(recebidoCora)}</div>
                  <div className="text-xs text-emerald-900/60 mt-0.5">receita real que entrou</div>
                </div>
                {recon.combustivelClassificado && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-orange-600">Combustível (real)</div>
                    <div className="text-2xl font-bold text-orange-700 mt-1">{BRL(recon.combustivelReal)}</div>
                    <div className="text-xs text-orange-900/60 mt-0.5">{recon.nCombustivelReal} débito(s) classificado(s) — custo O&amp;M</div>
                  </div>
                )}
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-red-500">Pagamentos → integração</div>
                  <div className="text-2xl font-bold text-red-700 mt-1">{BRL(suporteIntegracao)}</div>
                  <div className="text-xs text-red-900/60 mt-0.5">terceirizados do Felipe — não é custo O&amp;M</div>
                </div>
                <div className={`rounded-xl border p-4 ${recon.saldoCaixa >= 0 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
                  <div className="text-[11px] uppercase tracking-wide text-amber-600">Saldo líquido da conta</div>
                  <div className={`text-2xl font-bold mt-1 ${recon.saldoCaixa >= 0 ? "text-amber-700" : "text-red-700"}`}>{BRL(recon.saldoCaixa)}</div>
                  <div className="text-xs text-amber-900/60 mt-0.5">recebido − pagamentos (movimento real)</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                A conta ENRD recebeu <strong>{BRL(recebidoCora)}</strong> e pagou <strong>{BRL(recon.pagamentosCora)}</strong>
                {recon.combustivelClassificado ? (
                  <> — {BRL(recon.combustivelReal)} é combustível real (custo O&amp;M) e {BRL(suporteIntegracao)} foi para{" "}
                  <strong>terceirizados da integração</strong></>
                ) : (
                  <> — desses pagamentos, <strong>{BRL(suporteIntegracao)} foram para terceirizados da integração</strong></>
                )}, não para o O&amp;M. Então o O&amp;M do Miguel está positivo ({BRL(resultadoOM)}); o saldo da conta (
                {BRL(recon.saldoCaixa)}) é menor porque a pós-venda <strong>subsidiou o caixa da integração</strong>.
              </p>
              <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                <div className="text-xs font-medium text-gray-500 mb-2">Para o BI parar de subestimar e o número fechar</div>
                <ol className="space-y-1 text-xs text-gray-600">
                  <li className="flex gap-2"><span className="text-gray-400">1.</span> Lançar valor de cada serviço no CRM (hoje {recon.nLogados} de {servicos.length}) — fecha o {BRL(gapRastreio)} de receita sem rastro.</li>
                  <li className="flex gap-2"><span className="text-gray-400">2.</span> Marcar os pagamentos como <strong>integração</strong> (não O&amp;M) na conciliação, para separar o perímetro.</li>
                  <li className="flex gap-2"><span className="text-gray-400">3.</span> Lançar a folha real do O&amp;M para o resultado do Miguel deixar de ser premissa.</li>
                </ol>
              </div>
            </section>

            {/* 07 PONTOS DE ATENÇÃO */}
            <section className="card p-5">
              <SecHead n="07" title="Pontos de atenção" sub="O que saltou da lista" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pontos.map((p, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 p-3 flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-orange-50 text-orange-600 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{p.t}</div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.d}</div>
                    </div>
                  </div>
                ))}
                {pontos.length === 0 && (
                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500" /> Nada crítico saltou da lista este mês.
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Rodapé padrão */}
        <div className="text-center text-[11px] text-gray-400 py-2 flex items-center justify-center gap-1.5">
          <TrendingUp size={11} /> Enerdy · Relatório de Operações · {mesLabel} · Equipe {equipeLabel} — ao vivo do
          gestão + CRM projetos + Cora
        </div>
      </div>
    </>
  );
}
