"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Save, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { PosVendaConfig, CidadeCombustivel } from "@/lib/enrd-posvenda-config";

// Editor único dos parâmetros de custeio (folha, bônus, veículo, encargos,
// combustível por cidade, piso, taxa default). PUT /api/enrd/posvenda/config.
// Quando o real entra aqui, o selo "ESTIMADO" das premissas some sozinho.
export default function EnrdPosVendaConfigEditor({ config }: { config: PosVendaConfig }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [c, setC] = useState<PosVendaConfig>(config);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof PosVendaConfig>(k: K, v: PosVendaConfig[K]) =>
    setC((prev) => ({ ...prev, [k]: v }));

  const setFuel = (i: number, patch: Partial<CidadeCombustivel>) =>
    setC((prev) => ({
      ...prev,
      combustivelPorCidade: prev.combustivelPorCidade.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    }));

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      // veículo deixa de ser "pendente" assim que recebe valor > 0
      const payload: PosVendaConfig = { ...c, veiculoPendente: c.veiculoFixoMes <= 0 };
      const res = await fetch("/api/enrd/posvenda/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setMsg("Parâmetros salvos.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const Num = ({
    label,
    k,
    step = 1,
    suffix,
  }: {
    label: string;
    k: keyof PosVendaConfig;
    step?: number;
    suffix?: string;
  }) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          value={Number(c[k] as number)}
          onChange={(e) => set(k, Number(e.target.value) as never)}
          className="w-full text-sm border rounded-lg px-2 py-1.5"
        />
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
    </label>
  );

  return (
    <section className="card p-5">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Settings2 size={15} className="text-orange-600" /> Parâmetros de custeio (editáveis)
        </h2>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          {/* Folha */}
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Folha (R$/mês)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Num label="William" k="salarioWilliam" step={100} />
              <Num label="Tamara (fixo)" k="salarioTamaraFixo" step={100} />
              <Num label="Bônus" k="bonus" step={100} />
              <Num label="Gatilho do bônus" k="gatilhoBonus" step={500} />
              <Num label="Encargos (×)" k="encargos" step={0.05} />
            </div>
          </div>

          {/* Veículo + piso + taxa */}
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Custos & premissas</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Num label="Veículo fixo/mês" k="veiculoFixoMes" step={50} />
              <Num label="Piso de contribuição" k="pisoContribuicao" step={10} />
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Taxa contrib. default (%)</span>
                <input
                  type="number"
                  step={0.5}
                  value={Number((c.taxaContribuicaoDefault * 100).toFixed(1))}
                  onChange={(e) => set("taxaContribuicaoDefault", Number(e.target.value) / 100)}
                  className="w-full text-sm border rounded-lg px-2 py-1.5"
                />
              </label>
            </div>
            {c.veiculoFixoMes <= 0 && (
              <div className="text-xs text-red-600 mt-1">
                Veículo em R$0 → SEM BASE, subestima o custo fixo (break-even otimista). Informe o valor real.
              </div>
            )}
          </div>

          {/* Perímetro & dedicação (vesting do Miguel) */}
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Perímetro & dedicação (pós-venda)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">% ded. William</span>
                <input
                  type="number"
                  step={5}
                  value={Number((c.dedWilliam * 100).toFixed(0))}
                  onChange={(e) => set("dedWilliam", Number(e.target.value) / 100)}
                  className="w-full text-sm border rounded-lg px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">% ded. Tamara</span>
                <input
                  type="number"
                  step={5}
                  value={Number((c.dedTamara * 100).toFixed(0))}
                  onChange={(e) => set("dedTamara", Number(e.target.value) / 100)}
                  className="w-full text-sm border rounded-lg px-2 py-1.5"
                />
              </label>
              <Num label="Horas produtivas/mês" k="horasProdutivasMes" step={8} />
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">% originação</span>
                <input
                  type="number"
                  step={1}
                  value={Number((c.pctOriginacao * 100).toFixed(0))}
                  onChange={(e) => set("pctOriginacao", Number(e.target.value) / 100)}
                  className="w-full text-sm border rounded-lg px-2 py-1.5"
                />
              </label>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Bônus da Tamara é 100% pós-venda (não rateado). Originação = % sobre venda de integração que o
              pós-venda gerou (default 0 até o Miguel definir).
            </div>
          </div>

          {/* Combustível por cidade */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Combustível por cidade (R$/OS)</div>
              <button
                onClick={() =>
                  set("combustivelPorCidade", [...c.combustivelPorCidade, { cidade: "", combustivel: 0 }])
                }
                className="text-xs text-orange-600 flex items-center gap-1"
              >
                <Plus size={12} /> cidade
              </button>
            </div>
            <div className="space-y-2">
              {c.combustivelPorCidade.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={row.cidade}
                    onChange={(e) => setFuel(i, { cidade: e.target.value })}
                    placeholder="Cidade (use / para agrupar)"
                    className="flex-1 text-sm border rounded-lg px-2 py-1.5"
                  />
                  <input
                    type="number"
                    step={5}
                    value={row.combustivel}
                    onChange={(e) => setFuel(i, { combustivel: Number(e.target.value) })}
                    className="w-24 text-sm border rounded-lg px-2 py-1.5"
                  />
                  <button
                    onClick={() =>
                      set(
                        "combustivelPorCidade",
                        c.combustivelPorCidade.filter((_, idx) => idx !== i)
                      )
                    }
                    className="text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Salvar */}
          <div className="flex items-center gap-3 pt-2 border-t">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-60"
            >
              <Save size={13} /> {saving ? "Salvando…" : "Salvar parâmetros"}
            </button>
            {msg && <span className="text-xs text-emerald-700">{msg}</span>}
            {err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
