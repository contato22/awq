import { AlertTriangle, XCircle, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StorageStatus, StorageLayerStatus } from "@/lib/storage-status";

function fmt(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  if (bytes >= 1024)         return (bytes / 1024).toFixed(0) + " KB";
  return bytes + " B";
}

function ProgressBar({ pct, level }: { pct: number; level: StorageLayerStatus["level"] }) {
  const barColor =
    level === "critical" ? "bg-red-500" :
    level === "warning"  ? "bg-amber-500" :
    "bg-emerald-500";

  return (
    <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", barColor)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function LayerRow({ layer }: { layer: StorageLayerStatus }) {
  const textColor =
    layer.level === "critical" ? "text-red-700" :
    layer.level === "warning"  ? "text-amber-700" :
    "text-gray-600";

  const effectivePct = Math.max(layer.pctCount, layer.pctBytes ?? 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className={cn("font-semibold", textColor)}>{layer.label}</span>
        <span className={cn("tabular-nums", textColor)}>
          {layer.count.toLocaleString("pt-BR")} / {layer.maxCount.toLocaleString("pt-BR")} registros
          {layer.usedBytes !== null && layer.maxBytes !== null && (
            <span className="ml-2 opacity-70">
              · {fmt(layer.usedBytes)} / {fmt(layer.maxBytes)}
            </span>
          )}
          <span className="ml-2 font-bold">{effectivePct}%</span>
        </span>
      </div>
      <ProgressBar pct={effectivePct} level={layer.level} />
    </div>
  );
}

interface StorageWarningBannerProps {
  status: StorageStatus;
  compact?: boolean;
}

export default function StorageWarningBanner({ status, compact = false }: StorageWarningBannerProps) {
  if (!status.hasWarning) return null;

  const isCritical = status.hasCritical;

  const containerCls = isCritical
    ? "border-red-200 bg-red-50"
    : "border-amber-200 bg-amber-50";

  const Icon   = isCritical ? XCircle : AlertTriangle;
  const iconCls = isCritical ? "text-red-500" : "text-amber-500";
  const titleCls = isCritical ? "text-red-800" : "text-amber-800";
  const msgCls   = isCritical ? "text-red-700" : "text-amber-700";

  const title = isCritical
    ? "Capacidade de storage crítica"
    : "Capacidade de storage próxima do limite";

  const message = isCritical
    ? "Uma ou mais camadas de dados está acima de 95% da capacidade. Exporte ou limpe dados antes de continuar."
    : "Uma ou mais camadas de dados está acima de 80% da capacidade. Considere aumentar os limites de storage ou arquivar dados antigos.";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", containerCls)}>
        <Icon size={13} className={cn("shrink-0", iconCls)} />
        <span className={cn("text-[11px] font-semibold", titleCls)}>{title}</span>
        <span className={cn("text-[11px] opacity-70 ml-1", msgCls)}>
          {[status.macro, status.micro]
            .filter((l) => l.level !== "ok")
            .map((l) => `${l.label}: ${Math.max(l.pctCount, l.pctBytes ?? 0)}%`)
            .join(" · ")}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", containerCls)}>
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <HardDrive size={14} className={iconCls} />
          <Icon size={14} className={iconCls} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-xs font-bold", titleCls)}>{title}</div>
          <div className={cn("text-[11px] mt-0.5", msgCls)}>{message}</div>
        </div>
      </div>
      <div className="space-y-2.5 pl-7">
        {status.macro.level !== "ok" && <LayerRow layer={status.macro} />}
        {status.micro.level !== "ok" && <LayerRow layer={status.micro} />}
      </div>
    </div>
  );
}
