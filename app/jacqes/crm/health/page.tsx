"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  HeartPulse, ShieldAlert, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, X, Check, Activity, CalendarClock,
} from "lucide-react";
import type { CrmHealthSnapshot, CrmClient } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + Math.round(n / 1_000) + "K";
  return "R$" + n;
}

function daysAgo(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function healthColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function healthBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-400";
  if (score >= 60) return "bg-amber-400";
  return "bg-red-400";
}

function churnBadge(risk: string): string {
  switch (risk) {
    case "Baixo": return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "Médio": return "bg-amber-100 text-amber-700 border border-amber-200";
    case "Alto":  return "bg-red-100 text-red-700 border border-red-200";
    default:      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

// ─── Components ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-gray-900 mt-0.5">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function HealthCard({
  snapshot,
  client,
}: {
  snapshot: CrmHealthSnapshot;
  client: CrmClient | undefined;
  [extra: string]: unknown;
}) {
  const days = daysAgo(snapshot.ultima_interacao);
  const scoreColor = healthColor(snapshot.health_score);
  const barColor   = healthBarColor(snapshot.health_score);

  return (
    <div className="card card-hover p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {client?.nome ?? snapshot.cliente_id}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{client?.segmento ?? "—"}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${churnBadge(snapshot.churn_risk)}`}>
            {snapshot.churn_risk} risco
          </span>
          {snapshot.churn_risk === "Alto" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">
              🚨 Ação Urgente
            </span>
          )}
          {snapshot.churn_risk === "Médio" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500 text-white">
              ⚠ Monitorar
            </span>
          )}
        </div>
      </div>

      {/* Health Score */}
      <div>
        <div className="flex items-end justify-between mb-1.5">
          <span className="text-[11px] text-gray-400 uppercase tracking-wide">Health Score</span>
          <span className={`text-2xl font-black ${scoreColor}`}>{snapshot.health_score}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${snapshot.health_score}%` }}
          />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock size={11} className="text-gray-400 shrink-0" />
          <span>
            <span className="text-gray-400">Última interação:</span>{" "}
            <span className="font-medium">{days === 999 ? "—" : `${days}d atrás`}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-600">
          <AlertTriangle size={11} className={snapshot.pendencias > 0 ? "text-orange-500 shrink-0" : "text-gray-300 shrink-0"} />
          <span>
            <span className="text-gray-400">Pendências:</span>{" "}
            <span className={`font-medium ${snapshot.pendencias > 0 ? "text-orange-600" : "text-gray-700"}`}>
              {snapshot.pendencias}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-600">
          <CalendarClock size={11} className="text-gray-400 shrink-0" />
          <span>
            <span className="text-gray-400">Follow-ups:</span>{" "}
            {snapshot.followups_em_dia ? (
              <span className="font-medium text-emerald-600">Em dia</span>
            ) : (
              <span className="font-medium text-red-600">Atrasados</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-600">
          <ArrowUpRight size={11} className="text-gray-400 shrink-0" />
          <span>
            <span className="text-gray-400">Expansão:</span>{" "}
            {snapshot.expansao_aberta ? (
              <span className="font-medium text-emerald-600 flex items-center gap-0.5 inline-flex">
                <Check size={10} /> Aberta
              </span>
            ) : (
              <span className="font-medium text-gray-400 flex items-center gap-0.5 inline-flex">
                <X size={10} /> Nenhuma
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const [snapshots, setSnapshots] = useState<CrmHealthSnapshot[]>([]);
  const [clients,   setClients]   = useState<CrmClient[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCRM<CrmHealthSnapshot>("health"),
      fetchCRM<CrmClient>("clients"),
    ]).then(([h, c]) => { setSnapshots(h); setClients(c); setLoading(false); });
  }, []);

  const avgHealth    = snapshots.length
    ? Math.round(snapshots.reduce((s: number, h: CrmHealthSnapshot) => s + h.health_score, 0) / snapshots.length)
    : 0;
  const saudaveis    = snapshots.filter((h: CrmHealthSnapshot) => h.health_score >= 80).length;
  const atencao      = snapshots.filter((h: CrmHealthSnapshot) => h.health_score >= 60 && h.health_score < 80).length;
  const emRisco      = snapshots.filter((h: CrmHealthSnapshot) => h.health_score < 60 || h.churn_risk === "Alto").length;
  const followupLate = snapshots.filter((h: CrmHealthSnapshot) => !h.followups_em_dia).length;

  const riskAlerts = snapshots.filter((h: CrmHealthSnapshot) => h.churn_risk !== "Baixo");

  return (
    <>
      <Header
        title="Churn & Health"
        subtitle="JACQES CRM · Customer Success Operations"
      />

      <div className="page-container">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Health Médio"
            value={String(avgHealth)}
            sub="score da carteira"
            icon={HeartPulse}
            color="bg-brand-50 border border-brand-200 text-brand-600"
          />
          <KpiCard
            label="Saudáveis"
            value={String(saudaveis)}
            sub="score ≥ 80"
            icon={CheckCircle2}
            color="bg-emerald-50 border border-emerald-200 text-emerald-600"
          />
          <KpiCard
            label="Em Atenção"
            value={String(atencao)}
            sub="score 60–79"
            icon={Activity}
            color="bg-amber-50 border border-amber-200 text-amber-600"
          />
          <KpiCard
            label="Em Risco"
            value={String(emRisco)}
            sub="score < 60 ou risco Alto"
            icon={ShieldAlert}
            color="bg-red-50 border border-red-200 text-red-600"
          />
          <KpiCard
            label="Follow-ups Atraso"
            value={String(followupLate)}
            sub="clientes com pendência"
            icon={Clock}
            color="bg-orange-50 border border-orange-200 text-orange-600"
          />
        </div>

        {/* Health Matrix */}
        <div>
          <SectionHeader
            icon={<HeartPulse size={15} />}
            title="Health Matrix — Carteira de Clientes"
            badge={
              <span className="badge badge-blue ml-1">{snapshots.length}</span>
            }
          />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card p-5 h-48 animate-pulse bg-gray-50" />
              ))}
            </div>
          ) : snapshots.length === 0 ? (
            <EmptyState
              icon={<HeartPulse size={20} className="text-gray-400" />}
              title="Nenhum snapshot disponível"
              description="Ainda não há dados de saúde para a carteira."
              compact
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {snapshots.map((snap: CrmHealthSnapshot) => (
                <HealthCard
                  key={snap.id}
                  snapshot={snap}
                  client={clients.find((c: CrmClient) => c.id === snap.cliente_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Risk Alerts */}
        {riskAlerts.length > 0 && (
          <div className="card p-5">
            <SectionHeader
              icon={<AlertTriangle size={15} />}
              title="Alertas de Risco"
              badge={
                <span className="badge badge-red ml-1">{riskAlerts.length}</span>
              }
            />
            <div className="space-y-0">
              {riskAlerts.map((snap: CrmHealthSnapshot) => {
                const client = clients.find((c: CrmClient) => c.id === snap.cliente_id);
                const isAlto  = snap.churn_risk === "Alto";
                return (
                  <div
                    key={snap.id}
                    className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isAlto ? "bg-red-500 animate-pulse" : "bg-amber-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {client?.nome ?? snap.cliente_id}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Health {snap.health_score} · {snap.churn_risk} risco
                        {!snap.followups_em_dia && " · follow-ups atrasados"}
                        {snap.pendencias > 0 && ` · ${snap.pendencias} pendência(s)`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-gray-400">Ação recomendada</div>
                      <div className={`text-xs font-semibold mt-0.5 ${isAlto ? "text-red-600" : "text-amber-600"}`}>
                        {isAlto
                          ? "Contato urgente — risco de churn"
                          : "Agendar follow-up preventivo"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History stub */}
        <div className="card p-5">
          <SectionHeader
            icon={<Activity size={15} />}
            title="Histórico de Health Score"
          />
          <EmptyState
            icon={<Activity size={20} className="text-gray-300" />}
            title="Histórico disponível após 30 dias de operação"
            description="Os gráficos de evolução do health score serão gerados automaticamente após o primeiro mês de snapshots periódicos."
            compact
          />
        </div>
      </div>
    </>
  );
}
