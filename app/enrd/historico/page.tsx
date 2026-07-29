// ─── /enrd/historico — Histórico da BU desde dez/2025 ────────────────────────
// "O que essa BU já fez" — vendas fechadas + serviços de pós-venda/O&M desde o
// início, mês a mês. Duas linhas do tempo com fontes DISTINTAS:
//   Vendas    — crm_opportunities (bu=ENRD), fechamentos reais (actual_close_date)
//   Pós-venda — Cora real quando existe pro mês; senão, backfill do CSV
//               histórico (Notion) — nunca os dois somados no mesmo mês.

import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import { getHistoricoOM, getHistoricoVendas } from "@/lib/enrd-historico";
import { TrendingUp, Wrench, Info } from "lucide-react";

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
  const [vendas, om] = await Promise.all([getHistoricoVendas(), getHistoricoOM()]);

  return (
    <>
      <Header title="Histórico — ENRD" subtitle="Desde dez/2025 · Agência Solar · AWQ Group" />
      <div className="page-container">
        <div className="card p-5 bg-gradient-to-br from-orange-50/70 via-white to-white border-orange-100">
          <p className="text-sm text-gray-700">
            O que a BU já fez desde o início — <strong>duas linhas do tempo com fontes distintas</strong>:
            vendas fechadas no CRM e serviços de pós-venda/O&amp;M (Cora real quando existe pro mês, senão o
            histórico importado do CSV — nunca somados no mesmo mês, pra não duplicar).
          </p>
        </div>

        {/* ───────── VENDAS (comercial) ───────── */}
        <section className="card p-5">
          <SectionHeader icon={<TrendingUp size={14} className="text-emerald-600" />} title="Vendas fechadas" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-emerald-600">Total vendido</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{BRL(vendas.totalVendido)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{vendas.nVendasFechadas} negócios fechados</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Funil aberto</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{BRL(vendas.totalFunilAberto)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{vendas.funilAberto.reduce((s, f) => s + f.nDeals, 0)} negócios em andamento</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Taxa de conversão</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{PCT(vendas.taxaConversao)}</div>
              <div className="text-xs text-gray-500 mt-0.5">fechados ÷ (fechados + perdidos)</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3.5">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Ticket médio (fechado)</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {BRL(vendas.nVendasFechadas > 0 ? vendas.totalVendido / vendas.nVendasFechadas : 0)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">total vendido ÷ nº fechados</div>
            </div>
          </div>

          {vendas.vendidoPorMes.length > 0 ? (
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
                  {vendas.vendidoPorMes.map((m) => (
                    <tr key={m.mes} className="border-b border-gray-50">
                      <td className="py-2 pr-3 font-medium text-gray-900 capitalize">{mesLabel(m.mes)}</td>
                      <td className="py-2 pr-3 text-gray-700">{m.nDeals}</td>
                      <td className="py-2 pr-3 text-emerald-700 font-semibold">{BRL(m.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-4">Nenhum fechamento com data registrada ainda.</p>
          )}

          {vendas.funilAberto.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {vendas.funilAberto.map((f) => (
                <span key={f.stage} className="text-xs rounded-full border border-gray-200 px-2.5 py-1 text-gray-600">
                  {STAGE_LABEL[f.stage] ?? f.stage}: <strong>{f.nDeals}</strong> · {BRL(f.valor)}
                </span>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            Bucketizado pela <strong>data real de fechamento</strong> (actual_close_date) — só entra aqui quem
            de fato fechou. O funil aberto é uma foto do agora, não tem data de origem confiável pra
            distribuir por mês.
          </p>
        </section>

        {/* ───────── PÓS-VENDA / O&M ───────── */}
        <section className="card p-5">
          <SectionHeader icon={<Wrench size={14} className="text-orange-600" />} title="Pós-venda / O&M — desde set/2025" />
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
          </div>

          {om.meses.every((m) => m.fonte === "sem_dado") && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-900">
                <strong>Sem dado ainda.</strong> O backfill do CSV histórico (301 serviços, ~R$78k) está
                parseado e pronto, mas a tabela <code>enrd_posvenda_os</code> ainda não existe no banco —
                rode a migração combinada em <code>/api/enrd/setup/migrate</code> e o histórico aparece aqui
                automaticamente.
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
            (Notion) pré-conciliação bancária — só aparece nos meses em que a Cora ainda não tem dado. Nunca
            somados no mesmo mês.
          </p>
        </section>
      </div>
    </>
  );
}
