"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/lib/patricia-canto/leads";
import type { MarketSizing, MarketUnit } from "@/lib/patricia-canto/gtm-extra";
import { computeSomCapture } from "@/lib/patricia-canto/gtm-extra";
import StatTile from "./StatTile";

// Coordenadas de Teresópolis-RJ com uma caixa cobrindo a região serrana ao
// redor (Sumidouro, Guapimirim, Cachoeiras de Macacu etc.) — embed público
// do OpenStreetMap, sem chave de API e totalmente interativo (arrastar/zoom).
const MAP_CENTER = { lat: -22.4139, lon: -42.9656 };
const MAP_BBOX = "-43.3156%2C-22.6639%2C-42.6156%2C-22.1639";
const MAP_EMBED_SRC = `https://www.openstreetmap.org/export/embed.html?bbox=${MAP_BBOX}&layer=mapnik&marker=${MAP_CENTER.lat}%2C${MAP_CENTER.lon}`;
const MAP_LINK = `https://www.openstreetmap.org/?mlat=${MAP_CENTER.lat}&mlon=${MAP_CENTER.lon}#map=11/${MAP_CENTER.lat}/${MAP_CENTER.lon}`;

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
      <TamSamSomDiagram draft={draft} />

      <div className="rounded-xl border border-canto-line bg-white p-4">
        <h3 className="font-canto-serif text-lg text-canto-900">Dimensionamento de mercado</h3>
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

      <div className="rounded-xl border border-canto-line bg-white p-5">
        <h3 className="font-canto-serif text-lg text-canto-900">Área de atuação — Teresópolis e região</h3>
        <p className="mt-0.5 text-xs text-canto-500">Mapa interativo — arraste para navegar e use scroll/pinça para dar zoom</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-canto-line">
          <iframe
            title="Mapa de Teresópolis e região"
            src={MAP_EMBED_SRC}
            className="h-[420px] w-full"
            loading="lazy"
          />
        </div>
        <a
          href={MAP_LINK}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-medium text-canto-600 hover:text-canto-900"
        >
          Ver mapa maior ↗
        </a>
      </div>
    </div>
  );
}

// Diagrama de círculos concêntricos (TAM > SAM > SOM), no mesmo estilo de
// apresentação de referência aprovado pela usuária — paleta azul própria
// desse diagrama, separada da identidade dourada da marca (mesmo
// tratamento já usado nos gráficos de dados da plataforma).
const TAM_SAM_SOM_COLORS = { tam: "#1B3A5C", sam: "#2C5F8A", som: "#4A90C2" };

function TamSamSomDiagram({ draft }: { draft: MarketSizing }) {
  const rows: { key: "tam" | "sam" | "som"; label: string; en: string; pt: string; value: number | null }[] = [
    { key: "tam", label: "TAM", en: "Total Available Market", pt: "Mercado Disponível Total", value: draft.tam },
    { key: "sam", label: "SAM", en: "Serviceable Available Market", pt: "Mercado Útil Disponível", value: draft.sam },
    { key: "som", label: "SOM", en: "Serviceable Obtainable Market", pt: "Mercado Útil Acessível", value: draft.som },
  ];

  return (
    <div className="rounded-xl border border-canto-line bg-canto-cream p-6 sm:p-8">
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-12">
        <div
          className="relative flex h-56 w-56 shrink-0 items-start justify-center rounded-full pt-6 sm:h-64 sm:w-64"
          style={{ backgroundColor: TAM_SAM_SOM_COLORS.tam }}
        >
          <span className="text-base font-bold tracking-wide text-white">TAM</span>
          <div
            className="absolute top-16 flex h-40 w-40 items-start justify-center rounded-full pt-5 sm:top-[4.5rem] sm:h-44 sm:w-44"
            style={{ backgroundColor: TAM_SAM_SOM_COLORS.sam }}
          >
            <span className="text-sm font-bold tracking-wide text-white">SAM</span>
            <div
              className="absolute top-9 flex h-20 w-20 items-center justify-center rounded-full sm:top-10 sm:h-24 sm:w-24"
              style={{ backgroundColor: TAM_SAM_SOM_COLORS.som }}
            >
              <span className="text-xs font-bold tracking-wide text-white">SOM</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-4 sm:w-auto">
          {rows.map((r) => (
            <div key={r.key}>
              <p className="text-lg font-bold" style={{ color: TAM_SAM_SOM_COLORS[r.key] }}>
                {r.label}
              </p>
              <p className="text-sm font-medium text-canto-700">{r.en}</p>
              <p className="text-sm text-canto-500">{r.pt}</p>
              {r.value != null && (
                <p className="mt-0.5 text-sm font-semibold text-canto-900">{formatValue(r.value, draft.unidade)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
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
