// ─── /enrd/conciliacao — Conciliação Cora Enerdy ─────────────────────────────
// Página exclusiva da BU ENRD: exibe apenas as transações da conta Cora Enerdy
// e o board de conciliação filtrado por entity=ENERDY.
//
// Acesso: somente owners/admins (middleware bloqueia role=enrd nesta rota).
// Gabriel (role=enrd) não tem acesso a /enrd/conciliacao por design.

import nextDynamic from "next/dynamic";
import Link from "next/link";
import Header from "@/components/Header";
import CoraStatusPanel from "@/components/CoraStatusPanel";
import EnrdFlowChart from "@/components/EnrdFlowChart";
import { getTransactionsByEntity } from "@/lib/financial-db";
import { getAllAR, initAPARDB } from "@/lib/ap-ar-db";
import { listProjects } from "@/lib/ppm-db";
import { isCoraEnerdyConfigured, coraEnerdyDiag } from "@/lib/cora-api";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  GitMerge,
  KeyRound,
  Landmark,
  RefreshCw,
  Zap,
} from "lucide-react";

const BankReconciliationBoard = nextDynamic(
  () => import("@/components/BankReconciliationBoard"),
  { ssr: false }
);

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EnrdConciliacaoPage() {
  const coraConfigured = isCoraEnerdyConfigured();
  const coraDiag       = coraEnerdyDiag();
  const vercelEnv      = process.env.VERCEL_ENV ?? null;
  const commitRef      = process.env.VERCEL_GIT_COMMIT_REF ?? null;

  // ── Carregar transações ENRD ──────────────────────────────────────────────
  let transactions: Awaited<ReturnType<typeof getTransactionsByEntity>> = [];
  let loadError: string | null = null;

  try {
    transactions = await getTransactionsByEntity("ENERDY");
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Erro ao carregar transações";
  }

  // ── AR pendente (filtrado por bu_code ENRD ou entity ENERDY) ─────────────
  let arPending: { id: string; customer_name: string; net_amount: number; due_date: string }[] = [];
  // arDailyAll: AR esperado agregado por dia (epm_ar + retainers PPM + fallback ENRD),
  // pra alimentar a coluna "AR Previsto" no chart diário.
  const arDailyAll: { date: string; amount: number }[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const horizon  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const horizonD = new Date(); horizonD.setMonth(horizonD.getMonth() + 12);
  const horizonStr = horizonD.toISOString().slice(0, 10);

  // Bucket diário compartilhado entre as 3 fontes (epm_ar + PPM + fallback)
  const dayMap = new Map<string, number>();

  function projectMonthly(start: string, end: string, mrr: number) {
    if (!start || !end || end < start || mrr <= 0) return;
    const billDay = Math.min(parseInt(start.slice(8, 10)) || 5, 28);
    const [sy, sm] = [parseInt(start.slice(0, 4)), parseInt(start.slice(5, 7))];
    const [ey, em] = [parseInt(end.slice(0, 4)),   parseInt(end.slice(5, 7))];
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      const date = `${y}-${String(m).padStart(2, "0")}-${String(billDay).padStart(2, "0")}`;
      // Retainer: só projeta cobranças futuras. Passado se assume recebido
      // (estaria em epm_ar ou no banco), evita pile-up em HOJE.
      if (date >= todayStr) {
        dayMap.set(date, (dayMap.get(date) ?? 0) + mrr);
      }
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  }

  // Fonte 1: epm_ar (AP/AR EPM) — pode estar vazio pra ENRD
  try {
    await initAPARDB();
    const allAR = await getAllAR();
    const openAR = allAR.filter(
      (i) => i.status === "PENDING" || i.status === "PARTIAL" || i.status === "OVERDUE"
    );

    arPending = openAR
      .filter((i) => i.due_date <= horizon)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 8)
      .map((i) => ({
        id: i.id,
        customer_name: i.customer_name,
        net_amount: i.status === "PARTIAL" ? i.net_amount - (i.received_amount ?? 0) : i.net_amount,
        due_date: i.due_date,
      }));

    for (const i of openAR) {
      const open =
        i.status === "PARTIAL" ? i.net_amount - (i.received_amount ?? 0) : i.net_amount;
      if (open <= 0) continue;
      const bucket = i.due_date < todayStr ? todayStr : i.due_date;
      dayMap.set(bucket, (dayMap.get(bucket) ?? 0) + open);
    }
  } catch { /* AR EPM indisponível */ }

  // Fonte 2: retainers ativos do PPM (ENRD)
  let ppmRetainersFound = 0;
  try {
    const projects = await listProjects({ bu_code: "ENRD", status: "active" });
    for (const p of projects) {
      if (p.contract_type !== "retainer") continue;
      if (p.billing_frequency !== "monthly") continue;
      const mrr = Number(p.budget_revenue) || 0;
      if (mrr <= 0) continue;
      const start = p.start_date;
      const end = p.planned_end_date && p.planned_end_date < horizonStr ? p.planned_end_date : horizonStr;
      projectMonthly(start, end, mrr);
      ppmRetainersFound += 1;
    }
  } catch { /* PPM indisponível */ }

  // Fonte 3: fallback ENRD retainers conhecidos. Garante que a coluna sempre
  // mostra a posição comercial real mesmo se PPM/epm_ar estiverem vazios em prod.
  // Lista canônica vinda da proposta ENRD vigente — atualizar aqui ao fechar
  // novos contratos retainer (ou popular PPM e a Fonte 2 cobre).
  if (ppmRetainersFound === 0) {
    const ENRD_RETAINERS_FALLBACK = [
      { customer: "Coral Home", mrr: 1790, start: todayStr },
    ];
    for (const r of ENRD_RETAINERS_FALLBACK) {
      projectMonthly(r.start, horizonStr, r.mrr);
    }
  }

  for (const [date, amount] of dayMap) arDailyAll.push({ date, amount });

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const total       = transactions.length;
  const conciliado  = transactions.filter((t) => t.reconciliationStatus === "conciliado").length;
  const pendente    = transactions.filter(
    (t) => !t.reconciliationStatus || t.reconciliationStatus === "pendente"
  ).length;
  const pct         = total > 0 ? Math.round((conciliado / total) * 100) : 0;

  const credito = transactions
    .filter((t) => t.direction === "credit")
    .reduce((s, t) => s + (t.amount ?? 0), 0);
  const debito = transactions
    .filter((t) => t.direction === "debit")
    .reduce((s, t) => s + (t.amount ?? 0), 0);

  return (
    <>
      <Header
        title="Conciliação Enerdy"
        subtitle="Conta Cora Enerdy · BU ENRD · Sync exclusivo"
      />
      <div className="page-container">

        {/* ── Credenciais não configuradas (diagnóstico granular) ──────── */}
        {!coraDiag.ready && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
            <KeyRound size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                Credenciais Cora Enerdy {coraConfigured ? "presentes mas inválidas" : "não configuradas"}
              </p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Estado das variáveis de ambiente no deploy atual
                {vercelEnv ? <> · <span className="font-mono">VERCEL_ENV={vercelEnv}</span></> : null}
                {commitRef ? <> · <span className="font-mono">branch={commitRef}</span></> : null}:
              </p>
              <ul className="mt-2 space-y-1 text-xs font-mono text-amber-800">
                <li className="flex items-center gap-2">
                  <span className={coraDiag.clientId ? "text-emerald-600" : "text-red-600"}>
                    {coraDiag.clientId ? "✓" : "✗"}
                  </span>
                  CORA_ENERDY_CLIENT_ID
                  {!coraDiag.clientId && <span className="text-amber-600 font-sans">— ausente ou vazio</span>}
                </li>
                <li className="flex items-center gap-2">
                  <span className={coraDiag.cert.present && coraDiag.cert.looksPem ? "text-emerald-600" : "text-red-600"}>
                    {coraDiag.cert.present && coraDiag.cert.looksPem ? "✓" : "✗"}
                  </span>
                  CORA_ENERDY_CERT
                  {!coraDiag.cert.present && <span className="text-amber-600 font-sans">— ausente ou vazio</span>}
                  {coraDiag.cert.present && !coraDiag.cert.looksPem && (
                    <span className="text-amber-600 font-sans">— presente mas sem cabeçalho PEM (esperado &quot;-----BEGIN CERTIFICATE-----&quot;); valor pode estar truncado ou com escape de \n quebrado</span>
                  )}
                </li>
                <li className="flex items-center gap-2">
                  <span className={coraDiag.key.present && coraDiag.key.looksPem ? "text-emerald-600" : "text-red-600"}>
                    {coraDiag.key.present && coraDiag.key.looksPem ? "✓" : "✗"}
                  </span>
                  CORA_ENERDY_KEY
                  {!coraDiag.key.present && <span className="text-amber-600 font-sans">— ausente ou vazio</span>}
                  {coraDiag.key.present && !coraDiag.key.looksPem && (
                    <span className="text-amber-600 font-sans">— presente mas sem cabeçalho PEM (esperado &quot;-----BEGIN PRIVATE KEY-----&quot;); valor pode estar truncado ou com escape de \n quebrado</span>
                  )}
                </li>
              </ul>
              <p className="text-[11px] text-amber-700 mt-3 leading-relaxed">
                {vercelEnv === "preview" && (
                  <>Esta build é de <b>preview</b>. Vars do Vercel precisam estar no scope <b>Preview</b> (não só <b>Production</b>). <br /></>
                )}
                Setado as vars depois do build atual? É preciso <b>redeploy</b> (Deployments → ⋯ → Redeploy) para o runtime carregá-las.
              </p>
              <div className="mt-3 pt-3 border-t border-amber-200 text-[11px] text-amber-700 leading-relaxed">
                <p className="font-semibold text-amber-800 mb-0.5">Fallback opt-in:</p>
                {coraDiag.fallback.enabled ? (
                  coraDiag.fallback.holdingReady ? (
                    <p className="text-emerald-700">
                      ✓ <span className="font-mono">CORA_ENERDY_USE_HOLDING=true</span> ativo. Sync ENERDY rodando com credenciais AWQ_Holding.
                    </p>
                  ) : (
                    <p className="text-red-700">
                      <span className="font-mono">CORA_ENERDY_USE_HOLDING=true</span> ativo mas AWQ_Holding (CORA_CLIENT_ID/CERT/KEY) também não está configurado.
                    </p>
                  )
                ) : (
                  <p>
                    Como atalho, set <span className="font-mono">CORA_ENERDY_USE_HOLDING=true</span> no Vercel pra reusar as credenciais AWQ_Holding{coraDiag.fallback.holdingReady ? " (já configuradas)" : " (atualmente não configuradas tampouco)"} no sync ENERDY.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Erro de carregamento ─────────────────────────────────────── */}
        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Falha ao carregar transações</p>
              <p className="text-xs text-red-700 mt-0.5 font-mono">{loadError}</p>
            </div>
          </div>
        )}

        {/* ── KPIs ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total de Transações", value: total.toString(),           icon: Landmark,    color: "text-brand-700",   bg: "bg-brand-50"   },
            { label: "Conciliadas",          value: `${conciliado} (${pct}%)`, icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Pendentes",            value: pendente.toString(),        icon: RefreshCw,   color: "text-amber-700",   bg: "bg-amber-50"   },
            { label: "Saldo Líquido",        value: fmt(credito - debito),      icon: Zap,         color: "text-orange-700",  bg: "bg-orange-50"  },
          ].map((kpi) => (
            <div key={kpi.label} className="card p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                <kpi.icon size={14} className={kpi.color} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">{kpi.value}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 truncate">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Fluxo de Caixa Cora Enerdy ──────────────────────────────── */}
        <EnrdFlowChart
          transactions={transactions}
          coraConfigured={coraConfigured}
          arDaily={arDailyAll}
        />

        {/* ── Cora Enerdy sync panel ───────────────────────────────────── */}
        {coraConfigured && (
          <CoraStatusPanel
            transactions={transactions}
            onlyAccounts={["ENERDY"]}
          />
        )}

        {/* ── Board de conciliação ─────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="section-header mb-0">
            <div className="flex items-start gap-3 min-w-0">
              <div className="section-title">
                <GitMerge size={15} className="text-orange-500 shrink-0" />
                <h2>Conciliação Bancária · Enerdy</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                Associe movimentações da Cora Enerdy às AP/AR da BU ENRD
              </p>
            </div>
            {total > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 whitespace-nowrap">{pct}%</span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{conciliado}/{total} txns</span>
              </div>
            )}
          </div>

          {total === 0 && !loadError ? (
            <div className="card p-10 flex flex-col items-center gap-3 text-center">
              <Landmark size={28} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Nenhuma transação Enerdy encontrada</p>
              <p className="text-xs text-gray-400">
                {coraConfigured
                  ? "Use o painel Cora acima para sincronizar o extrato bancário."
                  : "Configure as credenciais Cora Enerdy para importar o extrato bancário."}
              </p>
            </div>
          ) : (
            <BankReconciliationBoard
              initialTransactions={transactions}
              isStatic={false}
              coraConfigured={coraConfigured}
            />
          )}
        </section>

        {/* ── AR Pipeline Enerdy ───────────────────────────────────────── */}
        {arPending.length > 0 && (
          <section className="card p-5 space-y-3">
            <div className="section-header mb-0">
              <div className="section-title">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <h2>AR · Recebimentos Esperados · ENRD</h2>
              </div>
              <Link href="/awq/epm/ar" className="section-link">
                Ver AR <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="grid gap-1">
              {arPending.map((item) => {
                const todayDate = new Date().toISOString().slice(0, 10);
                const overdue = item.due_date < todayDate;
                const [y, m, d] = item.due_date.split("-");
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between text-xs rounded-xl px-3 py-2 ${
                      overdue ? "bg-red-50 border border-red-200" : "bg-white border border-orange-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={11} className={overdue ? "text-red-400 shrink-0" : "text-orange-400 shrink-0"} />
                      <span className="font-medium text-gray-700 truncate">{item.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`tabular-nums font-semibold ${overdue ? "text-red-700" : "text-emerald-700"}`}>
                        {fmt(item.net_amount ?? 0)}
                      </span>
                      <span className={`text-[10px] ${overdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                        {`${d}/${m}/${y}`}{overdue ? " ⚠" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
          <span className="text-overline mr-1">Ver também:</span>
          {[
            { href: "/enrd/financial",    label: "Financial ENRD" },
            { href: "/awq/epm/pl",        label: "P&L (DRE)"      },
            { href: "/awq/conciliacao",   label: "Conciliação AWQ" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs"
            >
              {item.label}
              <ArrowUpRight size={10} className="text-gray-400" />
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}
