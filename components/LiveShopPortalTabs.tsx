"use client";

// ─── Live Shop — Abas do portal da marca (BI / GRADE / COMISSÕES) ─────────────
// Recebe nós já renderizados (inclusive server components) e alterna o ativo.
// Renderiza só o ativo (evita problemas de dimensionamento do gráfico oculto).

import { useState } from "react";

export interface PortalTab {
  id: string;
  label: string;
  node: React.ReactNode;
}

export default function LiveShopPortalTabs({ tabs }: { tabs: PortalTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-8 flex justify-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              t.id === current?.id
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.node}</div>
    </div>
  );
}
