import Header from "@/components/Header";
import { TrendingUp, Construction } from "lucide-react";

export default function AwqVenturePage() {
  return (
    <>
      <Header title="AWQ Venture" subtitle="Investimentos · AWQ Group" />
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <TrendingUp size={28} className="text-amber-400" />
        </div>
        <div className="text-base font-semibold text-gray-300">AWQ Venture</div>
        <div className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
          <Construction size={13} />Em construção — em breve
        </div>
      </div>
    </>
  );
}
