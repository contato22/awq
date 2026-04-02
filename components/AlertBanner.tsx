import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { Alert } from "@/lib/data";
import { cn } from "@/lib/utils";

const alertConfig = {
  warning: {
    Icon: AlertTriangle,
    classes: "border-amber-200 bg-amber-50 text-amber-800",
  },
  info: {
    Icon: Info,
    classes: "border-blue-200 bg-blue-50 text-blue-800",
  },
  success: {
    Icon: CheckCircle,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  error: {
    Icon: XCircle,
    classes: "border-red-200 bg-red-50 text-red-800",
  },
};

interface AlertBannerProps {
  alert: Alert;
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  const config = alertConfig[alert.type];
  const { Icon } = config;

  return (
    <div className={cn("flex items-start gap-3 p-3.5 rounded-xl border", config.classes)}>
      <Icon size={15} className="mt-0.5 shrink-0 opacity-80" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{alert.title}</div>
        <div className="text-xs opacity-75 mt-0.5 leading-relaxed">{alert.message}</div>
      </div>
    </div>
  );
}
