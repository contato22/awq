// ─── /awq-venture/deals/novo — Criação / Edição de Deal ──────────────────────
// Rota estática pré-gerada. Lê ?id=CUSTOM-xxx via window.location.search para
// entrar em modo edição. Sem parâmetro → criação de novo deal.
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import {
  ArrowLeft, Save, Building2, DollarSign, User,
  Target, AlertTriangle, Check, Plus, Trash2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomDeal {
  id:           string;
  companyName:  string;
  cnpj:         string;
  sector:       string;
  location:     string;
  dealType:     string;
  stage:        string;
  ticket:       number;
  assignee:     string;
  riskLevel:    string;
  priority:     string;
  sendStatus:   string;
  tese:         string;
  structura:    string;
  fee:          string;
  earnin:       string;
  conditions:   string;
  nextSteps:    string;
  notes:        string;
  contactName:  string;
  contactEmail: string;
  contactPhone: string;
  website:      string;
  createdAt:    string;
  updatedAt:    string;
}

const STORAGE_KEY = "awq_custom_deals";

export function loadCustomDeals(): CustomDeal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

function saveCustomDeals(deals: CustomDeal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400";
const selectCls = inputCls + " bg-white";

// ─── Blank deal ───────────────────────────────────────────────────────────────

function blank(): CustomDeal {
  return {
    id: `CUSTOM-${Date.now()}`,
    companyName: "", cnpj: "", sector: "", location: "", dealType: "M&A",
    stage: "Triagem", ticket: 0, assignee: "", riskLevel: "Médio",
    priority: "Média", sendStatus: "Rascunho", tese: "", structura: "",
    fee: "", earnin: "", conditions: "", nextSteps: "", notes: "",
    contactName: "", contactEmail: "", contactPhone: "", website: "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NovoDealPage() {
  const router = useRouter();
  const [form, setForm]     = useState<CustomDeal>(blank());
  const [saved, setSaved]   = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Detect ?id=CUSTOM-xxx on client
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      const existing = loadCustomDeals().find((d) => d.id === id);
      if (existing) { setForm(existing); setEditMode(true); }
    }
  }, []);

  function set(field: keyof CustomDeal, val: string | number) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function handleSave() {
    if (!form.companyName.trim()) return;
    const all = loadCustomDeals();
    const idx = all.findIndex((d) => d.id === form.id);
    const updated = { ...form, updatedAt: new Date().toISOString() };
    if (idx >= 0) all[idx] = updated; else all.unshift(updated);
    saveCustomDeals(all);
    setSaved(true);
    setTimeout(() => { router.push("/awq-venture/deals"); }, 1000);
  }

  function handleDelete() {
    const all = loadCustomDeals().filter((d) => d.id !== form.id);
    saveCustomDeals(all);
    router.push("/awq-venture/deals");
  }

  return (
    <>
      <Header
        title={editMode ? `Editar Deal — ${form.companyName || "Sem nome"}` : "Novo Deal — AWQ Venture"}
        subtitle={editMode ? `${form.id} · Editando rascunho` : "Crie um novo deal para o pipeline da AWQ Venture"}
      />

      <div className="max-w-4xl space-y-6">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <Link href="/awq-venture/deals" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={13} /> Voltar para Deals
          </Link>
          <div className="flex items-center gap-2">
            {editMode && (
              <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors">
                <Trash2 size={11} /> Excluir Deal
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!form.companyName.trim() || saved}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 px-4 py-2 rounded-xl transition-colors"
            >
              {saved ? <><Check size={12} /> Salvo!</> : <><Save size={12} /> {editMode ? "Atualizar" : "Salvar"} Deal</>}
            </button>
          </div>
        </div>

        {/* §1 Identificação */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <Building2 size={14} className="text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900">Identificação</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome da Empresa" required>
              <input className={inputCls} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Ex: TechCorp Ltda" />
            </Field>
            <Field label="CNPJ">
              <input className={inputCls} value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Setor">
              <input className={inputCls} value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Ex: HealthTech, Fintech…" />
            </Field>
            <Field label="Cidade / UF">
              <input className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex: São Paulo, SP" />
            </Field>
            <Field label="Website">
              <input className={inputCls} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Responsável (Owner)" required>
              <input className={inputCls} value={form.assignee} onChange={(e) => set("assignee", e.target.value)} placeholder="Nome do sócio / analista responsável" />
            </Field>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Contato Principal</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Nome">
                <input className={inputCls} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Nome do contato" />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="email@empresa.com" />
              </Field>
              <Field label="Telefone">
                <input className={inputCls} value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+55 11 9..." />
              </Field>
            </div>
          </div>
        </div>

        {/* §2 Classificação */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <Target size={14} className="text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900">Classificação do Deal</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Tipo de Deal">
              <select className={selectCls} value={form.dealType} onChange={(e) => set("dealType", e.target.value)}>
                {["M&A", "Investimento Minoritário", "Advisory", "Joint Venture", "Fusão", "Aquisição Total", "Participação Estratégica", "M4E"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Estágio">
              <select className={selectCls} value={form.stage} onChange={(e) => set("stage", e.target.value)}>
                {["Triagem", "Prospecção", "Due Diligence", "Term Sheet", "Negociação", "Fechado", "Cancelado"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Risco">
              <select className={selectCls} value={form.riskLevel} onChange={(e) => set("riskLevel", e.target.value)}>
                {["Baixo", "Médio", "Alto", "Crítico"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Prioridade">
              <select className={selectCls} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {["Alta", "Média", "Baixa"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Status de Envio">
              <select className={selectCls} value={form.sendStatus} onChange={(e) => set("sendStatus", e.target.value)}>
                {["Rascunho", "Pronto para Envio", "Enviado", "Em Negociação", "Aprovado", "Rejeitado"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* §3 Financeiro */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <DollarSign size={14} className="text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900">Econômico-Financeiro</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Ticket (R$)" required>
              <input className={inputCls} type="number" value={form.ticket || ""} onChange={(e) => set("ticket", parseFloat(e.target.value) || 0)} placeholder="0" />
            </Field>
            <Field label="Fee Estruturado">
              <input className={inputCls} value={form.fee} onChange={(e) => set("fee", e.target.value)} placeholder="Ex: 2% a.a. sobre AUM" />
            </Field>
            <Field label="Earn-in / Upside">
              <input className={inputCls} value={form.earnin} onChange={(e) => set("earnin", e.target.value)} placeholder="Ex: 15% acima de X" />
            </Field>
          </div>
        </div>

        {/* §4 Tese e Proposta */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <Target size={14} className="text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900">Tese e Proposta</h2>
          </div>
          <Field label="Tese do Deal">
            <textarea className={inputCls} rows={3} value={form.tese} onChange={(e) => set("tese", e.target.value)} placeholder="Por que este deal faz sentido para a AWQ Venture?" />
          </Field>
          <Field label="Estrutura Proposta">
            <textarea className={inputCls} rows={3} value={form.structura} onChange={(e) => set("structura", e.target.value)} placeholder="Descreva a estrutura da operação proposta…" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Condições Precedentes">
              <textarea className={inputCls} rows={2} value={form.conditions} onChange={(e) => set("conditions", e.target.value)} placeholder="Condições que devem ser satisfeitas antes do fechamento…" />
            </Field>
            <Field label="Próximos Passos">
              <textarea className={inputCls} rows={2} value={form.nextSteps} onChange={(e) => set("nextSteps", e.target.value)} placeholder="Quais são as próximas ações concretas?" />
            </Field>
          </div>
        </div>

        {/* §5 Observações */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <AlertTriangle size={14} className="text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900">Observações Internas</h2>
          </div>
          <Field label="Notas e contexto adicional">
            <textarea className={inputCls} rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Informações adicionais, contexto do deal, alertas internos, origem do contato…" />
          </Field>
          <div className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Deal salvo localmente em localStorage. Para sincronização com pipeline e base, integrar com API.
          </div>
        </div>

        {/* Save footer */}
        <div className="flex items-center justify-between">
          <Link href="/awq-venture/deals" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={!form.companyName.trim() || saved}
            className="flex items-center gap-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 px-5 py-2.5 rounded-xl transition-colors"
          >
            {saved ? <><Check size={14} /> Salvo com sucesso!</> : <><Save size={14} /> {editMode ? "Atualizar" : "Salvar"} Deal</>}
          </button>
        </div>
      </div>
    </>
  );
}
