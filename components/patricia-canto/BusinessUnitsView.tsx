"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/patricia-canto/leads";
import type { BusinessUnit, NewBusinessUnitInput } from "@/lib/patricia-canto/business-units";
import StatTile from "./StatTile";
import RfmMatrixUnitsView from "./RfmMatrixUnitsView";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type SubTab = "unidades" | "rfm";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "unidades", label: "Unidades" },
  { id: "rfm", label: "Matriz de Comunicação" },
];

export default function BusinessUnitsView({
  businessUnits,
  leads,
  onAdd,
  onSave,
  onDelete,
}: {
  businessUnits: BusinessUnit[];
  leads: Lead[];
  onAdd: (unit: NewBusinessUnitInput) => void;
  onSave: (unit: BusinessUnit) => void;
  onDelete: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("unidades");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessUnit | null>(null);

  const statsByUnit = useMemo(() => {
    const map = new Map<string, { total: number; ganhos: number; honorarios: number }>();
    for (const l of leads) {
      if (!l.unidadeId) continue;
      const cur = map.get(l.unidadeId) ?? { total: 0, ganhos: 0, honorarios: 0 };
      cur.total += 1;
      if (l.stage === "ganho") {
        cur.ganhos += 1;
        cur.honorarios += l.honorarios ?? 0;
      }
      map.set(l.unidadeId, cur);
    }
    return map;
  }, [leads]);

  const principalLeads = leads.filter((l) => !l.unidadeId).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-canto-100 p-1">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                subTab === t.id ? "bg-white text-canto-900 shadow-sm" : "text-canto-600 hover:text-canto-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {subTab === "unidades" && (
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-lg bg-canto-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canto-800"
          >
            + Nova unidade
          </button>
        )}
      </div>

      {subTab === "rfm" && (
        <div className="mt-4">
          <RfmMatrixUnitsView leads={leads} businessUnits={businessUnits} />
        </div>
      )}

      {subTab === "unidades" && (
        <>
      <p className="mt-3 text-sm text-canto-500">
        Parcerias com outros advogados, em segmentos diferentes do previdenciário/cível — controladas da
        aquisição ao financeiro dentro do mesmo CRM.
      </p>

      <div className="mt-4 rounded-xl border border-canto-line bg-white p-4">
        <h3 className="text-sm font-semibold text-canto-900">Patrícia Canto (prática principal)</h3>
        <p className="mt-1 text-xs text-canto-500">Leads sem unidade marcada pertencem à prática principal.</p>
        <div className="mt-3">
          <StatTile label="Leads" value={principalLeads.toString()} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {businessUnits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-canto-300 py-8 text-center text-sm text-canto-500">
            Nenhuma unidade de negócio cadastrada ainda.
          </p>
        ) : (
          businessUnits.map((unit) => {
            const stats = statsByUnit.get(unit.id) ?? { total: 0, ganhos: 0, honorarios: 0 };
            return (
              <div
                key={unit.id}
                onClick={() => setEditing(unit)}
                className="cursor-pointer rounded-xl border border-canto-line bg-white p-4 transition hover:border-canto-400"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-canto-serif text-lg text-canto-900">{unit.nome}</p>
                      {!unit.ativo && (
                        <span className="rounded-full bg-canto-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-canto-500">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-canto-600">{unit.segmento}</p>
                    <p className="mt-1 text-xs text-canto-500">
                      Advogado responsável: <span className="font-medium text-canto-700">{unit.advogadoResponsavel}</span>
                    </p>
                    {(unit.telefone || unit.email) && (
                      <p className="mt-0.5 text-xs text-canto-400">
                        {unit.telefone}
                        {unit.telefone && unit.email ? " · " : ""}
                        {unit.email}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-right">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-canto-500">Leads</p>
                      <p className="text-sm font-semibold text-canto-900">{stats.total}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-canto-500">Fechados</p>
                      <p className="text-sm font-semibold text-canto-900">{stats.ganhos}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-canto-500">Honorários</p>
                      <p className="text-sm font-semibold text-canto-700">{currency(stats.honorarios)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      )}

      {addOpen && (
        <BusinessUnitModal
          onClose={() => setAddOpen(false)}
          onSave={(data) => {
            onAdd(data);
            setAddOpen(false);
          }}
        />
      )}
      {editing && (
        <BusinessUnitModal
          unit={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            onSave({ ...editing, ...data });
            setEditing(null);
          }}
          onDelete={() => {
            onDelete(editing.id);
            setEditing(null);
          }}
          onToggleAtivo={() => {
            onSave({ ...editing, ativo: !editing.ativo });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function BusinessUnitModal({
  unit,
  onClose,
  onSave,
  onDelete,
  onToggleAtivo,
}: {
  unit?: BusinessUnit;
  onClose: () => void;
  onSave: (data: NewBusinessUnitInput) => void;
  onDelete?: () => void;
  onToggleAtivo?: () => void;
}) {
  const [nome, setNome] = useState(unit?.nome ?? "");
  const [advogadoResponsavel, setAdvogadoResponsavel] = useState(unit?.advogadoResponsavel ?? "");
  const [segmento, setSegmento] = useState(unit?.segmento ?? "");
  const [telefone, setTelefone] = useState(unit?.telefone ?? "");
  const [email, setEmail] = useState(unit?.email ?? "");

  function submit() {
    if (!nome.trim() || !advogadoResponsavel.trim() || !segmento.trim()) return;
    onSave({
      nome: nome.trim(),
      advogadoResponsavel: advogadoResponsavel.trim(),
      segmento: segmento.trim(),
      telefone: telefone.trim() || null,
      email: email.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canto-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-canto-serif text-lg text-canto-900">{unit ? "Editar unidade" : "Nova unidade de negócio"}</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-canto-500">
            Nome da unidade
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Direito Trabalhista — Dr. Fulano"
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
          <label className="block text-xs text-canto-500">
            Advogado responsável
            <input
              value={advogadoResponsavel}
              onChange={(e) => setAdvogadoResponsavel(e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
          <label className="block text-xs text-canto-500">
            Segmento/especialidade
            <input
              value={segmento}
              onChange={(e) => setSegmento(e.target.value)}
              placeholder="Ex: Trabalhista, Tributário, Empresarial..."
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-canto-500">
              Telefone
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
            <label className="block text-xs text-canto-500">
              E-mail
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-3">
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Remover a unidade "${unit?.nome}"? Leads já marcados com ela continuam com o vínculo.`))
                    onDelete();
                }}
                className="text-xs font-medium text-rose-500 hover:text-rose-700"
              >
                Remover
              </button>
            )}
            {onToggleAtivo && (
              <button onClick={onToggleAtivo} className="text-xs font-medium text-canto-500 hover:text-canto-800">
                {unit?.ativo ? "Desativar" : "Reativar"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-canto-200 px-4 py-2 text-sm font-medium text-canto-600 hover:bg-canto-50"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={!nome.trim() || !advogadoResponsavel.trim() || !segmento.trim()}
              className="rounded-lg bg-canto-700 px-4 py-2 text-sm font-medium text-white hover:bg-canto-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
