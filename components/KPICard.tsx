import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { KPI } from "@/lib/data";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  DollarSign,
  Users,
  ShoppingCart,
  TrendingUp,
};

const colorMap: Record<string, string> = {
  brand: "text-brand-400 bg-brand-500/10 border-brand-500/20",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

function formatValue(kpi: KPI): string {
  if (kpi.unit === "currency") return formatCurrency(kpi.value, "USD", true);
  if (kpi.unit === "percent") return `${kpi.value.toFixed(1)}%`;
  return formatNumber(kpi.value, true);
}

interface KPICardProps {
  kpi: KPI;
}

export default function KPICard({ kpi }: KPICardProps) {
  const Icon = iconMap[kpi.icon] ?? TrendingUp;
  const delta = ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100;
  const isPositive = delta >= 0;
  const colorClasses = colorMap[kpi.color] ?? colorMap.brand;

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", colorClasses)}>
          <Icon size={18} />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
            isPositive
              ? "text-emerald-400 bg-emerald-500/10"
              : "text-red-400 bg-red-500/10"
          )}
        >
          {isPositive ? (
            <ArrowUpRight size={12} />
          ) : (
            <ArrowDownRight size={12} />
          )}
          {formatPercent(Math.abs(delta), 1).replace("+", "")}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold text-white tabular-nums">
          {formatValue(kpi)}
        </div>
        <div className="text-sm text-gray-500">{kpi.label}</div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800">
        <span className="text-xs text-gray-600">
          vs prev period:{" "}
          <span className={cn("font-medium", isPositive ? "text-emerald-500" : "text-red-500")}>
            {isPositive ? "+" : ""}
            {kpi.unit === "currency"
              ? formatCurrency(kpi.value - kpi.previousValue, "USD", true)
              : kpi.unit === "percent"
              ? `${(kpi.value - kpi.previousValue).toFixed(1)}pp`
              : formatNumber(kpi.value - kpi.previousValue, true)}
          </span>
        </span>
      </div>
    </div>
  );
}
