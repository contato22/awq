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
  brand: "text-brand-600 bg-brand-50",
  emerald: "text-emerald-600 bg-emerald-50",
  blue: "text-blue-500 bg-blue-50",
  purple: "text-purple-500 bg-purple-50",
};

function formatValue(kpi: KPI): string {
  if (kpi.unit === "currency") return formatCurrency(kpi.value, "BRL", true);
  if (kpi.unit === "percent") return `${kpi.value.toFixed(1)}%`;
  return formatNumber(kpi.value, true);
}

interface KPICardProps {
  kpi: KPI;
  [extra: string]: unknown;
}

export default function KPICard({ kpi }: KPICardProps) {
  const Icon = iconMap[kpi.icon] ?? TrendingUp;
  const delta = ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100;
  const isPositive = delta >= 0;
  const colorClasses = colorMap[kpi.color] ?? colorMap.brand;

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colorClasses)}>
          <Icon size={17} />
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full",
            isPositive
              ? "text-emerald-700 bg-emerald-50"
              : "text-red-700 bg-red-50"
          )}
        >
          {isPositive ? (
            <ArrowUpRight size={11} />
          ) : (
            <ArrowDownRight size={11} />
          )}
          {formatPercent(Math.abs(delta), 1).replace("+", "")}
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">
          {formatValue(kpi)}
        </div>
        <div className="text-xs text-gray-500 font-medium mt-1">{kpi.label}</div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <span className="text-[11px] text-gray-400">
          vs anterior:{" "}
          <span className={cn("font-semibold", isPositive ? "text-emerald-600" : "text-red-600")}>
            {isPositive ? "+" : ""}
            {kpi.unit === "currency"
              ? formatCurrency(kpi.value - kpi.previousValue, "BRL", true)
              : kpi.unit === "percent"
              ? `${(kpi.value - kpi.previousValue).toFixed(1)}pp`
              : formatNumber(kpi.value - kpi.previousValue, true)}
          </span>
        </span>
      </div>
    </div>
  );
}
