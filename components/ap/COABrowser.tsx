"use client";

import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { CHART_OF_ACCOUNTS, coaLevel, coaIsLeaf, coaParent, searchCOA } from "@/lib/chart-of-accounts";
import type { COANode } from "@/lib/chart-of-accounts";

const CATEGORY_LABELS: Record<string, string> = {
  folha_remuneracao:            "Folha / RH",
  prolabore_retirada:           "Pró-Labore",
  freelancer_terceiro:          "Freelancers",
  fornecedor_operacional:       "Fornecedor Operacional",
  software_assinatura:          "Software / SaaS",
  marketing_midia:              "Marketing / Mídia",
  aluguel_locacao:              "Aluguel / Locação",
  energia_agua_internet:        "Energia / Água / Internet",
  servicos_contabeis_juridicos: "Contab. / Jurídico",
  viagem_hospedagem:            "Viagem / Hospedagem",
  deslocamento_combustivel:     "Deslocamento",
  alimentacao_representacao:    "Alimentação",
  imposto_tributo:              "Impostos / Tributos",
  tarifa_bancaria:              "Tarifas Bancárias",
  juros_multa_iof:              "Juros / Multas",
  despesa_ambigua:              "Despesa Diversa",
};

function levelIndent(lv: number) {
  return `${(lv - 1) * 16}px`;
}

export default function COABrowser() {
  const [search, setSearch] = useState("");
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(
    new Set(["2.0.0.0.0.0", "2.1.0.0.0.0", "2.1.1.0.0.0", "2.1.2.0.0.0"])
  );

  function toggle(code: string) {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  // Build visible list based on expanded state
  const visible: COANode[] = [];
  if (search.trim()) {
    visible.push(...searchCOA(search));
  } else {
    for (const node of CHART_OF_ACCOUNTS) {
      const lv = coaLevel(node.code);
      if (lv === 1) { visible.push(node); continue; }

      const parent = coaParent(node.code);
      if (!parent) continue;
      if (expandedCodes.has(parent)) visible.push(node);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Plano de Contas — 2.x Passivo</h2>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            aria-label="Buscar conta no Plano de Contas"
            placeholder="Buscar conta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400"
          />
        </div>
      </div>

      <div className="overflow-y-auto max-h-[600px]">
        {visible.map(node => {
          const lv = coaLevel(node.code);
          const isLeaf = coaIsLeaf(node.code);
          const isExpanded = expandedCodes.has(node.code);

          return (
            <div
              key={node.code}
              role={!isLeaf ? "button" : undefined}
              tabIndex={!isLeaf ? 0 : undefined}
              aria-expanded={!isLeaf ? isExpanded : undefined}
              onClick={() => !isLeaf && toggle(node.code)}
              onKeyDown={!isLeaf ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(node.code); } } : undefined}
              className={`flex items-center gap-2 px-4 py-2 border-b border-gray-50 transition-colors ${
                isLeaf
                  ? "hover:bg-brand-50/50"
                  : "cursor-pointer hover:bg-gray-50 font-medium focus:outline-none focus:bg-gray-50"
              }`}
              style={{ paddingLeft: `${16 + (lv - 1) * 16}px` }}
            >
              {!isLeaf ? (
                <ChevronRight
                  size={13}
                  className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              ) : (
                <span className="w-3 shrink-0" />
              )}

              <span className={`font-mono text-[11px] shrink-0 ${lv <= 2 ? "text-gray-500" : "text-gray-400"} mr-1`}>
                {node.code}
              </span>

              <span className={`text-xs flex-1 ${lv <= 2 ? "text-gray-700 uppercase tracking-wide text-[11px]" : "text-gray-600"}`}>
                {node.description}
              </span>

              {isLeaf && node.managerialCategory && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded font-medium">
                  {CATEGORY_LABELS[node.managerialCategory] ?? node.managerialCategory}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between">
        <span>{CHART_OF_ACCOUNTS.filter(n => coaIsLeaf(n.code)).length} contas analíticas</span>
        <span>{CHART_OF_ACCOUNTS.length} entradas total</span>
      </div>
    </div>
  );
}
