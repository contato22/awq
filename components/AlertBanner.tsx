import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { Alert } from "@/lib/data";
import { cn } from "@/lib/utils";

const alertConfig = {
  warning: {
    Icon: AlertTriangle,
    classes: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
    dot: "bg-yellow-400",
  },
  info: {
    Icon: Info,
    classes: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    dot: "bg-blue-400",
  },
  success: {
    Icon: CheckCircle,
    classes: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    dot: "bg-emerald-400",
  },
  error: {
    Icon: XCircle,
    classes: "border-red-500/30 bg-red-500/5 text-red-400",
    dot: "bg-red-400",
  },
};

interface AlertBannerProps {
  alert: Alert;
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  const config = alertConfig[alert.type];
  const { Icon } = config;

  return (
    <div className={cn("flex items-start gap-3 p-3.5 rounded-lg border", config.classes)}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{alert.title}</div>
        <div className="text-xs opacity-75 mt-0.5 leading-relaxed">{alert.message}</div>
      </div>
    </div>
  );
}
