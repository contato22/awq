"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  X,
  Receipt,
  ArrowDownToLine,
  FileText,
  Users,
  Database,
  Banknote,
} from "lucide-react";

interface Action {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const ACTIONS: Action[] = [
  { label: "Nova venda",     href: "/awq/ap-ar?type=AR", icon: Receipt,         color: "text-emerald-700", bg: "bg-emerald-50" },
  { label: "Nova despesa",   href: "/awq/ap-ar?type=AP", icon: ArrowDownToLine, color: "text-red-700",     bg: "bg-red-50" },
  { label: "Conciliar Cora", href: "/awq/conciliacao",   icon: Database,        color: "text-brand-700",   bg: "bg-brand-50" },
  { label: "Novo cliente",   href: "/customers",         icon: Users,           color: "text-amber-700",   bg: "bg-amber-50" },
  { label: "Nota fiscal",    href: "/awq/fiscal",        icon: FileText,        color: "text-purple-700",  bg: "bg-purple-50" },
  { label: "Conta bancária", href: "/awq/bank",          icon: Banknote,        color: "text-gray-700",    bg: "bg-gray-100" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function QuickActionsSheet({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="lg:hidden fixed inset-0 z-[60] flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label="Ações rápidas"
    >
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full bg-white rounded-t-3xl pb-8 pt-2 px-5 animate-slide-in shadow-2xl">
        <div className="mx-auto w-10 h-1 rounded-full bg-gray-300 mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Criar atalho</h3>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-600 rounded-lg active:bg-gray-100"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                onClick={onClose}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-50 active:bg-gray-100 active:scale-95 transition-transform"
              >
                <div className={`w-12 h-12 rounded-2xl ${a.bg} flex items-center justify-center`}>
                  <Icon size={22} className={a.color} />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                  {a.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
