// ─── /enrd/montagem — Controle de Montagem (espelho do portal gestão) ────────
// Lê o espelho LOCAL no banco da AWQ (enrd_montagem_*), nunca o portal externo.
// Sincronização sob demanda via botão (POST /api/enrd/montagem/sync).
//
// Tolerante a falha: se a tabela ainda não foi migrada, monta vazio com banner.

import Header from "@/components/Header";
import EnrdMontagemSyncButton from "@/components/EnrdMontagemSyncButton";
import {
  getInstallations,
  buildMontagemKpis,
  getLastSync,
  type MontagemInstallation,
} from "@/lib/enrd-montagem-db";
import {
  Zap,
  CheckCircle2,
  Wrench,
  CalendarClock,
  AlertCircle,
  Sun,
  LayoutGrid,
  HardHat,
  MapPin,
} from "lucide-react";

export const dynamic = "force-dynamic";

function n(v: number) {
  return v.toLocaleString("pt-BR");
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : s;
}

function statusBadge(status: string | null, situacao: string | null) {
  const s = `${status ?? ""} ${situacao ?? ""}`;
  let cls = "bg-gray-100 text-gray-600 border-gray-200";
  if (/conclu|finaliz|entreg/i.test(s)) cls = "bg-emerald-50 text-emerald-700 border-emerald-200";
  else if (/execu|andamento|montando/i.test(s)) cls = "bg-blue-50 text-blue-700 border-blue-200";
  else if (/agend|programad/i.test(s)) cls = "bg-amber-50 text-amber-700 border-amber-200";
  else if (/aten|pend|atras|bloque/i.test(s)) cls = "bg-red-50 text-red-700 border-red-200";
  return cls;
}

export default async function EnrdMontagemPage() {
  let installations: MontagemInstallation[] = [];
  let lastSync: Awaited<ReturnType<typeof getLastSync>> = null;
  let loadError: string | null = null;

  try {
    [installations, lastSync] = await Promise.all([getInstallations(), getLastSync()]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const kpis = buildMontagemKpis(installations);
  const empty = installations.length === 0;

  const kpiCards = [
    { label: "Instalações", value: n(kpis.total), icon: LayoutGrid },
    { label: "Concluídas", value: n(kpis.concluido), icon: CheckCircle2 },
    { label: "Em execução", value: n(kpis.emExecucao), icon: Wrench },
    { label: "Agendadas", value: n(kpis.agendado), icon: CalendarClock },
    { label: "Atenção", value: n(kpis.atencao), icon: AlertCircle },
    { label: "Placas (total)", value: n(kpis.placasTotais), icon: Sun },
  ];

  return (
    <>
      <Header title="Controle de Montagem — ENRD" subtitle="Agência Solar · AWQ Group" />
      <div className="page-container">

        {/* Barra de ação / origem */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <Zap size={14} className="text-orange-600" />
            Espelho do portal <span className="font-medium text-gray-700">gestão.enerdy.com.br</span>
            {lastSync && (
              <span className="text-gray-400">
                · última sync {new Date(lastSync.ran_at).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
          <EnrdMontagemSyncButton />
        </div>

        {loadError && (
          <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> Não foi possível ler o banco: {loadError}
          </div>
        )}

        {empty && !loadError && (
          <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            Nenhuma instalação no espelho ainda. Rode a migração{" "}
            <code className="px-1 rounded bg-amber-100">006_enrd_montagem.sql</code> e clique em
            <strong> Sincronizar do gestão</strong>.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <kpi.icon size={16} className="text-orange-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Geração esperada + breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Sun size={14} className="text-orange-600" /> Geração esperada
            </h2>
            <div className="text-2xl font-bold text-gray-900">
              {n(Math.round(kpis.geracaoEsperadaKwhAno))} <span className="text-sm font-normal text-gray-500">kWh/ano</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Soma da expectativa de geração das instalações.</p>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <LayoutGrid size={14} className="text-orange-600" /> Por status
            </h2>
            <ul className="space-y-1.5">
              {kpis.porStatus.slice(0, 6).map((s) => (
                <li key={s.status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">{s.status}</span>
                  <span className="font-semibold text-gray-900">{n(s.count)}</span>
                </li>
              ))}
              {kpis.porStatus.length === 0 && <li className="text-sm text-gray-400">—</li>}
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <HardHat size={14} className="text-orange-600" /> Por montador
            </h2>
            <ul className="space-y-1.5">
              {kpis.porMontador.slice(0, 6).map((m) => (
                <li key={m.montador} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">{m.montador}</span>
                  <span className="font-semibold text-gray-900">{n(m.count)}</span>
                </li>
              ))}
              {kpis.porMontador.length === 0 && <li className="text-sm text-gray-400">—</li>}
            </ul>
          </div>
        </div>

        {/* Lista de instalações */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Wrench size={14} className="text-orange-600" /> Instalações ({n(installations.length)})
          </h2>
          {empty ? (
            <div className="py-8 text-center text-sm text-gray-400">Nenhuma instalação sincronizada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b">
                    <th className="py-2 pr-3 font-medium">Cliente / Local</th>
                    <th className="py-2 px-3 font-medium">Montador</th>
                    <th className="py-2 px-3 font-medium">Placas</th>
                    <th className="py-2 px-3 font-medium">Data</th>
                    <th className="py-2 pl-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {installations.slice(0, 100).map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-gray-900">{r.nome || "—"}</div>
                        {r.localizacao && (
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin size={10} /> {r.localizacao}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-600">{r.montador || "—"}</td>
                      <td className="py-2 px-3 text-gray-600">{r.qnt_placas ?? "—"}</td>
                      <td className="py-2 px-3 text-gray-600">{fmtDate(r.data_int)}</td>
                      <td className="py-2 pl-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs border ${statusBadge(
                            r.status,
                            r.situacao
                          )}`}
                        >
                          {r.status || r.situacao || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {installations.length > 100 && (
                <div className="text-xs text-gray-400 mt-3 text-center">
                  Mostrando 100 de {n(installations.length)} instalações.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
