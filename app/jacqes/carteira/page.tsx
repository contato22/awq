import Header from "@/components/Header";
import { Users, DollarSign, CheckCircle2, Clock, TrendingUp } from "lucide-react";

// ─── /jacqes/carteira — Carteira de Contratos JACQES ─────────────────────────
// SOURCE: Notion CRM · snapshot Abr/2026
// Dados fornecidos diretamente pelo usuário (campo "Valor a Receber")

const contratos = [
  { cliente: "CEM",             tipo: "FEE", fee: 3_200, status: "Pago"     },
  { cliente: "CAROL BERTOLINI", tipo: "FEE", fee: 1_790, status: "Pendente" },
  { cliente: "ANDRÉ VIEIRA",    tipo: "FEE", fee: 1_500, status: "Pendente" },
  { cliente: "TATI SIMÕES",     tipo: "FEE", fee: 1_790, status: "Pago"     },
];

const totalMRR  = contratos.reduce((s, c) => s + c.fee, 0);          // 8.280
const totalPago = contratos.filter(c => c.status === "Pago")
                            .reduce((s, c) => s + c.fee, 0);          // 4.990
const totalPend = contratos.filter(c => c.status === "Pendente")
                            .reduce((s, c) => s + c.fee, 0);          // 3.290
const taxaColeta = Math.round((totalPago / totalMRR) * 100);          // 60%

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export default function CarteiraPage() {
  return (
    <>
      <Header
        title="Carteira"
        subtitle="Gestão de contratos · Notion CRM · Abr/2026"
      />
      <div className="page-container">

        {/* ── KPIs ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Contratos Ativos",
              value: String(contratos.length),
              sub:   "Notion CRM · Abr/2026",
              icon:  Users,
              color: "text-brand-600",
              bg:    "bg-brand-50",
            },
            {
              label: "MRR Contratado",
              value: fmtR(totalMRR),
              sub:   "Soma dos FEEs mensais",
              icon:  DollarSign,
              color: "text-emerald-600",
              bg:    "bg-emerald-50",
            },
            {
              label: "Recebido",
              value: fmtR(totalPago),
              sub:   `${contratos.filter(c => c.status === "Pago").length} contratos pagos`,
              icon:  CheckCircle2,
              color: "text-emerald-700",
              bg:    "bg-emerald-50",
            },
            {
              label: "Taxa de Coleta",
              value: taxaColeta + "%",
              sub:   `${fmtR(totalPend)} pendente`,
              icon:  TrendingUp,
              color: taxaColeta >= 80 ? "text-emerald-600" : "text-amber-700",
              bg:    taxaColeta >= 80 ? "bg-emerald-50" : "bg-amber-50",
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

        {/* ── Carteira de contratos ──────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Contratos Ativos
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">NOTION</span>
            </h2>
            <span className="text-[11px] text-gray-400">Abr/2026</span>
          </div>

          <div className="space-y-3">
            {contratos.map((c) => {
              const share = Math.round((c.fee / totalMRR) * 100);
              const isPago = c.status === "Pago";
              return (
                <div key={c.cliente} className={`rounded-xl border p-4 ${isPago ? "border-emerald-100 bg-emerald-50/40" : "border-amber-100 bg-amber-50/40"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${isPago ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {c.cliente.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{c.cliente}</div>
                        <div className="text-[10px] text-gray-400">{c.tipo} · {share}% do MRR</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">{fmtR(c.fee)}</span>
                      {isPago ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock size={10} /> Pendente
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Barra de participação */}
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPago ? "bg-emerald-500" : "bg-amber-400"}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totalizador */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Pago: {fmtR(totalPago)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Pendente: {fmtR(totalPend)}
              </span>
            </div>
            <div className="text-sm font-bold text-gray-900">
              Total: {fmtR(totalMRR)}
            </div>
          </div>

          {/* Barra de coleta geral */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>Taxa de coleta deste ciclo</span>
              <span className="font-semibold text-gray-600">{taxaColeta}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${taxaColeta}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
