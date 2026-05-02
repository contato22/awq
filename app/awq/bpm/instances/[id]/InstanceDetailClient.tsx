"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle,
  User, Loader2, FileText, Activity, X,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { ProcessInstance, ProcessTask, ProcessHistoryEntry } from "@/lib/bpm-types";

const USER_NAMES: Record<string, string> = {
  "1": "Alex Whitmore", "2": "Sam Chen", "3": "Priya Nair", "4": "Danilo", "5": "Miguel",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  in_progress: { bg: "bg-blue-50",   text: "text-blue-700",   icon: <Clock className="h-4 w-4" /> },
  approved:    { bg: "bg-green-50",  text: "text-green-700",  icon: <CheckCircle2 className="h-4 w-4" /> },
  rejected:    { bg: "bg-red-50",    text: "text-red-700",    icon: <XCircle className="h-4 w-4" /> },
  cancelled:   { bg: "bg-gray-50",   text: "text-gray-600",   icon: <X className="h-4 w-4" /> },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  started:        <Activity className="h-3.5 w-3.5 text-blue-500" />,
  step_completed: <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />,
  approved:       <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  rejected:       <XCircle className="h-3.5 w-3.5 text-red-500" />,
  escalated:      <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />,
  cancelled:      <X className="h-3.5 w-3.5 text-gray-400" />,
};

export default function InstanceDetailClient() {
  const params     = useParams();
  const router     = useRouter();
  const instanceId = (params?.id ?? "") as string;

  const [instance, setInstance] = useState<ProcessInstance | null>(null);
  const [tasks, setTasks]       = useState<ProcessTask[]>([]);
  const [history, setHistory]   = useState<ProcessHistoryEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [instRes, histRes] = await Promise.all([
          fetch(`/api/bpm/process-instance?id=${instanceId}`),
          fetch(`/api/bpm/process-history?instance_id=${instanceId}`),
        ]);
        const instJson = await instRes.json();
        const histJson = await histRes.json();
        if (instJson.success) { setInstance(instJson.data.instance); setTasks(instJson.data.tasks ?? []); }
        if (histJson.success) setHistory(histJson.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [instanceId]);

  async function cancelInstance() {
    setCancelling(true);
    try {
      const res = await fetch("/api/bpm/cancel-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instance_id: instanceId, cancelled_by: "5", reason: cancelReason }),
      });
      const json = await res.json();
      if (json.success) router.push("/awq/bpm/instances");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  if (!instance) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Instância não encontrada</p>
          <Link href="/awq/bpm/instances" className="mt-4 inline-block text-blue-600 hover:underline text-sm">← Voltar</Link>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[instance.status] ?? STATUS_STYLES.in_progress;
  const rd = instance.request_data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/awq/bpm/instances" className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{instance.instance_code}</h1>
              <p className="text-sm text-gray-500">{instance.process_name}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.icon} {instance.status.replace("_", " ")}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-gray-400" /> Dados do Pedido
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Tipo" value={instance.related_entity_type} />
              <InfoRow label="Iniciado por" value={USER_NAMES[instance.initiated_by] ?? instance.initiated_by} />
              <InfoRow label="Iniciado em" value={new Date(instance.initiated_at).toLocaleString("pt-BR")} />
              <InfoRow label="Prioridade" value={instance.priority} />
              {instance.sla_due_date && <InfoRow label="SLA Due" value={new Date(instance.sla_due_date).toLocaleString("pt-BR")} />}
              {instance.completed_at && <InfoRow label="Concluído em" value={new Date(instance.completed_at).toLocaleString("pt-BR")} />}
              {!!rd.supplier_name   && <InfoRow label="Fornecedor"  value={String(rd.supplier_name)} />}
              {!!rd.amount          && <InfoRow label="Valor"       value={formatBRL(Number(rd.amount))} />}
              {!!rd.description     && <InfoRow label="Descrição"   value={String(rd.description)} />}
              {!!rd.contract_name   && <InfoRow label="Contrato"    value={String(rd.contract_name)} />}
              {!!rd.project_name    && <InfoRow label="Projeto"     value={String(rd.project_name)} />}
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4 text-sm">Steps do Workflow</h2>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.task_id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      task.status === "completed" ? "bg-green-100 text-green-700" :
                      task.status === "rejected"  ? "bg-red-100 text-red-700" :
                      task.status === "pending"   ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {task.step_id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{task.step_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          task.status === "completed" ? "bg-green-100 text-green-700" :
                          task.status === "rejected"  ? "bg-red-100 text-red-700" :
                          task.status === "pending"   ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                        }`}>{task.status}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Atribuído a: {USER_NAMES[task.assigned_to] ?? task.assigned_to}
                        {task.decided_at && ` · Decidido em ${new Date(task.decided_at).toLocaleDateString("pt-BR")}`}
                      </div>
                      {task.decision_notes && (
                        <div className="text-xs text-gray-600 mt-1 italic">"{task.decision_notes}"</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {instance.status === "in_progress" && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              {!showCancel ? (
                <button onClick={() => setShowCancel(true)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                  Cancelar este processo
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">Confirmar cancelamento?</p>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Motivo do cancelamento..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={cancelInstance}
                      disabled={cancelling}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelling ? "Cancelando..." : "Confirmar Cancelamento"}
                    </button>
                    <button onClick={() => setShowCancel(false)} className="text-gray-500 text-sm hover:text-gray-700">
                      Desistir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-gray-400" /> Histórico (Audit Trail)
          </h2>
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm">Sem histórico ainda.</p>
          ) : (
            <div className="space-y-4">
              {history.map((entry, idx) => (
                <div key={entry.history_id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {ACTION_ICONS[entry.action] ?? <Activity className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                    {idx < history.length - 1 && <div className="w-0.5 bg-gray-100 flex-1 mt-1" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-sm text-gray-800 font-medium capitalize">{entry.action.replace("_", " ")}</p>
                    {entry.action_description && (
                      <p className="text-xs text-gray-500 mt-0.5">{entry.action_description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {entry.performed_by ? (USER_NAMES[entry.performed_by] ?? entry.performed_by) : "Sistema"} ·{" "}
                      {new Date(entry.performed_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-gray-800 font-medium text-sm">{value}</dd>
    </div>
  );
}
