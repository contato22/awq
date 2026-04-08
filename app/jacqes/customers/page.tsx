import Header from "@/components/Header";
import { Users, DollarSign, CheckCircle2, Clock, Info } from "lucide-react";

// ─── /jacqes/customers — Carteira JACQES ──────────────────────────────────────
//
// SOURCE: Notion CRM — snapshot recebido diretamente pelo usuário (Abr/2026)
//   4 clientes reais com FEE mensal contratado
//
// REGRA: apenas dados com origem confirmada. Nomes, valores e status são
// exatamente os fornecidos. Nenhum campo foi interpolado ou estimado.

// ─── Clientes reais (Notion CRM) ─────────────────────────────────────────────
const clientes = [
  { projeto: "CEM",            tipo: "FEE", fee: 3_200, status: "Pago"     },
  { projeto: "CAROL BERTOLINI",tipo: "FEE", fee: 1_790, status: "Pendente" },
  { projeto: "ANDRÉ VIEIRA",   tipo: "FEE", fee: 1_500, status: "Pendente" },
  { projeto: "TATI SIMÕES",    tipo: "FEE", fee: 1_790, status: "Pago"     },
];

// ─── Métricas derivadas dos dados acima ──────────────────────────────────────
const totalMRR   = clientes.reduce((s, c) => s + c.fee, 0);          // 8.280
const totalPago  = clientes.filter(c => c.status === "Pago")
                           .reduce((s, c) => s + c.fee, 0);           // 4.990
const totalPend  = clientes.filter(c => c.status === "Pendente")
                           .reduce((s, c) => s + c.fee, 0);           // 3.290
const mrrMedio   = Math.round(totalMRR / clientes.length);            // 2.070

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export default function JacqesCustomersPage() {
  return (
    <>
      <Header
        title="Customers — JACQES"
        subtitle="Carteira de clientes · Notion CRM · Abr/2026"
      />
      <div className="page-container">

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Contas Ativas",
              value: String(clientes.length),
              sub:   "Notion CRM · Abr/2026",
              icon:  Users,
              color: "text-brand-600",
              bg:    "bg-brand-50",
            },
            {
              label: "MRR Total Contratado",
              value: fmtR(totalMRR),
              sub:   "Soma dos FEEs mensais",
              icon:  DollarSign,
              color: "text-emerald-600",
              bg:    "bg-emerald-50",
            },
            {
              label: "Recebido (Pago)",
              value: fmtR(totalPago),
              sub:   `${clientes.filter(c => c.status === "Pago").length} clientes · Pago`,
              icon:  CheckCircle2,
              color: "text-emerald-700",
              bg:    "bg-emerald-50",
            },
            {
              label: "A Receber (Pendente)",
              value: fmtR(totalPend),
              sub:   `${clientes.filter(c => c.status === "Pendente").length} clientes · Pendente`,
              icon:  Clock,
              color: "text-amber-700",
              bg:    "bg-amber-50",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Tabela de clientes ────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Carteira de Clientes
              <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">NOTION</span>
            </h2>
            <span className="text-[11px] text-gray-400">
              MRR médio: {fmtR(mrrMedio)}/cliente
            </span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Fee Mensal</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.projeto} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 text-xs font-semibold text-gray-900">{c.projeto}</td>
                    <td className="py-3 px-3 text-xs text-gray-500">{c.tipo}</td>
                    <td className="py-3 px-3 text-right text-xs font-semibold text-gray-900">
                      {fmtR(c.fee)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {c.status === "Pago" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock size={10} /> Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td colSpan={2} className="py-2.5 px-3 text-xs font-bold text-gray-500">
                    Total · {clientes.length} clientes
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">
                    {fmtR(totalMRR)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Nota de fonte ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
          <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Dados originados diretamente do Notion CRM (campo &quot;Valor a Receber&quot; · snapshot Abr/2026).
            Campos não disponíveis no snapshot (LTV, NPS, data de início, histórico de churn)
            serão exibidos após integração completa da base Notion.
          </p>
        </div>

      </div>
    </>
  );
}
