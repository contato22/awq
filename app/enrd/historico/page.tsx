// ─── /enrd/historico — Histórico da BU desde dez/2025 ────────────────────────
// "O que essa BU já fez" — dois PERÍMETROS distintos, nunca misturados:
//   Integração (Felipe) — vendas de instalações novas (kWp), crm_opportunities
//   Pós-venda/O&M (Miguel) — serviços recorrentes, DUAS visões complementares:
//     "vendido no CRM" (ao vivo, pos_venda_servicos) e "executado desde o
//     início" (Cora real quando existe pro mês; senão backfill do CSV
//     histórico — nunca somados no mesmo mês).

import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import { getHistoricoOM, getHistoricoIntegracao, getHistoricoPosVendaVendido } from "@/lib/enrd-historico";
import { TrendingUp, Wrench, Info, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const PCT = (v: number) => `${(v * 100).toFixed(0)}%`;
const mesLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(".", "");
};
const STAGE_LABEL: Record<string, string> = {
  qualification: "Qualificação",
  proposal: "Proposta",
  negotiation: "Negociação",
};

export default async function EnrdHistoricoPage() {
  const [integracao, pvVendido, om] = await Promise.all([
    getHistoricoIntegracao(),
    getHistoricoPosVendaVendido(),
    getHistoricoOM(),
  ]);

  return (
    <>
      <Header title="Histórico — ENRD" subtitle="Desde dez/2025 · Agência Solar · AWQ Group" />
      <div className="page-container">
        <div className="card p-5 bg-gradient-to-br from-orange-50/70 via-white to-white border-orange-100">
          <p className="text-sm text-gray-700">
            O que a BU já fez desde o início — <strong>dois perímetros que nunca se misturam</strong>:{" "}
            <strong>Integração</strong> (Felipe — vende sistema novo, kWp) e <strong>Pós-venda/O&amp;M</strong>{" "}
            (Miguel — serviço recorrente: limpeza, manutenção, disjuntor). Cada um com sua própria fonte de
            verdade, nunca somados um no outro.
          </p>
        </div>

        {/* ───────── INTEGRAÇÃO (Felipe) ───────── */}
        <section className="card p-5">
          <SectionHeader icon={<Zap size={14} className="text-blue-600" />} title="Integração — vendas de instalações novas (Felipe)" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-blue-600">Total vendido</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{BRL(integracao.totalVendido)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{integracao.nVendasFechadas} negócios fechados</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Funil aberto</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{BRL(integracao.totalFunilAberto)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{integracao.funilAberto.reduce((s, f) => s + f.nDeals, 0)} negócios em andamento</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Taxa de conversão</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{PCT(integracao.taxaConversao)}</div>
              <div className="text-xs text-gray-500 mt-0.5">fechados ÷ (fechados + perdidos)</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Ticket médio (fechado)</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {BRL(integracao.nVendasFechadas > 0 ? integracao.totalVendido / integracao.nVendasFechadas : 0)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">total vendido ÷ nº fechados</div>
            </div>
          </div>

          {integracao.vendidoPorMes.length > 0 ? (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-3 font-medium text-gray-400 uppercase tracking-wide">Mês</th>
                    <th className="text-left py-2 pr-3 font-medium text-gray-400 uppercase tracking-wide">Negócios fechados</th>
                    <th className="text-left py-2 pr-3 font-medium text-gray-400 uppercase tracking-wide">Valor vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {integracao.vendidoPorMes.map((m) => (
                    <tr key={m.mes} className="border-b border-gray-50">
                      <td className="py-2 pr-3 font-medium text-gray-900 capitalize">{mesLabel(m.mes)}</td>
                      <td className="py-2 pr-3 text-gray-700">{m.nDeals}</td>
                      <td className="py-2 pr-3 text-blue-700 font-semibold">{BRL(m.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-4">Nenhum fechamento com data registrada ainda.</p>
          )}

          {integracao.funilAberto.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {integracao.funilAberto.map((f) => (
                <span key={f.stage} className="text-xs rounded-full border border-gray-200 px-2.5 py-1 text-gray-600">
                  {STAGE_LABEL[f.stage] ?? f.stage}: <strong>{f.nDeals}</strong> · {BRL(f.valor)}
                </span>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            Fonte: <code>crm_opportunities</code> (originadas da tabela <code>negocios</code> do projetos.enerdy —
            tem kWp/fornecedor de kit, é venda de sistema novo). Bucketizado pela{" "}
            <strong>data real de fechamento</strong> — só entra quem de fato fechou.
          </p>
        </section>

        {/* ───────── PÓS-VENDA / O&M (Miguel) ───────── */}
        <section className="card p-5">
          <SectionHeader icon={<Wrench size={14} className="text-orange-600" />} title="Pós-venda / O&M — vendido no CRM (Miguel)" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-orange-600">Total vendido (ao vivo)</div>
              <div className="text-2xl font-bold text-orange-700 mt-1">{BRL(pvVendido.totalVendido)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{pvVendido.nServicos} serviços com valor lançado</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Por status</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {pvVendido.porStatus.map((s) => (
                  <span key={s.status} className="text-[10px] rounded-full border border-gray-200 px-2 py-0.5 text-gray-600">
                    {s.status}: {s.n} · {BRL(s.valor)}
                  </span>
                ))}
                {pvVendido.porStatus.length === 0 && <span className="text-xs text-gray-300">sem dado ainda</span>}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            Fonte: <code>pos_venda_servicos</code> ao vivo — perímetro O&amp;M só (exclui montagem/híbrido, mesmo
            filtro do resto do BI). Sistema de gestão novo — histórico curto por enquanto; para a régua completa
            desde set/2025, ver abaixo.
          </p>
        </section>

        <section className="card p-5">
          <SectionHeader icon={<Wrench size={14} className="text-orange-600" />} title="Pós-venda / O&M — executado desde set/2025" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-orange-600">Total histórico</div>
              <div className="text-2xl font-bold text-orange-700 mt-1">{BRL(om.totalValor)}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {om.meses.filter((m) => m.fonte !== "sem_dado").length} de {om.meses.length} meses com dado
                {om.totalOS > 0 && <> · {om.totalOS} serviços (CSV)</>}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Desde</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{mesLabel(om.desde)}</div>
              <div className="text-xs text-gray-500 mt-0.5">início do backfill (CSV Notion)</div>
            </div>
            {om.nMontagemExcluida > 0 && (
              <div className="rounded-xl border border-gray-100 p-3.5">
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Excluídas (perímetro)</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{om.nMontagemExcluida}</div>
                <div className="text-xs text-gray-500 mt-0.5">OS de montagem no backfill, fora do O&amp;M</div>
              </div>
            )}
          </div>

          {om.meses.every((m) => m.fonte === "sem_dado") && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-900">
                <strong>Sem dado ainda.</strong> O backfill do CSV histórico está parseado e pronto, mas a
                tabela <code>enrd_posvenda_os</code> ainda não existe no banco — rode a migração combinada em{" "}
                <code>/api/enrd/setup/migrate</code> e o histórico aparece aqui automaticamente.
              </p>
            </div>
          )}

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-3 font-medium text-gray-400 uppercase tracking-wide">Mês</th>
                  <th className="text-left py-2 pr-3 font-medium text-gray-400 uppercase tracking-wide">Serviços</th>
                  <th className="text-left py-2 pr-3 font-medium text-gray-400 uppercase tracking-wide">Valor</th>
                  <th className="text-left py-2 pr-3 font-medium text-gray-400 uppercase tracking-wide">Fonte</th>
                </tr>
              </thead>
              <tbody>
                {om.meses.map((m) => (
                  <tr key={m.mes} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-medium text-gray-900 capitalize">{mesLabel(m.mes)}</td>
                    <td className="py-2 pr-3 text-gray-700">{m.nOS || "—"}</td>
                    <td className="py-2 pr-3 font-semibold text-gray-900">{m.valor > 0 ? BRL(m.valor) : "—"}</td>
                    <td className="py-2 pr-3">
                      {m.fonte === "cora_real" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Cora · real</span>
                      )}
                      {m.fonte === "csv_historico" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">CSV · histórico</span>
                      )}
                      {m.fonte === "sem_dado" && <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            <strong>Cora · real</strong> = dinheiro que de fato entrou no banco naquele mês (mesma
            reconciliação do relatório/BI diário). <strong>CSV · histórico</strong> = valor lançado no CRM
            (Notion) pré-conciliação bancária — só aparece nos meses em que a Cora ainda não tem dado, e já
            excluído de OS de montagem que vieram junto no backfill. Nunca somados no mesmo mês.
          </p>
        </section>
      </div>
    </>
  );
}
