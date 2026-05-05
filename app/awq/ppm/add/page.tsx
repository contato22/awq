"use client";

// ─── /awq/ppm/add — Add New Project ──────────────────────────────────────────

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Briefcase } from "lucide-react";
import { ppmFetch } from "@/lib/ppm-fetch";

const BU_OPTIONS    = ["JACQES","CAZA","ADVISOR","VENTURE","AWQ"] as const;
const TYPE_OPTIONS  = [
  { value: "one_off",    label: "One-off (projeto único)"    },
  { value: "retainer",   label: "Retainer (recorrente)"      },
  { value: "internal",   label: "Interno"                    },
  { value: "investment", label: "Investimento"               },
];
const CONTRACT_OPTIONS = [
  { value: "fixed_price",       label: "Preço Fixo"          },
  { value: "time_and_materials",label: "Time & Materials"     },
  { value: "retainer",          label: "Retainer"            },
];
const CATEGORY_OPTIONS = [
  { value: "video_production", label: "Produção de Vídeo" },
  { value: "social_media",     label: "Social Media"      },
  { value: "consulting",       label: "Consultoria"       },
  { value: "m4e_deal",         label: "M4E / Deal"        },
  { value: "other",            label: "Outro"             },
];
const PRIORITY_OPTIONS = ["low","medium","high","critical"] as const;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white text-gray-900 placeholder-gray-400";

function AddProjectPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const [form, setForm] = useState({
    project_name:     "",
    customer_name:    "",
    opportunity_id:   "",
    bu_code:          "CAZA",
    project_type:     "one_off",
    service_category: "video_production",
    contract_type:    "fixed_price",
    start_date:       new Date().toISOString().slice(0, 10),
    planned_end_date: "",
    budget_hours:     "",
    budget_cost:      "",
    budget_revenue:   "",
    project_manager:  "Miguel",
    priority:         "medium",
    description:      "",
    objectives:       "",
    billing_frequency:"",
    notes:            "",
  });

  // Pre-fill from CRM opportunity URL params
  useEffect(() => {
    const opp    = searchParams?.get("opportunity_id");
    const cust   = searchParams?.get("customer");
    const rev    = searchParams?.get("revenue");
    const bu     = searchParams?.get("bu");
    if (opp || cust || rev || bu) {
      setForm(f => ({
        ...f,
        opportunity_id:   opp   ?? f.opportunity_id,
        customer_name:    cust  ?? f.customer_name,
        budget_revenue:   rev   ?? f.budget_revenue,
        bu_code:          (bu && ["JACQES","CAZA","ADVISOR","VENTURE","AWQ"].includes(bu)) ? bu : f.bu_code,
      }));
    }
  }, [searchParams]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const marginPct = (() => {
    const rev  = parseFloat(form.budget_revenue) || 0;
    const cost = parseFloat(form.budget_cost)    || 0;
    if (rev <= 0) return null;
    return ((rev - cost) / rev * 100).toFixed(1);
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_name.trim()) { setError("Nome do projeto é obrigatório"); return; }
    if (!form.planned_end_date)    { setError("Data de término é obrigatória"); return; }
    if (!form.budget_revenue)      { setError("Revenue estimado é obrigatório"); return; }
    if (!form.budget_cost)         { setError("Custo estimado é obrigatório"); return; }

    setSaving(true); setError("");
    try {
      const json = await ppmFetch("/api/ppm/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          opportunity_id: form.opportunity_id || undefined,
          budget_hours:   form.budget_hours  ? parseFloat(form.budget_hours)  : undefined,
          budget_cost:    parseFloat(form.budget_cost),
          budget_revenue: parseFloat(form.budget_revenue),
          margin_target:  marginPct ? parseFloat(marginPct) / 100 : undefined,
        }),
      }) as { success: boolean; data: { project_id: string }; error?: string };
      if (!json.success) throw new Error(json.error);
      router.push(`/awq/ppm/${json.data.project_id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-brand-600" />
            <h1 className="text-lg font-bold text-gray-900">Novo Projeto</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        <form onSubmit={e => void handleSubmit(e)} className="space-y-6">

          {form.opportunity_id && (
            <div className="bg-brand-50 border border-brand-200 text-brand-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <Briefcase size={14} /> Criando a partir da oportunidade CRM · <span className="font-mono text-xs">{form.opportunity_id}</span>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Identificação */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">Identificação</h2>
            <Field label="Nome do Projeto" required>
              <input value={form.project_name} onChange={set("project_name")} placeholder="Ex.: XP Investimentos — Campanha Q2" className={INPUT} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cliente">
                <input value={form.customer_name} onChange={set("customer_name")} placeholder="Nome do cliente" className={INPUT} />
              </Field>
              <Field label="Business Unit" required>
                <select value={form.bu_code} onChange={set("bu_code")} className={INPUT}>
                  {BU_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Tipo de Projeto" required>
                <select value={form.project_type} onChange={set("project_type")} className={INPUT}>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Categoria de Serviço">
                <select value={form.service_category} onChange={set("service_category")} className={INPUT}>
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Tipo de Contrato" required>
                <select value={form.contract_type} onChange={set("contract_type")} className={INPUT}>
                  {CONTRACT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Gerente de Projeto">
                <input value={form.project_manager} onChange={set("project_manager")} placeholder="Nome do PM" className={INPUT} />
              </Field>
              <Field label="Prioridade">
                <select value={form.priority} onChange={set("priority")} className={INPUT}>
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Cronograma */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">Cronograma</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Data de Início" required>
                <input type="date" value={form.start_date} onChange={set("start_date")} className={INPUT} />
              </Field>
              <Field label="Data de Término (Planejada)" required>
                <input type="date" value={form.planned_end_date} onChange={set("planned_end_date")} className={INPUT} />
              </Field>
            </div>
            {form.project_type === "retainer" && (
              <Field label="Frequência de Faturamento">
                <select value={form.billing_frequency} onChange={set("billing_frequency")} className={INPUT}>
                  <option value="">Selecionar…</option>
                  <option value="monthly">Mensal</option>
                  <option value="milestone">Por Milestone</option>
                  <option value="upon_completion">Na Conclusão</option>
                </select>
              </Field>
            )}
          </div>

          {/* Financeiro */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">Financeiro</h2>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Revenue Orçado (R$)" required>
                <input type="number" value={form.budget_revenue} onChange={set("budget_revenue")} placeholder="320000" className={INPUT} />
              </Field>
              <Field label="Custo Orçado (R$)" required>
                <input type="number" value={form.budget_cost} onChange={set("budget_cost")} placeholder="85000" className={INPUT} />
              </Field>
              <Field label="Horas Orçadas">
                <input type="number" value={form.budget_hours} onChange={set("budget_hours")} placeholder="240" className={INPUT} />
              </Field>
            </div>
            {marginPct && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm text-emerald-700">
                Margem projetada: <strong>{marginPct}%</strong>
              </div>
            )}
          </div>

          {/* Escopo */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">Escopo & Objetivos</h2>
            <Field label="Descrição">
              <textarea rows={2} value={form.description} onChange={set("description")} placeholder="Descrição resumida do projeto" className={INPUT} />
            </Field>
            <Field label="Objetivos">
              <textarea rows={2} value={form.objectives} onChange={set("objectives")} placeholder="Principais objetivos a alcançar" className={INPUT} />
            </Field>
            <Field label="Notas Internas">
              <textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="Observações, contexto, links" className={INPUT} />
            </Field>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-8">
            <Link href="/awq/ppm" className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </Link>
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-60"
            >
              <Save size={14} /> {saving ? "Salvando…" : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddProjectPage() {
  return <Suspense><AddProjectPageInner /></Suspense>;
}
