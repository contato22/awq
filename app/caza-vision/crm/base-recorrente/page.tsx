"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { lsGet } from "@/lib/caza-crm-local";
import {
  RefreshCw, DollarSign, Heart, AlertTriangle, TrendingUp,
  Database, HardDrive, CloudOff, ArrowUpRight,
} from "lucide-react";

interface ClienteRow {
  id: string; name: string; email: string; phone: string; type: string;
  budget_anual: number; status: string; segmento: string; since: string;
  tipo_contrato: string; saude: string; mrr: number;
  churn_risk: string; upsell_potencial: string; ultimo_contato: string;
}

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function daysSince(iso: string) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

const IS_STATIC   = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH   = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";
const LS_KEY      = "clientes";

function saudeCls(s: string) {
  if (s === "Saudável") return "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "Atenção")  return "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200";
  return "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-red-50 text-red-600 border-red-200";
}

function churnBadge(s: string) {
  if (s === "Alto")  return "text-[10px] font-bold px-1.5 py-0.5 rounded border bg-red-100 text-red-700 border-red-300";
  if (s === "Médio") return "text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200";
  return "text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-gray-50 text-gray-400 border-gray-200";
}

function coerceClient(raw: Record<string, unknown>): ClienteRow {
  return {
    id: String(raw.id ?? ""), name: String(raw.name ?? ""),
    email: String(raw.email ?? ""), phone: String(raw.phone ?? ""),
    type: String(raw.type ?? "Empresa"), budget_anual: Number(raw.budget_anual ?? 0),
    status: String(raw.status ?? "Ativo"), segmento: String(raw.segmento ?? ""),
    since: String(raw.since ?? ""), tipo_contrato: String(raw.tipo_contrato ?? "Projeto"),
    saude: String(raw.saude ?? "Atenção"), mrr: Number(raw.mrr ?? 0),
    churn_risk: String(raw.churn_risk ?? "Médio"),
    upsell_potencial: String(raw.upsell_potencial ?? "Médio"),
    ultimo_contato: String(raw.ultimo_contato ?? ""),
  };
}

export default function BaseRecorrentePage() {
  const [clients, setClients] = useState<ClienteRow[]>([]);
  const [source,  setSource]  = useState<"loading" | "local" | "static" | "empty">("loading");

  useEffect(() => {
    async function load() {
      if (IS_STATIC) {
        const local = lsGet<ClienteRow>(LS_KEY);
        if (local !== null) {
          setClients(local); setSource(local.length > 0 ? "local" : "empty"); return;
        }
      }
      try {
        const res = await fetch(`${BASE_PATH}/data/caza-clients.json`);
        if (res.ok) {
          const raw = await res.json() as Record<string, unknown>[];
          const data = Array.isArray(raw) ? raw.map(coerceClient) : [];
          if (IS_STATIC) { setClients(data); setSource(data.length > 0 ? "static" : "empty"); }
          else { setClients(data); setSource(data.length > 0 ? "static" : "empty"); }
          return;
        }
      } catch { /* ignore */ }
      setClients([]); setSource("empty");
    }
    load();
  }, []);

  const recorrentes = clients.filter((c) => c.tipo_contrato === "Recorrente");
  const mrrTotal    = recorrentes.reduce((s, c) => s + (c.mrr ?? 0), 0);
  const saudaveis   = recorrentes.filter((c) => c.saude === "Saudável").length;
  const emRisco     = recorrentes.filter((c) => c.churn_risk === "Alto").length;
  const upsellAlto  = recorrentes.filter((c) => c.upsell_potencial === "Alto").length;

  const projetos = clients.filter((c) => c.tipo_contrato === "Projeto");
  const avulsos  = clients.filter((c) => c.tipo_contrato === "Avulso");

  return (
    <>
      <Header title="Base Recorrente" subtitle="MRR, saúde e retenção · Caza Vision" />
      <div className="page-container">

        {/* Source badge */}
        <div className="flex items-center gap-2">
          {source === "loading" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500"><Database size={11} />Carregando…</span>}
          {source === "static"  && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600"><Database size={11} />Snapshot estático</span>}
          {source === "local"   && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs text-violet-600"><HardDrive size={11} />Armazenamento local</span>}
          {source === "empty"   && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"><CloudOff size={11} />Sem dados</span>}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Clientes Recorrentes",  value: String(recorrentes.length), color: "text-emerald-600", icon: RefreshCw      },
            { label: "MRR",                   value: fmtR(mrrTotal),             color: "text-brand-600",   icon: DollarSign     },
            { label: "Saudáveis",             value: String(saudaveis),          color: "text-emerald-600", icon: Heart          },
            { label: "Upsell Potencial Alto",  value: String(upsellAlto),         color: "text-violet-600",  icon: ArrowUpRight   },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon size={15} className={k.color} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Churn alert */}
        {emRisco > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertTriangle size={14} className="shrink-0" />
            <span><strong>{emRisco}</strong> cliente{emRisco > 1 ? "s" : ""} recorrente{emRisco > 1 ? "s" : ""} com risco de churn <strong>Alto</strong>. Ação necessária.</span>
          </div>
        )}

        {/* Recorrentes table */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={14} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-900">Clientes Recorrentes</h2>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{recorrentes.length}</span>
          </div>
          {source === "loading" ? (
            <div className="py-8 text-center text-sm text-gray-400">Carregando…</div>
          ) : recorrentes.length === 0 ? (
            <EmptyState compact title="Nenhum cliente recorrente" description="Atualize o tipo de contrato dos clientes em Carteira." />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Cliente</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Saúde</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Churn</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Upsell</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">MRR</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Budget Anual</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Último Contato</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Inatividade</th>
                  </tr>
                </thead>
                <tbody>
                  {recorrentes.map((c) => {
                    const ds = daysSince(c.ultimo_contato);
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="text-xs font-medium text-gray-800">{c.name}</div>
                          {c.segmento && <div className="text-[10px] text-gray-400">{c.segmento}</div>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={saudeCls(c.saude)}>
                            <Heart size={8} />{c.saude}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={churnBadge(c.churn_risk)}>{c.churn_risk}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            c.upsell_potencial === "Alto" ? "bg-violet-50 text-violet-700 border-violet-200" :
                            c.upsell_potencial === "Médio" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-gray-50 text-gray-400 border-gray-200"}`}>
                            {c.upsell_potencial}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-emerald-600 font-semibold text-xs">{fmtR(c.mrr ?? 0)}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-700 font-semibold">{fmtR(c.budget_anual)}</td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{fmtDate(c.ultimo_contato)}</td>
                        <td className="py-2.5 px-3">
                          {ds !== null ? (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                              ds > 30 ? "bg-red-50 text-red-600 border-red-200" :
                              ds > 14 ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-gray-50 text-gray-400 border-gray-200"}`}>
                              {ds}d
                            </span>
                          ) : <span className="text-gray-300 text-[10px]">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Projetos e avulsos overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-900">Projeto</h2>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{projetos.length}</span>
            </div>
            {projetos.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum cliente por projeto.</p>
            ) : (
              <div className="space-y-2">
                {projetos.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-medium text-gray-700">{c.name}</div>
                      <div className="text-[10px] text-gray-400">{fmtDate(c.ultimo_contato)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={saudeCls(c.saude)}><Heart size={8} />{c.saude}</span>
                      <span className="text-xs font-semibold text-gray-700">{fmtR(c.budget_anual)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={14} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Avulso</h2>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{avulsos.length}</span>
            </div>
            {avulsos.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum cliente avulso.</p>
            ) : (
              <div className="space-y-2">
                {avulsos.map((c) => {
                  const ds = daysSince(c.ultimo_contato);
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium text-gray-700">{c.name}</div>
                        <div className="text-[10px] text-gray-400">Último: {fmtDate(c.ultimo_contato)}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {ds !== null && ds > 90 && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">{ds}d</span>
                        )}
                        <span className="text-xs font-semibold text-gray-500">{fmtR(c.budget_anual)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
