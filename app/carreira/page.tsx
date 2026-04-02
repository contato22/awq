import Header from "@/components/Header";
import { Briefcase, Target, TrendingUp, Award, CheckCircle2, Clock, ArrowUpRight } from "lucide-react";

const okrs = [
  {
    objective: "Escalar o motor estratégico (JACQES)",
    keyResults: [
      { kr: "Atingir R$6M de receita anual até Q4/26", progress: 80, status: "on-track" },
      { kr: "Reduzir concentração: nenhum cliente > 25% da receita", progress: 60, status: "at-risk" },
      { kr: "Contratar 5 novos FTEs (tech + vendas)", progress: 40, status: "on-track" },
    ],
  },
  {
    objective: "Validar sleeve de captura (AWQ Venture)",
    keyResults: [
      { kr: "First close em R$50M+ até Q2/26", progress: 76, status: "on-track" },
      { kr: "4+ LPs confirmados", progress: 100, status: "done" },
      { kr: "Pipeline qualificado de 10+ startups", progress: 55, status: "on-track" },
    ],
  },
  {
    objective: "Estabilizar suporte tático (Caza Vision)",
    keyResults: [
      { kr: "Margem bruta acima de 60% consistentemente", progress: 85, status: "on-track" },
      { kr: "Reduzir dependência de projetos > R$500K", progress: 30, status: "at-risk" },
      { kr: "Lançar divisão de content tech", progress: 20, status: "behind" },
    ],
  },
];

const skills = [
  { area: "Strategic Finance", level: 85, target: 90 },
  { area: "Venture Capital", level: 70, target: 85 },
  { area: "Product Management", level: 78, target: 80 },
  { area: "Team Building", level: 65, target: 80 },
  { area: "Fundraising", level: 72, target: 85 },
  { area: "Operations", level: 80, target: 85 },
];

const milestones = [
  { label: "AWQ Group constituída",              done: true,  date: "2024" },
  { label: "JACQES lançada — primeiro cliente",  done: true,  date: "Q1/25" },
  { label: "Caza Vision integrada ao grupo",     done: true,  date: "Q2/25" },
  { label: "AWQ Venture — estruturação legal",   done: true,  date: "Q1/26" },
  { label: "First close AWQ Venture",            done: false, date: "Q2/26" },
  { label: "R$10M receita consolidada",          done: false, date: "Q4/26" },
  { label: "Segundo fundo + expansão LatAm",     done: false, date: "2027" },
];

const statusIcon: Record<string, { color: string; bg: string; label: string }> = {
  "on-track": { color: "text-emerald-600", bg: "bg-emerald-50", label: "No ritmo" },
  "at-risk":  { color: "text-amber-700",   bg: "bg-amber-50",   label: "Atenção" },
  "behind":   { color: "text-red-600",     bg: "bg-red-50",     label: "Atrasado" },
  "done":     { color: "text-emerald-600", bg: "bg-emerald-50", label: "Concluído" },
};

export default function CarreiraPage() {
  const totalKRs = okrs.reduce((s, o) => s + o.keyResults.length, 0);
  const doneKRs = okrs.reduce((s, o) => s + o.keyResults.filter((k) => k.status === "done").length, 0);
  const avgProgress = Math.round(okrs.reduce((s, o) => s + o.keyResults.reduce((ss, k) => ss + k.progress, 0), 0) / totalKRs);

  return (
    <>
      <Header title="Modo Carreira" subtitle="Desenvolvimento e gestão de carreira — AWQ Group" />
      <div className="px-8 py-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "OKRs Ativos", value: String(okrs.length), icon: Target, color: "text-brand-600", bg: "bg-brand-50" },
            { label: "Key Results", value: `${doneKRs}/${totalKRs}`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Progresso Médio", value: `${avgProgress}%`, icon: TrendingUp, color: "text-violet-700", bg: "bg-violet-50" },
            { label: "Skills em Dev", value: String(skills.length), icon: Award, color: "text-amber-700", bg: "bg-amber-50" },
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

        {/* OKRs */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">OKRs — Q2 2026</h2>
          <div className="space-y-5">
            {okrs.map((o) => (
              <div key={o.objective}>
                <div className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Target size={13} className="text-brand-600" />
                  {o.objective}
                </div>
                <div className="space-y-2 ml-5">
                  {o.keyResults.map((kr) => {
                    const st = statusIcon[kr.status];
                    return (
                      <div key={kr.kr}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-gray-600">{kr.kr}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${kr.status === "done" ? "bg-emerald-500" : kr.status === "at-risk" ? "bg-amber-500" : kr.status === "behind" ? "bg-red-500" : "bg-brand-500"}`}
                            style={{ width: `${kr.progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Skills */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Mapa de Competências</h2>
            <div className="space-y-3">
              {skills.map((s) => (
                <div key={s.area}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-800 font-medium">{s.area}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-gray-500">Atual: {s.level}</span>
                      <span className="text-brand-600 font-semibold">Meta: {s.target}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${s.level}%` }} />
                    <div className="absolute top-0 h-full w-0.5 bg-brand-800" style={{ left: `${s.target}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Career milestones */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Marcos de Trajetória</h2>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.done ? "bg-emerald-100" : "bg-gray-100"}`}>
                    {m.done ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Clock size={12} className="text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <div className={`text-xs font-medium ${m.done ? "text-gray-800" : "text-gray-400"}`}>{m.label}</div>
                    <div className="text-[10px] text-gray-400">{m.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
