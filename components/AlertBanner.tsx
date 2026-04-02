import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { Alert } from "@/lib/data";
import { cn } from "@/lib/utils";

const alertConfig = {
  warning: {
    Icon: AlertTriangle,
    classes: "border-amber-200/60 bg-amber-50 text-amber-800",
    iconColor: "text-amber-500",
  },
  info: {
    Icon: Info,
    classes: "border-blue-200/60 bg-blue-50 text-blue-800",
    iconColor: "text-blue-500",
  },
  success: {
    Icon: CheckCircle,
    classes: "border-emerald-200/60 bg-emerald-50 text-emerald-800",
    iconColor: "text-emerald-500",
  },
  error: {
    Icon: XCircle,
    classes: "border-red-200/60 bg-red-50 text-red-800",
    iconColor: "text-red-500",
  },
};

interface AlertBannerProps {
  alert: Alert;
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  const config = alertConfig[alert.type];
  const { Icon } = config;

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-lg border", config.classes)}>
      <Icon size={14} className={cn("mt-0.5 shrink-0", config.iconColor)} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold">{alert.title}</div>
        <div className="text-[11px] opacity-70 mt-0.5 leading-relaxed">{alert.message}</div>
      </div>
    </div>
  );
}
