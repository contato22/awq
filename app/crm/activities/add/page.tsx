"use client";

import { useEffect, useState, Suspense } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";

function AddActivityPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    activity_type: "call",
    related_to_type: params?.get("related_to_type") ?? "opportunity",
    related_to_id:   params?.get("related_to_id")   ?? "",
    subject: "",
    description: "",
    outcome: "",
    duration_minutes: "",
    scheduled_at: new Date().toISOString().slice(0, 16),
    status: "scheduled",
    created_by: "Miguel",
  });

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.subject.trim()) { setError("Assunto é obrigatório"); return; }
    if (!form.related_to_id.trim()) { setError("Vincule a uma entidade (ID obrigatório)"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...form,
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
          outcome: form.outcome || null,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (data.success) router.push("/crm/activities");
      else setError(data.error ?? "Erro ao registrar atividade");
    } catch { setError("Erro de rede"); } finally { setSaving(false); }
  }

  return (
    <>
      <Header title="Registrar Atividade" subtitle="Log de interação ou tarefa" />
      <div className="page-container max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.activity_type} onChange={e=>set("activity_type",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {[["call","Ligação"],["email","E-mail"],["meeting","Reunião"],["task","Tarefa"],["note","Nota"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Responsável</label>
                <select value={form.created_by} onChange={e=>set("created_by",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  <option>Miguel</option><option>Danilo</option>
                </select></div>
            </div>

            <div><label className="block text-xs font-medium text-gray-700 mb-1">Assunto *</label>
              <input value={form.subject} onChange={e=>set("subject",e.target.value)} placeholder="Ex: Follow-up proposta XP"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"/></div>

            <div><label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"/></div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Vinculação</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo de entidade</label>
                <select value={form.related_to_type} onChange={e=>set("related_to_type",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {["lead","opportunity","account","contact"].map(t=><option key={t}>{t}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">ID da entidade *</label>
                <input value={form.related_to_id} onChange={e=>set("related_to_id",e.target.value)} placeholder="UUID"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 font-mono text-xs"/></div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Data & Resultado</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Data/Hora</label>
                <input type="datetime-local" value={form.scheduled_at} onChange={e=>set("scheduled_at",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"/></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Duração (min)</label>
                <input type="number" min="0" value={form.duration_minutes} onChange={e=>set("duration_minutes",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Resultado</label>
                <select value={form.outcome} onChange={e=>set("outcome",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  <option value="">— Pendente —</option>
                  <option value="successful">Sucesso</option>
                  <option value="unsuccessful">Sem sucesso</option>
                  <option value="no_answer">Sem resposta</option>
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e=>set("status",e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  <option value="scheduled">Agendada</option>
                  <option value="completed">Concluída</option>
                  <option value="cancelled">Cancelada</option>
                </select></div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={()=>router.back()}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? "Salvando…" : "Registrar"}</button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function AddActivityPage() {
  return <Suspense><AddActivityPageInner /></Suspense>;
}
