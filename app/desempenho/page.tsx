import Header from "@/components/Header";
import { TrendingUp, Construction } from "lucide-react";

export default function DesempenhoPage() {
  return (
    <>
      <Header title="Desempenho" subtitle="Métricas de desempenho operacional — JACQES" />
      <EmptyState icon={TrendingUp} label="Desempenho" />
    </>
  );
}

function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-400" />
      </div>
      <div className="text-base font-semibold text-gray-900">{label}</div>
      <div className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
        <Construction size={13} />
        Em construção — em breve
      </div>
    </div>
  );
}
