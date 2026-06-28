// ─── /enrd/montagem — Controle de Montagem (TEMPO REAL do portal gestão) ─────
// Lê AO VIVO o gestão a cada render (login server-side + fetch). Não depende do
// espelho/migração para visualizar — só das credenciais ENERDY_USER/ENERDY_PASS.
// Em falha/ausência de credenciais, cai para o espelho local (se existir).

import Header from "@/components/Header";
import EnrdMontagemSyncButton from "@/components/EnrdMontagemSyncButton";
import {
  getInstallations,
  buildMontagemKpis,
  getLastSync,
  type MontagemInstallation,
} from "@/lib/enrd-montagem-db";
import { getLiveMontagem, isLiveConfigured } from "@/lib/enrd-montagem-live";
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
  let live = false; // dados vieram ao vivo do gestão
  let liveAt: string | null = null;
  const configured = isLiveConfigured();

  try {
    const snap = await getLiveMontagem(); // tempo real
    if (snap) {
      installations = snap.installations;
      live = true;
      liveAt = snap.fetchedAt;
    } else {
      // sem credenciais → fallback para o espelho local
      [installations, lastSync] = await Promise.all([getInstallations(), getLastSync()]);
    }
  } catch (e) {
    // live falhou → tenta o espelho
    try {
      [installations, lastSync] = await Promise.all([getInstallations(), getLastSync()]);
    } catch {
      loadError = e instanceof Error ? e.message : String(e);
    }
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
            {live ? (
              <>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> AO VIVO
                </span>
                <span className="text-gray-400">
                  · lido do <span className="font-medium text-gray-700">gestão.enerdy.com.br</span> em{" "}
                  {liveAt ? new Date(liveAt).toLocaleTimeString("pt-BR") : "—"}
                </span>
              </>
            ) : (
              <>
                <Zap size={14} className="text-orange-600" />
                Espelho do portal <span className="font-medium text-gray-700">gestão.enerdy.com.br</span>
                {lastSync && (
                  <span className="text-gray-400">
                    · última sync {new Date(lastSync.ran_at).toLocaleString("pt-BR")}
                  </span>
                )}
              </>
            )}
          </div>
          <EnrdMontagemSyncButton />
        </div>

        {loadError && (
          <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> Não foi possível ler os dados: {loadError}
          </div>
        )}

        {!configured && !loadError && (
          <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            Tempo real desligado: defina <code className="px-1 rounded bg-amber-100">ENERDY_USER</code> e{" "}
            <code className="px-1 rounded bg-amber-100">ENERDY_PASS</code> nas env vars da Vercel e faça
            Redeploy. (Conta com acesso de leitura no app de montagem.)
          </div>
        )}

        {configured && empty && !loadError && (
          <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> Conectado ao gestão, mas nenhuma instalação retornou (verifique o
            acesso/RLS da conta).
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
