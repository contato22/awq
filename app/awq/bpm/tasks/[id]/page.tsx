"use client";

// ─── /awq/bpm/tasks/[id] — Approve / Reject Task ─────────────────────────────

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, XCircle, ArrowLeft, Clock, AlertTriangle,
  FileText, User, Calendar, DollarSign, Loader2,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { WorkQueueItem } from "@/lib/bpm-types";

const USER_NAMES: Record<string, string> = {
  "1": "Alex Whitmore", "2": "Sam Chen", "3": "Priya Nair", "4": "Danilo", "5": "Miguel",
};
const CURRENT_USER_ID = "5";

interface TaskDetail extends WorkQueueItem {
  instance?: {
    instance_id: string;
    instance_code: string;
    process_name: string;
    status: string;
    initiated_by: string;
    initiated_at: string;
    current_step_name: string | null;
    sla_due_date: string | null;
    request_data: Record<string, unknown>;
  };
}

export default function ApproveTaskPage() {
  const params    = useParams();
  const router    = useRouter();
  const taskId    = params.id as string;

  const [task, setTask]           = useState<TaskDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes]         = useState("");
  const [error, setError]         = useState("");
  const [result, setResult]       = useState<{ status: string; workflow_completed: boolean; next_step?: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Get task from work queue
        const res = await fetch(`/api/bpm/my-tasks?user_id=${CURRENT_USER_ID}`);
        const json = await res.json();
        if (json.success) {
          const found = json.data.find((t: WorkQueueItem) => t.task_id === taskId);
          if (found) {
            // Also load instance detail
            const instRes = await fetch(`/api/bpm/process-instance?id=${found.instance_id}`);
            const instJson = await instRes.json();
            setTask({ ...found, instance: instJson.success ? instJson.data.instance : undefined });
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [taskId]);

  async function submit(decision: "approved" | "rejected") {
    if (decision === "rejected" && !notes.trim()) {
      setError("Justificativa obrigatória para rejeição.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bpm/complete-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          decision,
          decision_notes: notes.trim() || undefined,
          decided_by: CURRENT_USER_ID,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
      } else {
        setError(json.error ?? "Erro ao processar decisão");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center shadow-lg">
          {result.status === "approved" ? (
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          )}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {result.status === "approved" ? "Aprovado!" : "Rejeitado"}
          </h2>
          {result.workflow_completed ? (
            <p className="text-gray-500 text-sm mb-6">
              {result.status === "approved"
                ? "Workflow concluído com sucesso. Todas as etapas foram aprovadas."
                : "Workflow encerrado. O iniciador foi notificado."}
            </p>
          ) : (
            <p className="text-gray-500 text-sm mb-6">
              Próximo step: <strong>{result.next_step}</strong>. O aprovador foi notificado.
            </p>
          )}
          <Link
            href="/awq/bpm/tasks"
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Voltar para Minhas Tarefas
          </Link>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Tarefa não encontrada</p>
          <p className="text-gray-400 text-sm mt-1">Esta tarefa pode ter sido processada ou não existe.</p>
          <Link href="/awq/bpm/tasks" className="mt-4 inline-block text-blue-600 hover:underline text-sm">← Voltar</Link>
        </div>
      </div>
    );
  }

  const rd = task.request_data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/awq/bpm/tasks" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Revisar Aprovação</h1>
            <p className="text-sm text-gray-500">{task.instance_code} · {task.process_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        {/* SLA Warning */}
        {task.sla_breached && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm font-medium">SLA vencido — esta tarefa requer ação imediata.</span>
          </div>
        )}

        {/* Process Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            Detalhes do Processo
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow label="Processo" value={task.process_name} />
            <InfoRow label="Instância" value={task.instance_code} />
            <InfoRow label="Step Atual" value={task.step_name} />
            <InfoRow label="Iniciado por" value={USER_NAMES[task.initiated_by] ?? task.initiated_by} />
            <InfoRow label="Prioridade" value={task.priority} />
            {task.sla_due_date && <InfoRow label="SLA" value={new Date(task.sla_due_date).toLocaleString("pt-BR")} />}
          </div>
        </div>

        {/* Request Data */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            Dados do Pedido
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {rd.supplier_name   && <InfoRow label="Fornecedor"   value={String(rd.supplier_name)} />}
            {rd.amount          && <InfoRow label="Valor"        value={formatBRL(Number(rd.amount))} />}
            {rd.description     && <InfoRow label="Descrição"    value={String(rd.description)} />}
            {rd.due_date        && <InfoRow label="Vencimento"   value={formatDateBR(String(rd.due_date))} />}
            {rd.bu              && <InfoRow label="BU"           value={String(rd.bu)} />}
            {rd.contract_name   && <InfoRow label="Contrato"     value={String(rd.contract_name)} />}
            {rd.project_name    && <InfoRow label="Projeto"      value={String(rd.project_name)} />}
            {rd.budget          && <InfoRow label="Orçamento"    value={formatBRL(Number(rd.budget))} />}
            {Object.entries(rd).filter(([k]) => !["supplier_name","amount","description","due_date","bu","contract_name","project_name","budget"].includes(k)).map(([k, v]) => (
              <InfoRow key={k} label={k} value={String(v)} />
            ))}
          </div>
        </div>

        {/* Approval Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Decisão</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações <span className="text-gray-400 font-normal">(obrigatório para rejeição)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Adicione comentários sobre esta decisão..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => submit("approved")}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Aprovar
            </button>
            <button
              onClick={() => submit("rejected")}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Rejeitar
            </button>
            <Link
              href="/awq/bpm/tasks"
              className="px-5 flex items-center justify-center border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium text-sm"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-gray-800 font-medium">{value}</dd>
    </div>
  );
}
