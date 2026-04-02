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

const colorMap: Record<string, { icon: string; bg: string }> = {
  brand:   { icon: "text-brand-600",   bg: "bg-brand-50" },
  emerald: { icon: "text-emerald-600", bg: "bg-emerald-50" },
  blue:    { icon: "text-blue-600",    bg: "bg-blue-50" },
  purple:  { icon: "text-violet-600",  bg: "bg-violet-50" },
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
  const colors = colorMap[kpi.color] ?? colorMap.brand;

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg)}>
          <Icon size={18} className={colors.icon} />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
            isPositive
              ? "text-emerald-700 bg-emerald-50"
              : "text-red-700 bg-red-50"
          )}
        >
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {formatPercent(Math.abs(delta), 1).replace("+", "")}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold text-slate-800 tabular-nums">
          {formatValue(kpi)}
        </div>
        <div className="text-sm text-gray-500 font-medium">{kpi.label}</div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          vs prev period:{" "}
          <span className={cn("font-bold", isPositive ? "text-emerald-600" : "text-red-600")}>
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
