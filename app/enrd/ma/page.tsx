"use client";
// ─── /enrd/ma — M&A · ENRD ────────────────────────────────────────────────────
// Área de M&A da BU ENRD. Subseção: Vesting — avanço do vesting de equity da
// AWQ na Enerdy (societário/M&A — não confundir com "vesting do Miguel", que é
// o perímetro de compensação do O&M em /enrd/posvenda).
//
// Termos do vesting (início, duração, cliff, % alvo) são FATOS CONTRATUAIS —
// nunca estimados. Enquanto não confirmados, mostra estado vazio explícito em
// vez de inventar um "% vestido".

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
} from "lucide-react";
import type { VestingConfig, VestingProgresso } from "@/lib/awq-ma-vesting";

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
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
          <span className="text-xs text-gray-500">Duração total (meses)</span>
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
          <span className="text-xs text-gray-500">% alvo do vesting</span>
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
          <span className="text-xs text-gray-500">Marco/gatilho adicional (se houver, além do tempo)</span>
          <input
            type="text"
            value={c.marco ?? ""}
            onChange={(e) => set("marco", e.target.value || null)}
            placeholder="ex.: condicionado a atingir EBITDA X no ano 2"
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
                    <strong>Termos do vesting ainda não configurados.</strong> Data de início, duração,
                    cliff e % alvo são fatos contratuais — não são estimados aqui. Preencha abaixo para
                    calcular o avanço.
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
                {data.config.pctAlvo != null && (
                  <p className="text-xs text-gray-400 mt-1">
                    equivalente a ~{fmtPct(data.progresso.pctVestido * data.config.pctAlvo)} do total da empresa
                    (% alvo {fmtPct(data.config.pctAlvo)})
                  </p>
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
                <div className="rounded-lg border border-gray-100 p-3">
                  <div className="text-[10px] uppercase text-gray-400 flex items-center gap-1"><Calendar size={11} /> Conclusão</div>
                  <div className="text-sm font-semibold text-gray-900 mt-0.5">{fmtDate(data.progresso.dataConclusao)}</div>
                </div>
              </div>

              {data.config.marco && (
                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-xs text-gray-600">
                  <strong>Marco/gatilho adicional:</strong> {data.config.marco}
                </div>
              )}
              {data.config.notas && (
                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-xs text-gray-600">
                  <strong>Notas:</strong> {data.config.notas}
                </div>
              )}

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Modelo: vesting <strong>linear por tempo</strong> após o cliff (padrão de mercado) —{" "}
                {data.progresso.mesesRestantes} meses restantes até 100%. Se o deal real tiver um marco de
                performance além do tempo, ele está descrito acima mas <strong>não é calculado</strong> aqui
                (só a componente temporal).
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
