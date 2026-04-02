import { AlertTriangle } from "lucide-react";
import { DATA_VERIFIED, DATA_STATUS_LABEL } from "@/lib/awq-group-data";

export default function AwqDataBanner() {
  if (DATA_VERIFIED) return null;
  return (
    <div className="mx-8 mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
      <div>
        <span className="text-xs font-semibold text-amber-800">Aviso de governança</span>
        <span className="text-xs text-amber-700 ml-1">— {DATA_STATUS_LABEL}</span>
      </div>
    </div>
  );
}
