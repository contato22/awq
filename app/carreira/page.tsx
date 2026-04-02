import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Briefcase } from "lucide-react";

export default function CarreiraPage() {
  return (
    <>
      <Header title="Modo Carreira" subtitle="Desenvolvimento e gestão de carreira — AWQ Group" />
      <EmptyState
        icon={<Briefcase size={20} className="text-gray-400" />}
        title="Modo Carreira"
        description="Em construção — em breve"
        className="h-[60vh]"
      />
    </>
  );
}
