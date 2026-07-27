"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/lib/patricia-canto/leads";
import type { MarketSizing, MarketUnit } from "@/lib/patricia-canto/gtm-extra";
import { computeSomCapture } from "@/lib/patricia-canto/gtm-extra";
import StatTile from "./StatTile";

function formatValue(v: number | null, unidade: MarketUnit): string {
  if (v == null) return "—";
  if (unidade === "R$") return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${v.toLocaleString("pt-BR")} processos`;
}

export default function MarketSizingView({
  leads,
  marketSizing,
  onSave,
}: {
  leads: Lead[];
  marketSizing: MarketSizing;
  onSave: (market: MarketSizing) => void;
}) {
  const [draft, setDraft] = useState<MarketSizing>(marketSizing);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(marketSizing);
    setDirty(false);
  }, [marketSizing]);

  function field<K extends keyof MarketSizing>(key: K, value: MarketSizing[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }

  const { captured, pct } = computeSomCapture(leads, draft);
  const max = Math.max(draft.tam ?? 0, 1);
  const samPct = draft.sam != null ? Math.min(100, (draft.sam / max) * 100) : 0;
  const somPct = draft.som != null ? Math.min(100, (draft.som / max) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-canto-200 bg-white p-4">
        <h3 className="font-canto-serif text-base font-semibold text-canto-900">Dimensionamento de mercado</h3>
        <p className="mt-1 text-xs text-canto-500">
          Entrada manual — TAM (mercado total), SAM (mercado que dá pra atender) e SOM (o que é realista capturar).
          Escolha a unidade e preencha; não estimamos valor nenhum automaticamente.
        </p>

        <div className="mt-4">
          <label className="text-xs text-canto-500">
            Unidade
            <select
              value={draft.unidade}
              onChange={(e) => field("unidade", e.target.value as MarketUnit)}
              className="mt-1 block w-40 rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="R$">R$ (valor de mercado)</option>
              <option value="processos">Nº de processos</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <MarketField
            label="TAM"
            hint="Mercado total endereçável"
            value={draft.tam}
            descricao={draft.tamDescricao}
            unidade={draft.unidade}
            onValue={(v) => field("tam", v)}
            onDescricao={(v) => field("tamDescricao", v)}
          />
          <MarketField
            label="SAM"
            hint="Mercado que dá pra atender (região, especialidade)"
            value={draft.sam}
            descricao={draft.samDescricao}
            unidade={draft.unidade}
            onValue={(v) => field("sam", v)}
            onDescricao={(v) => field("samDescricao", v)}
          />
          <MarketField
            label="SOM"
            hint="O que é realista capturar no período"
            value={draft.som}
            descricao={draft.somDescricao}
            unidade={draft.unidade}
            onValue={(v) => field("som", v)}
            onDescricao={(v) => field("somDescricao", v)}
          />
        </div>

        {draft.tam != null && (
          <div className="mt-6 space-y-2">
            <Bar label={`TAM — ${formatValue(draft.tam, draft.unidade)}`} pct={100} color="bg-canto-300" />
            <Bar label={`SAM — ${formatValue(draft.sam, draft.unidade)}`} pct={samPct} color="bg-canto-500" />
            <Bar label={`SOM — ${formatValue(draft.som, draft.unidade)}`} pct={somPct} color="bg-canto-700" />
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              onSave(draft);
              setDirty(false);
            }}
            disabled={!dirty}
            className="rounded-lg bg-canto-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canto-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      </div>

      {draft.som != null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="SOM capturado até agora" value={formatValue(captured, draft.unidade)} variant="accent" />
          <StatTile label="% do SOM capturado" value={pct == null ? "—" : `${pct.toFixed(1)}%`} />
          <StatTile
            label="Fonte"
            value={draft.unidade === "R$" ? "Honorários fechados (Comercial)" : "Leads em Fechado — Ganho"}
          />
        </div>
      )}
    </div>
  );
}

function MarketField({
  label,
  hint,
  value,
  descricao,
  unidade,
  onValue,
  onDescricao,
}: {
  label: string;
  hint: string;
  value: number | null;
  descricao: string | null;
  unidade: MarketUnit;
  onValue: (v: number | null) => void;
  onDescricao: (v: string | null) => void;
}) {
  return (
    <div className="rounded-lg border border-canto-100 p-3">
      <p className="text-sm font-semibold text-canto-900">{label}</p>
      <p className="text-[11px] text-canto-500">{hint}</p>
      <label className="mt-2 block text-xs text-canto-500">
        Valor {unidade === "R$" ? "(R$)" : "(processos)"}
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onValue(e.target.value === "" ? null : Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
        />
      </label>
      <label className="mt-2 block text-xs text-canto-500">
        Descrição/metodologia
        <textarea
          value={descricao ?? ""}
          onChange={(e) => onDescricao(e.target.value || null)}
          rows={2}
          className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
        />
      </label>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-canto-600">{label}</p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-canto-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
