// ─── /enrd/relatorio — Relatório de Operações (Pós-venda/O&M) ────────────────
// Segue a estrutura do relatório de RI (Panorama · Serviço a serviço · Perfil de
// recebimento · Recebimento na Cora · Pontos de atenção), AO VIVO.
// Fonte serviço-a-serviço: montagem (installations Serviço/Limpeza do mês).
// Valor: casado com a cobrança do CRM projetos (pos_venda_servicos) por cliente;
// sem casar → estimado pelo ticket mediano (marcado com *). Recebimento é
// inferido (à vista / risco / cortesia) — forma de pagamento não vem da fonte.

import Header from "@/components/Header";
import { getLiveMontagem } from "@/lib/enrd-montagem-live";
import { getInstallations } from "@/lib/enrd-montagem-db";
import { getLiveProjetosFull } from "@/lib/enerdy-projetos";
import { getConfig, normalizeDate } from "@/lib/enrd-posvenda-db";
import { getTransactionsByEntity } from "@/lib/financial-db";
import { contribuicaoOS, classificarDono, isRealizado } from "@/lib/enrd-posvenda-costing";
import { AlertTriangle, CheckCircle2, TrendingUp, Wallet, Info } from "lucide-react";

export const dynamic = "force-dynamic";

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const PCT = (v: number) => `${Math.round(v * 100)}%`;
const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const mediana = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
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
  const ticketMediano = mediana(cobrancas.filter((c) => c.valor > 0).map((c) => c.valor)) || 400;
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
      const valor = cortesia ? 0 : temCobranca ? match!.valor : ticketMediano;
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

  // ── Panorama ─────────────────────────────────────────────────────────────────
  const totalAgendado = servicos.reduce((s, x) => s + x.valor, 0);
  const cortesias = servicos.filter((s) => s.recebimento === "Cortesia");
  const riscos = servicos.filter((s) => s.recebimento === "Risco");
  const aVista = servicos.filter((s) => s.recebimento === "À vista");
  const cobravel = totalAgendado - cortesias.reduce((s, x) => s + x.valor, 0);
  const somaAVista = aVista.reduce((s, x) => s + x.valor, 0);
  const somaRisco = riscos.reduce((s, x) => s + x.valor, 0);
  const somaCortesia = cortesias.reduce((s, x) => s + x.valor, 0);
  const semValor = servicos.filter((s) => s.estimado).length;

  // ── Recebimento na Cora (real do mês) ────────────────────────────────────────
  let coraConfirmado = 0;
  try {
    const tx = await getTransactionsByEntity("ENERDY");
    coraConfirmado = tx
      .filter((t) => !t.excludedFromConsolidated && t.amount > 0 && (t.transactionDate ?? "").startsWith(mes))
      .reduce((s, t) => s + t.amount, 0);
  } catch {
    /* sem Cora */
  }
  const cobrancaGap = Math.max(0, cobravel - coraConfirmado);

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
      d: "Serviços marcados com * têm valor estimado (ticket mediano). Enquanto ficarem em branco na fonte, o “a entrar” é estimativa.",
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
      d: `Maior ticket (${BRL(topTicket.valor)}) — ${PCT(cobravel > 0 ? topTicket.valor / cobravel : 0)} do cobrável num só serviço.`,
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
              <SecHead n="01" title="Panorama" sub="O mês em números" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-gray-100 p-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Serviços na agenda</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{servicos.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{riscos.length} em risco · {cortesias.length} cortesia</div>
                </div>
                <div className="rounded-xl border border-gray-100 p-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Total agendado</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{BRL(totalAgendado)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">tudo que a equipe executou/agendou</div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-emerald-600">Cobrável</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{BRL(cobravel)}</div>
                  <div className="text-xs text-emerald-800/70 mt-0.5">exclui as cortesias</div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-blue-600">Confirmado na Cora</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">{BRL(coraConfirmado)}</div>
                  <div className="text-xs text-blue-800/70 mt-0.5">créditos ENERDY conciliados no mês</div>
                </div>
              </div>

              {/* Composição do cobrável */}
              <div className="mt-4">
                <div className="text-xs font-medium text-gray-500 mb-2">Composição do cobrável ({BRL(cobravel)})</div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  {cobravel > 0 && (
                    <>
                      <div className="bg-emerald-400" style={{ width: `${(somaAVista / cobravel) * 100}%` }} title={`À vista ${BRL(somaAVista)}`} />
                      <div className="bg-amber-400" style={{ width: `${(somaRisco / cobravel) * 100}%` }} title={`Risco ${BRL(somaRisco)}`} />
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> À vista · {BRL(somaAVista)}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Risco/backlog · {BRL(somaRisco)}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> Cortesia · {BRL(somaCortesia)} (fora do caixa)</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                O teto é <strong>{BRL(cobravel)}</strong>, mas o que cai na Cora depende da cobrança, não do cliente.
                Confirmado até agora: <strong>{BRL(coraConfirmado)}</strong>
                {cobrancaGap > 0 && (
                  <> — faltam <strong className="text-red-600">{BRL(cobrancaGap)}</strong> de execução de cobrança (recolher, emitir, conciliar).</>
                )}
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
                          {s.estimado && <span className="text-orange-400" title="valor estimado">*</span>}
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
                <span className="text-orange-400">*</span> valor estimado (ticket mediano {BRL(ticketMediano)}) — o
                gestão registra a execução, não o valor. Recebimento é inferido; a forma de pagamento (à vista/parcelado)
                não vem da fonte.
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
                <strong>Leitura:</strong> {cobravel > 0 ? PCT(somaAVista / cobravel) : "—"} do cobrável é à vista e
                deveria cair na Cora em dias. O que espalha ou arrisca o caixa é o backlog/risco ({BRL(somaRisco)}). Se o
                à vista for recolhido e conciliado na hora, a maior parte do mês entra rápido — o resto é
                acompanhamento e cobrança do que ficou pendente.
              </p>
            </section>

            {/* 06 RECEBIMENTO NA CORA */}
            <section className="card p-5">
              <SecHead n="06" title="Recebimento na Cora" sub="Quanto vira caixa" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Teto (cobrável)</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{BRL(cobravel)}</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-blue-500">Confirmado na Cora</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">{BRL(coraConfirmado)}</div>
                  <div className="text-xs text-blue-900/60 mt-0.5">{cobravel > 0 ? PCT(coraConfirmado / cobravel) : "—"} do cobrável</div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-red-500">Falta executar (cobrança)</div>
                  <div className="text-2xl font-bold text-red-700 mt-1">{BRL(cobrancaGap)}</div>
                  <div className="text-xs text-red-900/60 mt-0.5">não depende do cliente — depende de recolher/conciliar</div>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                <div className="text-xs font-medium text-gray-500 mb-2">Para fechar o número exato</div>
                <ol className="space-y-1 text-xs text-gray-600">
                  <li className="flex gap-2"><span className="text-gray-400">1.</span> Forma de pagamento de cada OS (à vista / Nx) lançada no CRM.</li>
                  <li className="flex gap-2"><span className="text-gray-400">2.</span> Extrato da Cora do mês para marcar o que bateu.</li>
                  <li className="flex gap-2"><span className="text-gray-400">3.</span> Rodar a conciliação ENRD — hoje o gap é {BRL(cobrancaGap)}.</li>
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
