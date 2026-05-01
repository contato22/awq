import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number,
  currency = "BRL",
  compact = false
): string {
  if (compact) {
    const sym = currency === "BRL" ? "R$" : "$";
    if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${sym}${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateBR(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function formatBRL(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

export function getDeltaColor(delta: number): string {
  if (delta > 0) return "text-emerald-400";
  if (delta < 0) return "text-red-400";
  return "text-gray-400";
}

export function getDeltaBadge(delta: number): string {
  if (delta > 0) return "badge-green";
  if (delta < 0) return "badge-red";
  return "badge-yellow";
}
