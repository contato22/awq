"use client";

import { useMemo, useState } from "react";
import type { ComunicacaoItem, NewComunicacaoInput } from "@/lib/patricia-canto/gtm-extra";
import { COMUNICACAO_FORMATO_LABEL, STATUS_COMUNICACAO_LABEL } from "@/lib/patricia-canto/gtm-extra";
import type { BusinessUnit } from "@/lib/patricia-canto/business-units";
import { computeQuotaProgress } from "@/lib/patricia-canto/comunicacao-quotas";
import AddComunicacaoModal from "./AddComunicacaoModal";
import ComunicacaoModal from "./ComunicacaoModal";
import ComunicacaoAgenda from "./ComunicacaoAgenda";
import StatTile from "./StatTile";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_STYLE: Record<string, string> = {
  planejado: "bg-canto-100 text-canto-600",
  publicado: "bg-emerald-50 text-emerald-700",
  pausado: "bg-amber-50 text-amber-700",
};

export default function ComunicacaoView({
  items,
  onAdd,
  onSave,
  onDelete,
  businessUnits,
}: {
  items: ComunicacaoItem[];
  onAdd: (item: NewComunicacaoInput) => void;
  onSave: (item: ComunicacaoItem) => void;
  onDelete: (id: string) => void;
  businessUnits: BusinessUnit[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"agenda" | "lista">("agenda");

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.dataPlanejada.localeCompare(a.dataPlanejada)),
    [items],
  );
  const counts = useMemo(
    () => ({
      planejado: items.filter((i) => i.status === "planejado").length,
      publicado: items.filter((i) => i.status === "publicado").length,
      pausado: items.filter((i) => i.status === "pausado").length,
    }),
    [items],
  );
  const quotaProgress = useMemo(() => computeQuotaProgress(items), [items]);

  const open = items.find((i) => i.id === openId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Planejadas" value={counts.planejado.toString()} />
          <StatTile label="Publicadas" value={counts.publicado.toString()} variant="accent" />
          <StatTile label="Pausadas" value={counts.pausado.toString()} variant={counts.pausado > 0 ? "warn" : "default"} />
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-canto-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canto-800"
        >
          + Nova ação
        </button>
      </div>

      {/* Metas recorrentes de entrega (Ana/marketing) */}
      <div className="mt-4 rounded-xl border border-canto-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-canto-900">Metas de entrega</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {quotaProgress.map(({ quota, entregues, planejados, rangeLabel }) => {
            const pct = Math.min(100, (entregues / quota.quantidade) * 100);
            const met = entregues >= quota.quantidade;
            return (
              <div key={quota.id} className="rounded-lg border border-canto-200 bg-canto-50 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-canto-500">{quota.label}</p>
                <p className="mt-0.5 text-xs text-canto-400">
                  {quota.responsavel} · {rangeLabel}
                </p>
                <p className={`mt-1 text-lg font-bold ${met ? "text-emerald-700" : "text-canto-900"}`}>
                  {entregues}/{quota.quantidade}
                  {planejados > entregues && (
                    <span className="ml-1 text-xs font-normal text-canto-500">({planejados} planejados)</span>
                  )}
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canto-200">
                  <div
                    className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-canto-600"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setView("agenda")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            view === "agenda" ? "bg-canto-700 text-white" : "border border-canto-200 text-canto-600 hover:bg-canto-50"
          }`}
        >
          Agenda
        </button>
        <button
          onClick={() => setView("lista")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            view === "lista" ? "bg-canto-700 text-white" : "border border-canto-200 text-canto-600 hover:bg-canto-50"
          }`}
        >
          Lista
        </button>
      </div>

      {view === "agenda" ? (
        <div className="mt-3">
          <ComunicacaoAgenda items={items} onOpen={setOpenId} />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-canto-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-canto-200 text-left text-xs uppercase tracking-wide text-canto-500">
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Formato</th>
                <th className="px-3 py-2">Plataforma</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Data planejada</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setOpenId(item.id)}
                  className="cursor-pointer border-b border-canto-100 last:border-0 hover:bg-canto-50"
                >
                  <td className="px-3 py-2 font-medium text-canto-900">{item.titulo}</td>
                  <td className="px-3 py-2 text-canto-600">{COMUNICACAO_FORMATO_LABEL[item.formato]}</td>
                  <td className="px-3 py-2 text-canto-500">{item.plataforma ?? "—"}</td>
                  <td className="px-3 py-2 text-canto-500">{item.responsavel ?? "—"}</td>
                  <td className="px-3 py-2 text-canto-500">{formatDate(item.dataPlanejada)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[item.status]}`}>
                      {STATUS_COMUNICACAO_LABEL[item.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-xs text-canto-500">
                    Nenhuma ação de comunicação ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <ComunicacaoModal
          item={open}
          businessUnits={businessUnits}
          onClose={() => setOpenId(null)}
          onSave={(item) => {
            onSave(item);
            setOpenId(null);
          }}
          onDelete={(id) => {
            onDelete(id);
            setOpenId(null);
          }}
        />
      )}
      {addOpen && (
        <AddComunicacaoModal businessUnits={businessUnits} onClose={() => setAddOpen(false)} onAdd={onAdd} />
      )}
    </div>
  );
}
