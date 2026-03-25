import Header from "@/components/Header";
import { Briefcase, Construction } from "lucide-react";

export default function CarreiraPage() {
  return (
    <>
      <Header title="Modo Carreira" subtitle="Desenvolvimento e gestão de carreira — AWQ Group" />
      <EmptyState icon={Briefcase} label="Modo Carreira" />
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
