"use client";

import { useEffect } from "react";
import { X, Check, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  /** Currently selected period */
  period: string;
  onPeriodChange: (period: string) => void;
}

const periods = [
  { id: "1m", label: "Último mês" },
  { id: "3m", label: "3 meses" },
  { id: "6m", label: "6 meses" },
  { id: "ytd", label: "YTD" },
  { id: "1y", label: "1 ano" },
  { id: "all", label: "Todos" },
];

const businessUnits = [
  { id: "all", label: "Todas as BUs", color: "bg-gray-400" },
  { id: "jacqes", label: "JACQES", color: "bg-brand-600" },
  { id: "caza", label: "Caza Vision", color: "bg-emerald-600" },
  { id: "venture", label: "AWQ Venture", color: "bg-amber-600" },
  { id: "advisor", label: "Advisor", color: "bg-violet-600" },
];

export default function MobileFilterSheet({ open, onClose, period, onPeriodChange }: MobileFilterSheetProps) {
  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sheet — slides up from bottom */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out lg:hidden max-h-[80vh] flex flex-col",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 overscroll-contain">
          {/* Period filter */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Período</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {periods.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPeriodChange(p.id)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs font-medium transition-all border",
                    period === p.id
                      ? "bg-brand-50 text-brand-700 border-brand-200"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 active:bg-gray-50"
                  )}
                >
                  {period === p.id && <Check size={10} className="inline mr-1" />}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* BU filter */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Business Unit</span>
            </div>
            <div className="space-y-1.5">
              {businessUnits.map((bu) => (
                <button
                  key={bu.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-100"
                >
                  <div className={`w-3 h-3 rounded-full ${bu.color} shrink-0`} />
                  <span className="font-medium">{bu.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Apply button */}
        <div className="px-5 py-4 border-t border-gray-100 safe-area-bottom">
          <button
            onClick={onClose}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors active:bg-brand-800"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </>
  );
}
