import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Users } from "lucide-react";

export default function CarteiraPage() {
  return (
    <>
      <Header title="Carteira" subtitle="Gestão de carteira de clientes — JACQES" />
      <EmptyState
        icon={<Users size={20} className="text-gray-400" />}
        title="Carteira"
        description="Em construção — em breve"
        className="h-[60vh]"
      />
    </>
  );
}
