"use client";

// ─── /awq/bpm/processes — Process Catalog ─────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart, DollarSign, CreditCard, BarChart3,
  FileSignature, FolderKanban, ChevronRight, Clock, RefreshCw,
} from "lucide-react";
import type { ProcessDefinition } from "@/lib/bpm-types";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  procurement:        <ShoppingCart className="h-5 w-5" />,
  finance:            <DollarSign className="h-5 w-5" />,
  legal:              <FileSignature className="h-5 w-5" />,
  project_management: <FolderKanban className="h-5 w-5" />,
  approval:           <CreditCard className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  procurement:        "bg-blue-50 text-blue-700 border-blue-200",
  finance:            "bg-green-50 text-green-700 border-green-200",
  legal:              "bg-purple-50 text-purple-700 border-purple-200",
  project_management: "bg-orange-50 text-orange-700 border-orange-200",
  approval:           "bg-gray-50 text-gray-700 border-gray-200",
};

export default function BpmProcessesPage() {
  const [defs, setDefs]       = useState<ProcessDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProcessDefinition | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/bpm/analytics?view=performance");
        const json = await res.json();
        // Fall back to embedded defs if analytics doesn't return them
        const res2  = await fetch("/api/bpm/process-instance?status=in_progress");
        const json2 = await res2.json();
        // We'll load process definitions via start-workflow options
        // For the catalog, embed the known definitions
        setDefs(BUILTIN_DEFS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Catálogo de Processos — BPM</h1>
          <p className="text-sm text-gray-500">6 workflows de aprovação configurados e prontos para uso</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {BUILTIN_DEFS.map((def) => (
            <ProcessCard key={def.process_code} def={def} onSelect={() => setSelected(def)} />
          ))}
        </div>

        {/* Integration Note */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-900 mb-2">Integrações automáticas ativas</h3>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• <strong>AP Approval</strong> aprovado → status de Contas a Pagar atualizado para "approved"</li>
            <li>• <strong>Budget Approval</strong> aprovado → orçamento bloqueado (is_locked = TRUE)</li>
            <li>• <strong>Project Kickoff</strong> aprovado → projeto ativado no PPM (status = active)</li>
          </ul>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div
            className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 mb-4">✕ Fechar</button>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{selected.process_name}</h2>
            <p className="text-sm text-gray-500 mb-4">{selected.description}</p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[selected.process_category]}`}>
                  {selected.process_category}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" /> SLA padrão: {selected.default_sla_hours}h
                </span>
              </div>

              <div className="mt-5">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Steps do Workflow</h3>
                <div className="space-y-2">
                  {selected.workflow_steps.map((step, i) => (
                    <div key={step.step_id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{step.step_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Papel: {step.approver_role} · SLA: {step.sla_hours}h
                          {step.conditions && (
                            <span className="ml-1 text-orange-600">
                              {Object.entries(step.conditions).map(([k, c]) =>
                                c ? ` · Se ${k} ${c.operator} R$${c.value.toLocaleString("pt-BR")}` : ""
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessCard({ def, onSelect }: { def: ProcessDefinition; onSelect: () => void }) {
  const color = CATEGORY_COLORS[def.process_category] ?? CATEGORY_COLORS.approval;
  const icon  = CATEGORY_ICONS[def.process_category]  ?? <BarChart3 className="h-5 w-5" />;

  return (
    <button
      onClick={onSelect}
      className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border mb-3 ${color}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-1">{def.process_name}</h3>
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">{def.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {def.workflow_steps.length} steps · SLA {def.default_sla_hours}h
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500" />
      </div>
    </button>
  );
}

// ─── Built-in process definitions (matches DB seed) ───────────────────────────
const BUILTIN_DEFS: ProcessDefinition[] = [
  { process_def_id: "pd-po", process_code: "PO_APPROVAL", process_name: "Purchase Order Approval", process_category: "procurement", description: "Aprovação de ordens de compra. >R$1K: Manager. >R$5K: Finance. >R$10K: CEO.", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "Manager Review", step_type: "approval", approver_role: "manager", sla_hours: 24, conditions: { amount: { operator: ">=", value: 1000 } } }, { step_id: "2", step_name: "Finance Approval", step_type: "approval", approver_role: "finance_manager", sla_hours: 48, conditions: { amount: { operator: ">=", value: 5000 } } }, { step_id: "3", step_name: "CEO Approval", step_type: "approval", approver_role: "ceo", sla_hours: 72, conditions: { amount: { operator: ">=", value: 10000 } } }], routing_rules: null, default_sla_hours: 72, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: "", updated_at: "", created_by: "5" },
  { process_def_id: "pd-exp", process_code: "EXPENSE_APPROVAL", process_name: "Expense Approval", process_category: "finance", description: "Aprovação de despesas operacionais. <R$1K: Manager. ≥R$1K: CFO.", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "Manager Approval", step_type: "approval", approver_role: "manager", sla_hours: 24, conditions: { amount: { operator: "<", value: 1000 } } }, { step_id: "2", step_name: "CFO Approval", step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { amount: { operator: ">=", value: 1000 } } }], routing_rules: null, default_sla_hours: 48, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: "", updated_at: "", created_by: "5" },
  { process_def_id: "pd-ap", process_code: "AP_APPROVAL", process_name: "Accounts Payable Approval", process_category: "finance", description: "Aprovação de contas a pagar. Finance sempre; CFO se ≥R$5K.", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "Finance Manager Review", step_type: "approval", approver_role: "finance_manager", sla_hours: 48 }, { step_id: "2", step_name: "CFO Approval", step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { amount: { operator: ">=", value: 5000 } } }], routing_rules: null, default_sla_hours: 48, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: "", updated_at: "", created_by: "5" },
  { process_def_id: "pd-bud", process_code: "BUDGET_APPROVAL", process_name: "Budget Approval", process_category: "finance", description: "Aprovação do orçamento anual/trimestral. BU Lead → CFO → CEO → Locked.", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "BU Lead Review", step_type: "approval", approver_role: "bu_lead", sla_hours: 72 }, { step_id: "2", step_name: "CFO Review", step_type: "approval", approver_role: "cfo", sla_hours: 96 }, { step_id: "3", step_name: "CEO Final Approval", step_type: "approval", approver_role: "ceo", sla_hours: 120 }], routing_rules: null, default_sla_hours: 240, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: "", updated_at: "", created_by: "5" },
  { process_def_id: "pd-con", process_code: "CONTRACT_APPROVAL", process_name: "Contract Approval", process_category: "legal", description: "Aprovação de contratos antes da assinatura. Legal → Finance → CEO.", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "Legal Review", step_type: "approval", approver_role: "legal", sla_hours: 96 }, { step_id: "2", step_name: "Finance Review", step_type: "approval", approver_role: "finance_manager", sla_hours: 48 }, { step_id: "3", step_name: "CEO Signature", step_type: "approval", approver_role: "ceo", sla_hours: 72 }], routing_rules: null, default_sla_hours: 168, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: "", updated_at: "", created_by: "5" },
  { process_def_id: "pd-prj", process_code: "PROJECT_KICKOFF", process_name: "Project Kickoff Approval", process_category: "project_management", description: "Aprovação para iniciar novo projeto. PM Review → CFO (budget ≥R$50K).", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "PM Review", step_type: "approval", approver_role: "pm", sla_hours: 24 }, { step_id: "2", step_name: "CFO Budget Approval", step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { budget: { operator: ">=", value: 50000 } } }], routing_rules: null, default_sla_hours: 72, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: "", updated_at: "", created_by: "5" },
];
