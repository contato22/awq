"use client";

import Header from "@/components/Header";
import { Users, DollarSign, CheckCircle2, Clock, TrendingUp, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";

// ─── /jacqes/carteira — Carteira de Contratos JACQES ─────────────────────────
// SOURCE: Notion CRM · snapshot Abr/2026
// Novos clientes persistidos em localStorage (pending sync com Notion)

type Contrato = {
  cliente: string;
  tipo: string;
  fee: number;
  status: "Pago" | "Pendente";
  origem?: "notion" | "manual";
};

const BASE_CONTRATOS: Contrato[] = [
  { cliente: "CEM",             tipo: "FEE", fee: 3_200, status: "Pago",     origem: "notion" },
  { cliente: "CAROL BERTOLINI", tipo: "FEE", fee: 1_790, status: "Pendente", origem: "notion" },
  { cliente: "ANDRÉ VIEIRA",    tipo: "FEE", fee: 1_500, status: "Pendente", origem: "notion" },
  { cliente: "TATI SIMÕES",     tipo: "FEE", fee: 1_790, status: "Pago",     origem: "notion" },
];

const LS_KEY = "jacqes_carteira_extra";

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

const TIPOS = ["FEE", "Projeto", "Retainer", "Consultoria", "Outro"];

export default function CarteiraPage() {
  const [extras, setExtras]     = useState<Contrato[]>([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ cliente: "", tipo: "FEE", fee: "", status: "Pendente" as "Pago" | "Pendente" });
  const [erro, setErro]         = useState("");

  // Carrega extras do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setExtras(JSON.parse(raw));
    } catch { /* ignorar */ }
  }, []);

  const todos = [...BASE_CONTRATOS, ...extras];

  const totalMRR  = todos.reduce((s, c) => s + c.fee, 0);
  const totalPago = todos.filter(c => c.status === "Pago").reduce((s, c) => s + c.fee, 0);
  const totalPend = todos.filter(c => c.status === "Pendente").reduce((s, c) => s + c.fee, 0);
  const taxaColeta = totalMRR > 0 ? Math.round((totalPago / totalMRR) * 100) : 0;

  function salvar() {
    if (!form.cliente.trim()) { setErro("Nome do cliente obrigatório."); return; }
    const fee = parseFloat(form.fee.replace(",", "."));
    if (!fee || fee <= 0)   { setErro("Fee deve ser um valor positivo."); return; }

    const novo: Contrato = {
      cliente: form.cliente.trim().toUpperCase(),
      tipo:    form.tipo,
      fee,
      status:  form.status,
      origem:  "manual",
    };

    const novos = [...extras, novo];
    setExtras(novos);
    localStorage.setItem(LS_KEY, JSON.stringify(novos));
    setModal(false);
    setForm({ cliente: "", tipo: "FEE", fee: "", status: "Pendente" });
    setErro("");
  }

  function remover(idx: number) {
    const novos = extras.filter((_, i) => i !== idx);
    setExtras(novos);
    localStorage.setItem(LS_KEY, JSON.stringify(novos));
  }

  return (
    <>
      <Header
        title="Carteira"
        subtitle="Gestão de contratos · Notion CRM · Abr/2026"
      />
      <div className="page-container">

        {/* ── KPIs ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Contratos Ativos", value: String(todos.length),   sub: `${BASE_CONTRATOS.length} Notion + ${extras.length} manual`, icon: Users,        color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "MRR Contratado",   value: fmtR(totalMRR),         sub: "Soma dos FEEs mensais",                                      icon: DollarSign,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Recebido",         value: fmtR(totalPago),         sub: `${todos.filter(c => c.status === "Pago").length} contratos pagos`,                icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Taxa de Coleta",   value: taxaColeta + "%",        sub: `${fmtR(totalPend)} pendente`,                                icon: TrendingUp,   color: taxaColeta >= 80 ? "text-emerald-600" : "text-amber-700", bg: taxaColeta >= 80 ? "bg-emerald-50" : "bg-amber-50" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Carteira ──────────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Contratos Ativos
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">NOTION</span>
            </h2>
            <button
              onClick={() => { setModal(true); setErro(""); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} /> Novo Cliente
            </button>
          </div>

          <div className="space-y-3">
            {todos.map((c, i) => {
              const share   = totalMRR > 0 ? Math.round((c.fee / totalMRR) * 100) : 0;
              const isPago  = c.status === "Pago";
              const isExtra = c.origem === "manual";
              const extraIdx = isExtra ? i - BASE_CONTRATOS.length : -1;

              return (
                <div key={`${c.cliente}-${i}`} className={`rounded-xl border p-4 ${isPago ? "border-emerald-100 bg-emerald-50/40" : "border-amber-100 bg-amber-50/40"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${isPago ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {c.cliente.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-900">{c.cliente}</span>
                          {isExtra && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">manual</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">{c.tipo} · {share}% do MRR</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{fmtR(c.fee)}</span>
                      {isPago ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock size={10} /> Pendente
                        </span>
                      )}
                      {isExtra && (
                        <button
                          onClick={() => remover(extraIdx)}
                          className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isPago ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totalizador */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Pago: {fmtR(totalPago)}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Pendente: {fmtR(totalPend)}</span>
            </div>
            <span className="text-sm font-bold text-gray-900">Total: {fmtR(totalMRR)}</span>
          </div>

          {/* Barra de coleta */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>Taxa de coleta deste ciclo</span>
              <span className="font-semibold text-gray-600">{taxaColeta}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${taxaColeta}%` }} />
            </div>
          </div>
        </div>

      </div>

      {/* ── Modal: Novo Cliente ───────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">Novo Cliente</h3>
              <button onClick={() => { setModal(false); setErro(""); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Cliente *</label>
                <input
                  type="text"
                  placeholder="Ex: EMPRESA LTDA"
                  value={form.cliente}
                  onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo de Contrato</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Fee */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Fee Mensal (R$) *</label>
                <input
                  type="number"
                  placeholder="Ex: 2500"
                  value={form.fee}
                  onChange={e => setForm(f => ({ ...f, fee: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                <div className="flex gap-3">
                  {(["Pendente", "Pago"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        form.status === s
                          ? s === "Pago"
                            ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                            : "bg-amber-100 border-amber-300 text-amber-700"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {s === "Pago" ? <span className="flex items-center justify-center gap-1"><CheckCircle2 size={11} />{s}</span> : <span className="flex items-center justify-center gap-1"><Clock size={11} />{s}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Erro */}
              {erro && <p className="text-xs text-red-600 font-medium">{erro}</p>}

              {/* Ações */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setModal(false); setErro(""); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
