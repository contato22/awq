// ─── /advisor/customers ───────────────────────────────────────────────────────
// ⚠ STUB — sem dados reais de clientes disponíveis.
// Esta página continha mock data fictício (criado sem base factual) que foi
// removido. Só será populada com dados reais fornecidos pelo usuário.
// Não recriar clientes, AUM, retornos ou NPS sem fonte confirmada.

import Header from "@/components/Header";
import { Users, AlertTriangle } from "lucide-react";

export default function AdvisorCustomersPage() {
  return (
    <>
      <Header
        title="Customers — Advisor"
        subtitle="Carteira de clientes · Em construção"
      />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Users size={24} className="text-gray-400" />
        </div>
        <div className="text-base font-semibold text-gray-700 mb-1">
          Sem dados reais disponíveis
        </div>
        <div className="text-sm text-gray-400 max-w-sm">
          Esta área exibirá a carteira de clientes do Advisor quando dados reais
          forem fornecidos e confirmados.
        </div>
        <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-sm">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>
            Dados fictícios anteriores foram removidos. Não preencher esta página
            sem base factual confirmada pelo usuário.
          </span>
        </div>
      </div>
    </>
  );
}
