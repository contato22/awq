import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { TrendingUp } from "lucide-react";

export default function DesempenhoPage() {
  return (
    <>
      <Header title="Desempenho" subtitle="Métricas de desempenho operacional — JACQES" />
      <EmptyState
        icon={<TrendingUp size={20} className="text-gray-400" />}
        title="Desempenho"
        description="Em construção — em breve"
        className="h-[60vh]"
      />
    </>
  );
}
