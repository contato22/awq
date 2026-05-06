// ─── AWQ Storage Management — /awq/data/storage ──────────────────────────────

import Header from "@/components/Header";
import Link from "next/link";
import {
  Database, Server, HardDrive, CheckCircle2, XCircle,
  AlertTriangle, Package, ArrowRight, Layers, Clock,
  FileText, Zap, ShieldCheck, Info,
} from "lucide-react";
import { USE_DB, USE_BLOB } from "@/lib/db";
import { getAllDocuments, getAllTransactions } from "@/lib/financial-db";
import { INGEST_LAYER_STATUS } from "@/lib/financial-ingest-status";

// ─── Sub-nav ─────────────────────────────────────────────────────────────────

function DataSubNav({
  active,
  storageIssues,
}: {
  active: "overview" | "storage";
  storageIssues: number;
}) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      <Link
        href="/awq/data"
        className={
          "px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors " +
          (active === "overview"
            ? "border-gray-900 text-gray-900"
            : "border-transparent text-gray-500 hover:text-gray-700")
        }
      >
        Visão Geral
      </Link>
      <Link
        href="/awq/data/storage"
        className={
          "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors " +
          (active === "storage"
            ? "border-gray-900 text-gray-900"
            : "border-transparent text-gray-500 hover:text-gray-700")
        }
      >
        Storage
        {storageIssues > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
            {storageIssues}
          </span>
        )}
      </Link>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Pill({
  ok,
  labelOk,
  labelNo,
}: {
  ok: boolean;
  labelOk: string;
  labelNo: string;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold " +
        (ok
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-600")
      }
    >
      <span
        className={
          "w-1.5 h-1.5 rounded-full " +
          (ok ? "bg-emerald-500" : "bg-red-400")
        }
      />
      {ok ? labelOk : labelNo}
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className="text-gray-500" />
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {badge && <div className="ml-auto">{badge}</div>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function StoragePage() {
  const docs = await getAllDocuments();
  const txns = await getAllTransactions();

  const doneDocs       = docs.filter((d) => d.status === "done");
  const errorDocs      = docs.filter((d) => d.status === "error");
  const processingDocs = docs.filter((d) => !["done", "error"].includes(d.status));
  const confirmedTxns  = txns.filter((t) => t.classificationConfidence === "confirmed");
  const ambiguousTxns  = txns.filter(
    (t) => t.classificationConfidence === "ambiguous" || t.classificationConfidence === "unclassifiable",
  );
  const lastDoc = docs.length > 0
    ? docs.slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]
    : null;

  const checklist = [
    {
      done:   USE_DB,
      label:  "Banco de dados configurado",
      detail: USE_DB
        ? "Neon Postgres ativo via DATABASE_URL."
        : "Sem DATABASE_URL — dados financeiros em JSON local (efêmero no Vercel).",
      action: !USE_DB ? "Adicionar DATABASE_URL no Vercel" : undefined,
      icon:   Database,
    },
    {
      done:   USE_BLOB,
      label:  "Blob storage configurado",
      detail: USE_BLOB
        ? "Vercel Blob ativo — PDFs persistidos entre deploys."
        : "Sem BLOB_READ_WRITE_TOKEN — PDFs perdidos em cada deploy.",
      action: !USE_BLOB ? "Adicionar Vercel Blob ao projeto" : undefined,
      icon:   HardDrive,
    },
    {
      done:   docs.length > 0,
      label:  "Ao menos um extrato ingerido",
      detail: docs.length > 0
        ? docs.length + " extrato(s) no store."
        : "Nenhum extrato bancário processado ainda.",
      action: docs.length === 0 ? "Acessar /awq/ingest para upload" : undefined,
      icon:   FileText,
    },
    {
      done:   errorDocs.length === 0,
      label:  "Pipeline sem erros",
      detail: errorDocs.length > 0
        ? errorDocs.length + " documento(s) com erro — revisar logs."
        : "Nenhum documento com falha de processamento.",
      action: errorDocs.length > 0 ? "Revisar documentos com erro" : undefined,
      icon:   ShieldCheck,
    },
  ];

  const doneCount   = checklist.filter((c) => c.done).length;
  const issueCount  = checklist.filter((c) => !c.done).length;
  const readinessPct = Math.round((doneCount / checklist.length) * 100);

  const storageLayers = INGEST_LAYER_STATUS.filter((l) =>
    l.name.toLowerCase().includes("storage") ||
    l.name.toLowerCase().includes("upload") ||
    l.name.toLowerCase().includes("query") ||
    l.name.toLowerCase().includes("pipeline")
  );

  return (
    <>
      <Header
        title="Storage — AWQ Group"
        subtitle="Backend de persistência, capacidade e prontidão para produção"
      />
      <div className="page-container">

        <DataSubNav active="storage" storageIssues={issueCount} />

        {/* ── Hero: readiness ─────────────────────────────────────────────── */}
        <div className={
          "rounded-xl border p-5 " +
          (readinessPct === 100
            ? "border-emerald-200 bg-emerald-50"
            : readinessPct >= 50
              ? "border-amber-200 bg-amber-50"
              : "border-red-200 bg-red-50")
        }>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {readinessPct === 100
                  ? <CheckCircle2 size={16} className="text-emerald-600" />
                  : <AlertTriangle size={16} className="text-amber-600" />}
                <span className={
                  "text-sm font-bold " +
                  (readinessPct === 100 ? "text-emerald-800" : readinessPct >= 50 ? "text-amber-800" : "text-red-800")
                }>
                  {readinessPct === 100
                    ? "Storage pronto para produção"
                    : readinessPct >= 50
                      ? "Storage parcialmente configurado"
                      : "Storage não está em modo produção"}
                </span>
              </div>
              <p className={
                "text-[11px] " +
                (readinessPct === 100 ? "text-emerald-700" : readinessPct >= 50 ? "text-amber-700" : "text-red-700")
              }>
                {doneCount}/{checklist.length} requisitos atendidos
                {issueCount > 0 && " — " + issueCount + " item(s) pendente(s)"}
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={
                    "h-full rounded-full transition-all " +
                    (readinessPct === 100 ? "bg-emerald-500" : readinessPct >= 50 ? "bg-amber-400" : "bg-red-400")
                  }
                  style={{ width: readinessPct + "%" }}
                />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Pill ok={USE_DB}   labelOk="Neon ativo"  labelNo="Sem DB"   />
              <Pill ok={USE_BLOB} labelOk="Blob ativo"  labelNo="Sem Blob" />
            </div>
          </div>
        </div>

        {/* ── Summary cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon:  Package,
              color: "text-violet-600",
              label: "Documentos",
              value: docs.length,
              sub:   doneDocs.length + " ok · " + processingDocs.length + " proc. · " + errorDocs.length + " erro",
            },
            {
              icon:  Database,
              color: "text-blue-600",
              label: "Transações",
              value: txns.length,
              sub:   confirmedTxns.length + " confirmadas · " + ambiguousTxns.length + " ambíguas",
            },
            {
              icon:  Server,
              color: USE_DB ? "text-emerald-600" : "text-amber-500",
              label: "Banco de Dados",
              value: USE_DB ? "Neon" : "JSON",
              sub:   USE_DB ? "DATABASE_URL ativa" : "Sem DATABASE_URL",
              warn:  !USE_DB,
            },
            {
              icon:  HardDrive,
              color: USE_BLOB ? "text-emerald-600" : "text-amber-500",
              label: "Blob Storage",
              value: USE_BLOB ? "Vercel" : "Local",
              sub:   USE_BLOB ? "BLOB token ativo" : "Sem BLOB token",
              warn:  !USE_BLOB,
            },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className={"card p-4 " + (c.warn ? "border-amber-200" : "")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className={c.color} />
                  <span className="text-xs font-semibold text-gray-500">{c.label}</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{c.value}</div>
                <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">{c.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ── Adapters ────────────────────────────────────────────────────── */}
        <div className="card p-5">
          <SectionHeader icon={Server} title="Adaptadores Ativos" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* DB */}
            <div className={
              "rounded-xl border p-4 " +
              (USE_DB ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 bg-gray-50")
            }>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={
                    "w-8 h-8 rounded-lg flex items-center justify-center " +
                    (USE_DB ? "bg-emerald-100" : "bg-gray-100")
                  }>
                    <Database size={15} className={USE_DB ? "text-emerald-600" : "text-gray-400"} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      {USE_DB ? "Neon Postgres" : "JSON Files"}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {USE_DB ? "Banco de dados relacional" : "Fallback local"}
                    </p>
                  </div>
                </div>
                <Pill ok={USE_DB} labelOk="ativo" labelNo="inativo" />
              </div>

              <div className="space-y-1.5 text-[10px] text-gray-600">
                {USE_DB ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                      <code>financial_documents</code>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                      <code>bank_transactions</code>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                      <code>idx_bt_document_id, idx_bt_entity</code>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Info size={10} className="text-gray-400 shrink-0" />
                      <code>public/data/financial/documents.json</code>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Info size={10} className="text-gray-400 shrink-0" />
                      <code>public/data/financial/transactions.json</code>
                    </div>
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2">
                      <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-amber-700">
                        Efêmero no Vercel — configure <strong>DATABASE_URL</strong> para persistência real.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Blob */}
            <div className={
              "rounded-xl border p-4 " +
              (USE_BLOB ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 bg-gray-50")
            }>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={
                    "w-8 h-8 rounded-lg flex items-center justify-center " +
                    (USE_BLOB ? "bg-emerald-100" : "bg-gray-100")
                  }>
                    <HardDrive size={15} className={USE_BLOB ? "text-emerald-600" : "text-gray-400"} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      {USE_BLOB ? "Vercel Blob" : "Filesystem Local"}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {USE_BLOB ? "Armazenamento de arquivos" : "Fallback local (PDFs)"}
                    </p>
                  </div>
                </div>
                <Pill ok={USE_BLOB} labelOk="ativo" labelNo="inativo" />
              </div>

              <div className="space-y-1.5 text-[10px] text-gray-600">
                {USE_BLOB ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                      <span>PDFs de extratos persistidos entre deploys</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                      <code>BLOB_READ_WRITE_TOKEN configurado</code>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Info size={10} className="text-gray-400 shrink-0" />
                      <code>public/data/financial/pdfs/</code>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Info size={10} className="text-gray-400 shrink-0" />
                      <span>Usado por <code>api/ingest/upload</code></span>
                    </div>
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2">
                      <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-amber-700">
                        PDFs perdidos entre deploys — configure <strong>BLOB_READ_WRITE_TOKEN</strong>.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Store contents ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <SectionHeader
            icon={Package}
            title="Conteúdo do Store"
            badge={
              <span className="text-[10px] text-gray-400">
                {docs.length === 0 ? "vazio" : docs.length + " docs · " + txns.length + " txns"}
              </span>
            }
          />

          {docs.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Package size={18} className="text-gray-300" />
              </div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Nenhum extrato ingerido</p>
              <p className="text-[11px] text-gray-400 mb-4">
                O store financeiro está vazio. Faça upload de extratos bancários para popular os dashboards.
              </p>
              <Link
                href="/awq/ingest"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
              >
                <Zap size={12} />
                Ir para Ingestão
              </Link>
            </div>
          ) : (
            <>
              {/* Mini stat row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Concluídos",   value: doneDocs.length,       color: "text-emerald-600" },
                  { label: "Processando",  value: processingDocs.length, color: "text-amber-500"   },
                  { label: "Com erro",     value: errorDocs.length,      color: "text-red-500"     },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-center">
                    <div className={"text-lg font-bold " + s.color}>{s.value}</div>
                    <div className="text-[10px] text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Banco</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Conta</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Entidade</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Status</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Txns</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Ingerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-2 font-semibold text-gray-800">{d.bank}</td>
                        <td className="py-2.5 px-2 text-gray-500 font-mono text-[10px]">{d.accountName}</td>
                        <td className="py-2.5 px-2 text-gray-500">{d.entity}</td>
                        <td className="py-2.5 px-2">
                          <span className={
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold " +
                            (d.status === "done"
                              ? "bg-emerald-100 text-emerald-700"
                              : d.status === "error"
                                ? "bg-red-100 text-red-600"
                                : "bg-amber-100 text-amber-700")
                          }>
                            {d.status === "done"
                              ? <CheckCircle2 size={9} />
                              : d.status === "error"
                                ? <XCircle size={9} />
                                : <Clock size={9} />}
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-gray-600">{d.transactionCount}</td>
                        <td className="py-2.5 px-2 text-gray-400">{d.uploadedAt.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lastDoc && (
                <p className="mt-3 text-[10px] text-gray-400">
                  Último ingerido:{" "}
                  <span className="font-semibold text-gray-600">{lastDoc.bank}</span>{" "}
                  em {lastDoc.uploadedAt.slice(0, 10)} · {lastDoc.transactionCount} transações
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Production checklist ─────────────────────────────────────────── */}
        <div className="card p-5">
          <SectionHeader
            icon={ShieldCheck}
            title="Checklist de Produção"
            badge={
              <span className={
                "text-[10px] font-semibold px-2 py-0.5 rounded-full " +
                (doneCount === checklist.length
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700")
              }>
                {doneCount}/{checklist.length}
              </span>
            }
          />
          <div className="space-y-2">
            {checklist.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className={
                    "flex items-start gap-3 rounded-xl border p-4 transition-colors " +
                    (item.done
                      ? "border-emerald-100 bg-emerald-50/40"
                      : "border-red-100 bg-red-50/40")
                  }
                >
                  <div className={
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 " +
                    (item.done ? "bg-emerald-100" : "bg-red-100")
                  }>
                    <Icon size={13} className={item.done ? "text-emerald-600" : "text-red-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={"text-xs font-semibold " + (item.done ? "text-emerald-800" : "text-gray-800")}>
                        {item.label}
                      </p>
                      {item.done
                        ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        : <XCircle size={12} className="text-red-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-500">{item.detail}</p>
                    {item.action && (
                      <p className="text-[10px] text-red-600 font-medium mt-1">→ {item.action}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Layer status ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <SectionHeader
            icon={Layers}
            title="Camadas de Storage"
            badge={
              <span className="text-[10px] text-gray-400">
                {storageLayers.length} camadas
              </span>
            }
          />
          <div className="divide-y divide-gray-100">
            {storageLayers.map((layer) => {
              const prodOk = layer.production === "production_ready";
              const prodAmber = layer.production === "staging_only" || layer.production === "requires_infra_upgrade";
              return (
                <div key={layer.name} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    {layer.implementation === "implemented"
                      ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      : <XCircle size={12} className="text-red-400 shrink-0" />}
                    <span className="text-xs font-semibold text-gray-800">{layer.name}</span>
                    <span className={
                      "ml-auto inline-block px-2 py-0.5 rounded-full text-[9px] font-bold " +
                      (prodOk    ? "bg-emerald-100 text-emerald-700" :
                       prodAmber ? "bg-amber-100 text-amber-700"     :
                                   "bg-red-100 text-red-600")
                    }>
                      {prodOk    ? "produção" :
                       layer.production === "local_only" ? "apenas local" :
                       layer.production === "requires_infra_upgrade" ? "requer infra" : "staging"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono ml-5 mb-1">{layer.files[0]}</p>
                  <p className="text-[11px] text-gray-500 ml-5 leading-relaxed">
                    {layer.notes.slice(0, 110)}{layer.notes.length > 110 ? "…" : ""}
                  </p>
                  {layer.knownLimitations.length > 0 && (
                    <div className="ml-5 mt-1.5 space-y-0.5">
                      {layer.knownLimitations.slice(0, 1).map((lim, i) => (
                        <p key={i} className="flex items-start gap-1 text-[10px] text-amber-600">
                          <AlertTriangle size={9} className="shrink-0 mt-0.5" />
                          {lim}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Database size={10} />
              <code>/awq/data/storage</code>
            </span>
            <span className="flex items-center gap-1">
              <Server size={10} />
              <code>lib/db.ts</code> (USE_DB, USE_BLOB)
            </span>
            <span className="flex items-center gap-1">
              <Layers size={10} />
              <code>lib/financial-ingest-status.ts</code>
            </span>
            <div className="ml-auto flex items-center gap-3">
              <Link href="/awq/data" className="hover:text-gray-600 transition-colors flex items-center gap-1">
                <ArrowRight size={9} />Visão Geral
              </Link>
              <Link href="/awq/ingest" className="hover:text-gray-600 transition-colors flex items-center gap-1">
                <ArrowRight size={9} />Ingestão
              </Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
