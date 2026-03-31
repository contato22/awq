import { Clock } from "lucide-react";

export default function ComingSoonPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Clock size={24} className="text-gray-400" />
      </div>
      <div className="text-base font-semibold text-gray-700">Em breve</div>
      <div className="text-sm text-gray-400 mt-1">Esta seção está sendo preparada.</div>
    </div>
  );
}
