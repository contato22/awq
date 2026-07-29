"use client";
// ─── /enrd/ma — M&A · ENRD ────────────────────────────────────────────────────
// Área de M&A da BU ENRD. Subseção: Vesting — avanço do vesting societário da
// AWQ na Enerdy (diferente do "vesting do Miguel", que é o perímetro de
// compensação do O&M em /enrd/posvenda).
//
// Deal atual: atingir R$360.000,00 de receita acumulada da BU O&M/pós-venda em
// 3 anos, cliff de 12 meses. Vesting por META DE VALOR, não % linear no tempo
// — o "% vestido" é valorAcumulado ÷ valorAlvo. valorAcumulado vem do MESMO
// dado real que ancora o resto do BI (recebidoCora, via reconciliação Cora),
// nunca um número digitado.

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import {
  Briefcase,
  Calendar,
  Clock,
  TrendingUp,
  Pencil,
  Save,
  Info,
  Lock,
  AlertTriangle,
} from "lucide-react";
import type { VestingConfig, VestingProgresso } from "@/lib/awq-ma-vesting";

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

type ApiResp = { ok: boolean; config: VestingConfig; progresso: VestingProgresso };

function VestingForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: VestingConfig;
  onSaved: (r: ApiResp) => void;
  onCancel?: () => void;
}) {
  const [c, setC] = useState<VestingConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof VestingConfig>(k: K, v: VestingConfig[K]) =>
    setC((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/ma/vesting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      onSaved(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Data de início do vesting</span>
          <input
            type="date"
            value={c.dataInicio ?? ""}
            onChange={(e) => set("dataInicio", e.target.value || null)}
            className="w-full text-sm border rounded-lg px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Meta de receita acumulada (R$)</span>
          <input
            type="number"
            min={0}
            step={1000}
            value={c.valorAlvo ?? ""}
            onChange={(e) => set("valorAlvo", e.target.value ? Number(e.target.value) : null)}
            className="w-full text-sm border rounded-lg px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Prazo (meses)</span>
          <input
            type="number"
            min={1}
            value={c.duracaoMeses ?? ""}
            onChange={(e) => set("duracaoMeses", e.target.value ? Number(e.target.value) : null)}
            className="w-full text-sm border rounded-lg px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Cliff / carência (meses)</span>
          <input
            type="number"
            min={0}
            value={c.cliffMeses ?? ""}
            onChange={(e) => set("cliffMeses", e.target.value ? Number(e.target.value) : null)}
            className="w-full text-sm border rounded-lg px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">% de equity ao completar a meta (se houver)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={c.pctAlvo != null ? Math.round(c.pctAlvo * 100) : ""}
            onChange={(e) => set("pctAlvo", e.target.value ? Number(e.target.value) / 100 : null)}
            className="w-full text-sm border rounded-lg px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-gray-500">Marco/gatilho (descrição)</span>
          <input
            type="text"
            value={c.marco ?? ""}
            onChange={(e) => set("marco", e.target.value || null)}
            placeholder="ex.: atingir R$360.000,00 de receita da BU O&M/pós-venda em 3 anos"
            className="w-full text-sm border rounded-lg px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-gray-500">Notas</span>
          <textarea
            value={c.notas ?? ""}
            onChange={(e) => set("notas", e.target.value || null)}
            rows={2}
            className="w-full text-sm border rounded-lg px-2 py-1.5"
          />
        </label>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-orange-700 disabled:opacity-50"
        >
          <Save size={13} /> {saving ? "Salvando…" : "Salvar termos"}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-2">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

export default function EnrdMaPage() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch("/api/ma/vesting")
      .then(async (r) => {
        // M&A é superfície Holding-only — papéis travados na BU ENRD levam 403
        // aqui (por desenho). Degrada pra um aviso, não pra crash.
        if (r.status === 403) {
          setRestricted(true);
          return null;
        }
        return r.json();
      })
      .then((j) => j && setData(j))
      .catch(() => setRestricted(true))
      .finally(() => setLoading(false));
  }, []);

  const dataInicioAssumida = data?.config.dataInicio === new Date().toISOString().slice(0, 10);

  return (
    <>
      <Header title="M&A — ENRD" subtitle="Agência Solar · AWQ Group" />
      <div className="page-container">
        <div className="card p-5">
          <SectionHeader icon={<Briefcase size={14} className="text-orange-600" />} title="M&A" />
          <p className="text-xs text-gray-500 mt-1">
            Acompanhamento do deal AWQ ↔ Enerdy. A subseção abaixo mostra o avanço do{" "}
            <strong>vesting societário</strong> da AWQ na Enerdy — diferente do &ldquo;vesting do
            Miguel&rdquo; (perímetro de compensação do O&amp;M, em Pós-venda/O&amp;M).
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <SectionHeader icon={<TrendingUp size={14} className="text-orange-600" />} title="Vesting AWQ ↔ Enerdy" />
            {data?.progresso.configurado && !editing && !restricted && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
              >
                <Pencil size={12} /> editar termos
              </button>
            )}
          </div>

          {restricted && !loading && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-start gap-2">
              <Lock size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600">
                <strong>Acesso restrito.</strong> M&amp;A/vesting é uma superfície de Holding — seu perfil
                não tem permissão para ver os termos do deal.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
            </div>
          )}

          {!loading && data && (!data.progresso.configurado || editing) && (
            <>
              {!data.progresso.configurado && !editing && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 mb-4">
                  <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-900">
                    <strong>Termos do vesting ainda não configurados.</strong> Data de início, meta de
                    receita, prazo e cliff são fatos contratuais — não são estimados aqui. Preencha abaixo
                    para calcular o avanço.
                  </p>
                </div>
              )}
              <VestingForm
                initial={data.config}
                onSaved={(r) => {
                  setData(r);
                  setEditing(false);
                }}
                onCancel={data.progresso.configurado ? () => setEditing(false) : undefined}
              />
            </>
          )}

          {!loading && data && data.progresso.configurado && !editing && (
            <div className="space-y-4">
              {dataInicioAssumida && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-900">
                    <strong>Data de início assumida como hoje.</strong> O deal não especificou a data real —
                    ajuste em &ldquo;editar termos&rdquo; se o vesting já tiver começado antes (ex.: data de
                    fechamento do M&amp;A).
                  </p>
                </div>
              )}

              {/* Progresso PRIMÁRIO: meta de valor (real, ancorado no Cora) */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    % vestido {data.progresso.emCliff && <span className="text-amber-600">(em cliff)</span>}
                  </span>
                  <span className="text-2xl font-bold text-orange-700">{fmtPct(data.progresso.pctVestido)}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${data.progresso.emCliff ? "bg-amber-400" : "bg-orange-500"}`}
                    style={{ width: `${Math.max(2, data.progresso.pctVestido * 100)}%` }}
                  />
                </div>
                {data.config.valorAlvo != null ? (
                  <p className="text-xs text-gray-500 mt-1.5">
                    <strong>{fmtBRL(data.progresso.valorAcumulado)}</strong> acumulados de{" "}
                    <strong>{fmtBRL(data.config.valorAlvo)}</strong> meta — receita real recebida na Cora
                    (perímetro O&amp;M) desde {fmtDate(data.config.dataInicio)}.
                    {data.config.pctAlvo != null && (
                      <> Equivale a ~{fmtPct(data.progresso.pctVestido * data.config.pctAlvo)} de equity (alvo{" "}
                      {fmtPct(data.config.pctAlvo)}).</>
                    )}
                  </p>
                ) : (
                  data.config.pctAlvo != null && (
                    <p className="text-xs text-gray-400 mt-1">
                      equivalente a ~{fmtPct(data.progresso.pctVestido * data.config.pctAlvo)} do total da
                      empresa (% alvo {fmtPct(data.config.pctAlvo)})
                    </p>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-100 p-3">
                  <div className="text-[10px] uppercase text-gray-400 flex items-center gap-1"><Calendar size={11} /> Início</div>
                  <div className="text-sm font-semibold text-gray-900 mt-0.5">{fmtDate(data.config.dataInicio)}</div>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <div className="text-[10px] uppercase text-gray-400 flex items-center gap-1"><Lock size={11} /> Cliff até</div>
                  <div className="text-sm font-semibold text-gray-900 mt-0.5">
                    {data.progresso.dataFimCliff ? fmtDate(data.progresso.dataFimCliff) : "sem cliff"}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <div className="text-[10px] uppercase text-gray-400 flex items-center gap-1"><Clock size={11} /> Decorrido</div>
                  <div className="text-sm font-semibold text-gray-900 mt-0.5">{data.progresso.mesesDecorridos} meses</div>
                </div>
                <div className={`rounded-lg border p-3 ${data.progresso.prazoEstourado ? "border-red-200 bg-red-50" : "border-gray-100"}`}>
                  <div className="text-[10px] uppercase text-gray-400 flex items-center gap-1"><Calendar size={11} /> Prazo-limite</div>
                  <div className={`text-sm font-semibold mt-0.5 ${data.progresso.prazoEstourado ? "text-red-700" : "text-gray-900"}`}>
                    {fmtDate(data.progresso.dataConclusao)}
                  </div>
                </div>
              </div>

              {data.progresso.prazoEstourado && data.progresso.pctVestido < 1 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <strong>Prazo estourado</strong> sem atingir 100% da meta ({fmtPct(data.progresso.pctVestido)}{" "}
                  vestido).
                </div>
              )}

              {data.config.marco && (
                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-xs text-gray-600">
                  <strong>Marco/gatilho:</strong> {data.config.marco}
                </div>
              )}
              {data.config.notas && (
                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-xs text-gray-600">
                  <strong>Notas:</strong> {data.config.notas}
                </div>
              )}

              <p className="text-[11px] text-gray-400 leading-relaxed">
                {data.config.valorAlvo != null ? (
                  <>
                    Modelo: vesting por <strong>meta de receita acumulada</strong> (não % linear no tempo) — 0%
                    durante o cliff, depois <code>receita acumulada ÷ meta</code>. A receita vem da{" "}
                    <strong>mesma reconciliação real (Cora)</strong> do relatório e do BI diário — não é
                    digitada aqui.
                  </>
                ) : (
                  <>Modelo: vesting linear por tempo após o cliff — {data.progresso.mesesRestantes} meses restantes.</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
