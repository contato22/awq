import { AlertTriangle } from "lucide-react";
import { DATA_STATUS_LABEL } from "@/lib/awq-group-data";

interface AwqEmptyStateProps {
  title?: string;
  message?: string;
}

export default function AwqEmptyState({
  title = "Sem dados disponíveis",
  message = DATA_STATUS_LABEL,
}: AwqEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
        <AlertTriangle size={20} className="text-amber-600" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-md">{message}</p>
    </div>
  );
}
