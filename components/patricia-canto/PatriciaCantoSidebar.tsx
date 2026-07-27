"use client";

import type { PcRole, Tab } from "@/lib/patricia-canto/auth";
import { ROLE_TABS } from "@/lib/patricia-canto/auth";
import PatriciaCantoLogo from "./PatriciaCantoLogo";

export type { Tab };

const ROLE_LABEL: Record<PcRole, string> = { admin: "Administrador", master: "Master", mkt: "Ana (Marketing)" };

function IconChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTarget(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}
function IconKanban(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3.5" y="4" width="4.5" height="16" rx="1" />
      <rect x="9.75" y="4" width="4.5" height="10" rx="1" />
      <rect x="16" y="4" width="4.5" height="13" rx="1" />
    </svg>
  );
}
function IconScale(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3v18M8 21h8M5 7h14M5 7 2 13a3 3 0 0 0 6 0L5 7ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 6v12M18 6v12" strokeLinecap="round" />
    </svg>
  );
}

const NAV: { id: Tab; label: string; icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element }[] = [
  { id: "bi", label: "BI · Visão Geral", icon: IconChart },
  { id: "gtm", label: "GTM · Aquisição", icon: IconTarget },
  { id: "comercial", label: "Pipeline Comercial", icon: IconKanban },
  { id: "cs", label: "CS / Jurídico", icon: IconScale },
  { id: "financeiro", label: "Financeiro", icon: IconCash },
];

function NavList({ tab, onSelect, role }: { tab: Tab; onSelect: (t: Tab) => void; role: PcRole }) {
  const allowed = ROLE_TABS[role];
  return (
    <nav className="flex-1 space-y-1 px-3">
      {NAV.filter((item) => allowed.includes(item.id)).map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
              active ? "bg-canto-50 text-canto-900" : "text-canto-300 hover:bg-canto-800 hover:text-white"
            }`}
          >
            <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-canto-700" : "text-canto-400"}`} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4 py-6">
      <PatriciaCantoLogo className="h-10 w-10 shrink-0" shieldColor="#FFFFFF" markColor="#847455" />
      <div>
        <p className="font-canto-serif text-lg font-semibold leading-tight text-white">Patrícia Canto</p>
        <p className="text-[10px] font-medium tracking-[0.25em] text-canto-300">ADVOGADA</p>
      </div>
    </div>
  );
}

function RoleFooter({ role, onLogout }: { role: PcRole; onLogout: () => void }) {
  return (
    <div className="border-t border-canto-800 px-4 py-4">
      <p className="text-[11px] text-canto-400">
        Logado como <span className="font-semibold text-white">{ROLE_LABEL[role]}</span>
      </p>
      <button
        onClick={onLogout}
        className="mt-2 w-full rounded-lg border border-canto-700 px-3 py-1.5 text-xs font-semibold text-canto-200 transition hover:bg-canto-800 hover:text-white"
      >
        Sair
      </button>
    </div>
  );
}

export default function PatriciaCantoSidebar({
  tab,
  onSelect,
  role,
  onLogout,
  mobileOpen,
  onMobileClose,
}: {
  tab: Tab;
  onSelect: (t: Tab) => void;
  role: PcRole;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  return (
    <>
      {/* Desktop — sidebar fixa */}
      <aside className="hidden w-64 shrink-0 flex-col bg-canto-900 lg:flex">
        <Brand />
        <NavList tab={tab} onSelect={onSelect} role={role} />
        <RoleFooter role={role} onLogout={onLogout} />
      </aside>

      {/* Mobile — drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-canto-900 shadow-2xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                onClick={onMobileClose}
                className="rounded-full p-1.5 text-canto-300 hover:bg-canto-800 hover:text-white"
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>
            <NavList
              tab={tab}
              role={role}
              onSelect={(t) => {
                onSelect(t);
                onMobileClose();
              }}
            />
            <RoleFooter role={role} onLogout={onLogout} />
          </aside>
        </div>
      )}
    </>
  );
}
