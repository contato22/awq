import Header from "@/components/Header";
import { Users, Construction } from "lucide-react";

export default function CarteiraPage() {
  return (
    <>
      <Header title="Carteira" subtitle="Gestão de carteira de clientes — JACQES" />
      <EmptyState icon={Users} label="Carteira" />
    </>
  );
}

function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-600" />
      </div>
      <div className="text-base font-semibold text-gray-400">{label}</div>
      <div className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
        <Construction size={13} />
        Em construção — em breve
      </div>
    </div>
  );
}
