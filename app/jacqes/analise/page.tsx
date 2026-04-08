import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Activity } from "lucide-react";

export default function AnalisePage() {
  return (
    <>
      <Header title="Análise" subtitle="Análise avançada de dados — JACQES" />
      <EmptyState
        icon={<Activity size={20} className="text-gray-400" />}
        title="Análise"
        description="Em construção — em breve"
        className="h-[60vh]"
      />
    </>
  );
}
