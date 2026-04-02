import Header from "@/components/Header";
import { DollarSign, TrendingUp, CheckCircle2, Clock, FileText, Users } from "lucide-react";

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

const lps = [
  { id: "LP01", name: "Família Rocha",       type: "Family Office",       commitment: 15_000_000, called: 8_500_000,  status: "Confirmado" },
  { id: "LP02", name: "TechCorp Ventures",   type: "Corporate Strategic", commitment: 10_000_000, called: 5_600_000,  status: "Confirmado" },
  { id: "LP03", name: "FoF Atlântica",       type: "Fund of Funds",       commitment: 8_000_000,  called: 4_500_000,  status: "Confirmado" },
  { id: "LP04", name: "Dr. Marcos Faria",    type: "Investidor Qualif.",  commitment: 5_000_000,  called: 2_800_000,  status: "Confirmado" },
  { id: "LP05", name: "Grupo Industrial BH", type: "Corporate Strategic", commitment: 7_000_000,  called: 0,          status: "Em negociação" },
  { id: "LP06", name: "LatAm FoF II",        type: "Fund of Funds",       commitment: 12_000_000, called: 0,          status: "Em due diligence" },
];

const totalCommitment = lps.reduce((s, lp) => s + lp.commitment, 0);
const totalCalled = lps.reduce((s, lp) => s + lp.called, 0);
const confirmed = lps.filter((lp) => lp.status === "Confirmado");

const timeline = [
  { date: "Jan/26", event: "Início captação — LP outreach",     done: true },
  { date: "Fev/26", event: "Documentação regulatória completa", done: true },
  { date: "Mar/26", event: "4 LPs confirmados — R$38M",        done: true },
  { date: "Abr/26", event: "Due diligence LatAm FoF II",       done: false },
  { date: "Mai/26", event: "First close target — R$50M+",      done: false },
  { date: "Jun/26", event: "Primeiro deployment",               done: false },
];

const documents = [
  { name: "Regulamento do Fundo",      status: "Finalizado",    date: "Mar/26" },
  { name: "Memorando de Oferta",       status: "Finalizado",    date: "Mar/26" },
  { name: "Acordo de Cotistas",        status: "Em revisão",    date: "Abr/26" },
  { name: "Relatório Q1 2026",         status: "Em elaboração", date: "Abr/26" },
  { name: "Política de Investimentos", status: "Finalizado",    date: "Fev/26" },
];

const badge: Record<string, string> = {
  "Confirmado": "bg-emerald-50 text-emerald-600 border border-emerald-200",
  "Em negociação": "bg-amber-50 text-amber-700 border border-amber-200",
  "Em due diligence": "bg-brand-50 text-brand-600 border border-brand-200",
  "Finalizado": "bg-emerald-50 text-emerald-600 border border-emerald-200",
  "Em revisão": "bg-amber-50 text-amber-700 border border-amber-200",
  "Em elaboração": "bg-brand-50 text-brand-600 border border-brand-200",
};

export default function RIPage() {
  return (
    <>
      <Header title="Relação com Investidores — AWQ Venture" subtitle={`${lps.length} LPs · ${fmtR(totalCommitment)} em compromisso`} />
      <div className="px-8 py-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Compromisso Total", value: fmtR(totalCommitment), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Capital Chamado",   value: fmtR(totalCalled),     icon: TrendingUp, color: "text-brand-600",   bg: "bg-brand-50" },
            { label: "LPs Confirmados",   value: String(confirmed.length), icon: CheckCircle2, color: "text-violet-700", bg: "bg-violet-50" },
            { label: "Em Pipeline",       value: String(lps.length - confirmed.length), icon: Clock, color: "text-amber-700", bg: "bg-amber-50" },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}><Icon size={18} className={kpi.color} /></div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Base de LPs</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">LP</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Compromisso</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Chamado</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {lps.map((lp) => (
                  <tr key={lp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-medium text-gray-800">{lp.name}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{lp.type}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(lp.commitment)}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(lp.called)}</td>
                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge[lp.status] ?? ""}`}>{lp.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Timeline de Captação</h2>
              <div className="space-y-3">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${t.done ? "bg-emerald-100" : "bg-gray-100"}`}>
                      {t.done ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Clock size={12} className="text-gray-400" />}
                    </div>
                    <div>
                      <div className={`text-xs font-medium ${t.done ? "text-gray-800" : "text-gray-400"}`}>{t.event}</div>
                      <div className="text-[10px] text-gray-400">{t.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Documentação</h2>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileText size={14} className="text-gray-400" />
                      <div>
                        <div className="text-xs font-medium text-gray-800">{doc.name}</div>
                        <div className="text-[10px] text-gray-400">{doc.date}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge[doc.status] ?? "bg-gray-100 text-gray-500"}`}>{doc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
