import Header from "@/components/Header";
import { Building2, Construction } from "lucide-react";

export default function CazaVisionPage() {
  return (
    <>
      <Header title="Caza Vision" subtitle="Tecnologia · AWQ Group" />
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
          <Building2 size={28} className="text-emerald-400" />
        </div>
        <div className="text-base font-semibold text-gray-300">Caza Vision</div>
        <div className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
          <Construction size={13} />Em construção — em breve
        </div>
      </div>
    </>
  );
}
