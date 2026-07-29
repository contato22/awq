"use client";

import { useMemo } from "react";
import type { PcRole } from "@/lib/patricia-canto/auth";
import { ROLE_LABEL } from "@/lib/patricia-canto/auth";
import type { ActivityLogEntry } from "@/lib/patricia-canto/activity-log";
import type { ComunicacaoItem } from "@/lib/patricia-canto/gtm-extra";
import { computeQuotaProgress } from "@/lib/patricia-canto/comunicacao-quotas";
import StatTile from "./StatTile";

const ROLES: PcRole[] = ["admin", "master", "mkt"];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

export default function EquipeView({
  activityLog,
  comunicacoes,
}: {
  activityLog: ActivityLogEntry[];
  comunicacoes: ComunicacaoItem[];
}) {
  const byRole = useMemo(() => {
    const map = new Map<PcRole, ActivityLogEntry[]>();
    for (const role of ROLES) map.set(role, []);
    for (const entry of activityLog) map.get(entry.role)?.push(entry);
    return map;
  }, [activityLog]);

  const anaQuota = useMemo(() => computeQuotaProgress(comunicacoes), [comunicacoes]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-canto-500">Atividades e performance de cada pessoa com acesso — visível só para o master.</p>

      {/* Contagem de atividades por pessoa */}
      <div className="grid gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <StatTile key={role} label={ROLE_LABEL[role]} value={`${(byRole.get(role) ?? []).length} ações`} />
        ))}
      </div>

      {/* Performance da Ana — metas de conteúdo */}
      <div className="rounded-xl border border-canto-line bg-white p-5">
        <h3 className="font-canto-serif text-lg text-canto-900">Performance — {ROLE_LABEL.mkt}</h3>
        <p className="mt-0.5 text-xs text-canto-500">Entrega das metas de conteúdo da semana/mês atual</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {anaQuota.map(({ quota, entregues, planejados, rangeLabel }) => {
            const met = entregues >= quota.quantidade;
            const pct = Math.min(100, (entregues / quota.quantidade) * 100);
            return (
              <div key={quota.id} className="rounded-lg border border-canto-line bg-canto-50 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-canto-500">{quota.label}</p>
                <p className="mt-0.5 text-xs text-canto-400">{rangeLabel}</p>
                <p className={`mt-1 text-lg font-semibold ${met ? "text-emerald-700" : "text-canto-900"}`}>
                  {entregues}/{quota.quantidade}
                  {planejados > entregues && (
                    <span className="ml-1 text-xs font-normal text-canto-500">({planejados} planejados)</span>
                  )}
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canto-200">
                  <div className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-canto-600"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feed de atividades */}
      <div className="rounded-xl border border-canto-line bg-white p-5">
        <h3 className="font-canto-serif text-lg text-canto-900">Atividades recentes</h3>
        <p className="mt-0.5 text-xs text-canto-500">Últimas ações registradas, mais recentes primeiro</p>
        {activityLog.length === 0 ? (
          <p className="mt-3 text-xs text-canto-500">
            Nenhuma atividade registrada ainda — o log passa a preencher a partir da próxima ação de cada pessoa.
          </p>
        ) : (
          <ul className="mt-3 max-h-[480px] divide-y divide-canto-line overflow-y-auto">
            {activityLog.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-canto-900">{entry.action}</p>
                  <p className="text-xs text-canto-500">{ROLE_LABEL[entry.role]}</p>
                </div>
                <span className="shrink-0 text-xs text-canto-400">{timeAgo(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
