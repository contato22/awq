// ─── /awq/transactions/add — Registrar Transação ─────────────────────────────
// Server component wrapper: loads Header, provides layout.
// Form interaction is handled by TransactionForm (client component).

import Header from "@/components/Header";
import { PlusCircle } from "lucide-react";
import TransactionForm from "./TransactionForm";

export default function TransactionAddPage() {
  return (
    <>
      <Header
        title="Registrar Transação"
        subtitle="Adicionar lançamento manual na base financeira · EPM Platform"
      />
      <div className="page-container">

        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
            <PlusCircle size={15} className="text-brand-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Nova Transação</div>
            <div className="text-xs text-gray-400">
              Os dados entram diretamente no pipeline financeiro (Supabase → Neon → JSON)
            </div>
          </div>
        </div>

        <TransactionForm />

      </div>
    </>
  );
}
