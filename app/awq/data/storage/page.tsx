// ─── AWQ Storage Management — /awq/data/storage ──────────────────────────────
//
// Dedicated view for storage backend status, capacity, and production readiness.
// Shows real adapter selection (Neon DB vs JSON files, Vercel Blob vs local FS).

import Header from "@/components/Header";
import Link from "next/link";
import {
  Database, Server, HardDrive, CheckCircle2, XCircle,
  AlertTriangle, Package, ArrowRight, Layers, Clock,
} from "lucide-react";
import { USE_DB, USE_BLOB } from "@/lib/db";
import { getAllDocuments, getAllTransactions } from "@/lib/financial-db";
import { INGEST_LAYER_STATUS } from "@/lib/financial-ingest-status";

// ─── Sub-navigation shared across /awq/data/* ────────────────────────────────

function DataSubNav({ active }: { active: "overview" | "storage" }) {
  const tabs = [
    { href: "/awq/data",         label: "Visão Geral",   key: "overview" },
    { href: "/awq/data/storage", label: "Storage",       key: "storage"  },
  ];
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={
            "px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors " +
            (active === t.key
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700")
          }
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={
        "inline-block w-2 h-2 rounded-full shrink-0 " +
        (ok ? "bg-emerald-500" : "bg-red-400")
      }
    />
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function StoragePage() {
  const docs  = await getAllDocuments();
  const txns  = await getAllTransactions();

  const doneDocs       = docs.filter((d) => d.status === "done");
  const errorDocs      = docs.filter((d) => d.status === "error");
  const processingDocs = docs.filter((d) => !["done", "error"].includes(d.status));
  const confirmedTxns  = txns.filter((t) => t.classificationConfidence === "confirmed");
  const ambiguousTxns  = txns.filter(
    (t) => t.classificationConfidence === "ambiguous" || t.classificationConfidence === "unclassifiable",
  );

  const lastDoc = docs.length > 0
    ? docs.slice().sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      )[0]
    : null;

  // Storage layers from the ingest status registry
  const storageLayers = INGEST_LAYER_STATUS.filter((l) =>
    l.name.toLowerCase().includes("storage") ||
    l.name.toLowerCase().includes("upload") ||
    l.name.toLowerCase().includes("query") ||
    l.name.toLowerCase().includes("pipeline")
  );

  const backendLabel   = USE_DB   ? "Neon Postgres (DATABASE_URL ativo)"   : "JSON Files (public/data/financial/)";
  const blobLabel      = USE_BLOB ? "Vercel Blob (BLOB_READ_WRITE_TOKEN ativo)" : "Filesystem local (efêmero no Vercel)";
  const backendStatus  = USE_DB   ? "production_ready" : "local_only";
  const blobStatus     = USE_BLOB ? "production_ready" : "local_only";

  return (
    <>
      <Header
        title="Storage — AWQ Group"
        subtitle="Backend de persistência, capacidade e prontidão para produção"
      />
      <div className="page-container">

        <DataSubNav active="storage" />

        {/* ── Status banner ───────────────────────────────────────────────── */}
        {(!USE_DB || !USE_BLOB) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  Storage não está em modo produção
                </p>
                <p className="text-[11px] text-amber-600 mt-1">
                  {!USE_DB && "DATABASE_URL ausente — dados financeiros persistidos em JSON local (efêmero no Vercel). "}
                  {!USE_BLOB && "BLOB_READ_WRITE_TOKEN ausente — PDFs armazenados no filesystem (perdidos entre deploys). "}
                  Configure as variáveis de ambiente no Vercel para habilitar persistência real.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Storage summary cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-gray-500">Documentos</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{docs.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">
              {doneDocs.length} ok · {processingDocs.length} proc. · {errorDocs.length} erro
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-gray-500">Transações</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{txns.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">
              {confirmedTxns.length} confirmadas · {ambiguousTxns.length} ambíguas
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Server size={14} className={USE_DB ? "text-emerald-600" : "text-amber-600"} />
              <span className="text-xs font-semibold text-gray-500">Banco de Dados</span>
            </div>
            <div className={"text-xs font-bold " + (USE_DB ? "text-emerald-600" : "text-amber-600")}>
              {USE_DB ? "Neon (ativo)" : "JSON local"}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              {USE_DB ? "DATABASE_URL configurada" : "Sem DATABASE_URL"}
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={14} className={USE_BLOB ? "text-emerald-600" : "text-amber-600"} />
              <span className="text-xs font-semibold text-gray-500">Blob / Arquivos</span>
            </div>
            <div className={"text-xs font-bold " + (USE_BLOB ? "text-emerald-600" : "text-amber-600")}>
              {USE_BLOB ? "Vercel Blob (ativo)" : "FS local"}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              {USE_BLOB ? "BLOB_READ_WRITE_TOKEN configurado" : "Sem BLOB token"}
            </div>
          </div>
        </div>

        {/* ── Adapter detail ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Adaptadores de Storage Ativos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* DB adapter */}
            <div className={"rounded-lg border p-4 " + (USE_DB ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
              <div className="flex items-center gap-2 mb-2">
                <StatusDot ok={USE_DB} />
                <span className={"text-xs font-bold " + (USE_DB ? "text-emerald-800" : "text-amber-800")}>
                  {USE_DB ? "Neon Postgres" : "JSON Files (fallback)"}
                </span>
              </div>
              <p className={"text-[11px] mb-3 " + (USE_DB ? "text-emerald-700" : "text-amber-700")}>
                {backendLabel}
              </p>
              <div className={"space-y-1 text-[10px] " + (USE_DB ? "text-emerald-600" : "text-amber-600")}>
                <div>Tabelas: <code>financial_documents</code>, <code>bank_transactions</code></div>
                <div>Indices: <code>idx_bt_document_id</code>, <code>idx_bt_entity</code></div>
                {!USE_DB && (
                  <div className="mt-2 rounded bg-red-100 px-2 py-1 text-[10px] text-red-700 font-medium">
                    Sem DATABASE_URL — dados efêmeros no Vercel serverless.
                    Configure Neon no painel do Vercel para persistência real.
                  </div>
                )}
              </div>
              <div className="mt-3 text-[10px] font-semibold">
                {backendStatus === "production_ready"
                  ? <span className="text-emerald-600">producao-ok</span>
                  : <span className="text-amber-600">apenas local</span>}
              </div>
            </div>

            {/* Blob adapter */}
            <div className={"rounded-lg border p-4 " + (USE_BLOB ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
              <div className="flex items-center gap-2 mb-2">
                <StatusDot ok={USE_BLOB} />
                <span className={"text-xs font-bold " + (USE_BLOB ? "text-emerald-800" : "text-amber-800")}>
                  {USE_BLOB ? "Vercel Blob" : "Filesystem local (fallback)"}
                </span>
              </div>
              <p className={"text-[11px] mb-3 " + (USE_BLOB ? "text-emerald-700" : "text-amber-700")}>
                {blobLabel}
              </p>
              <div className={"space-y-1 text-[10px] " + (USE_BLOB ? "text-emerald-600" : "text-amber-600")}>
                <div>Caminho local: <code>public/data/financial/pdfs/</code></div>
                <div>Usado por: <code>api/ingest/upload</code>, <code>api/ingest/process</code></div>
                {!USE_BLOB && (
                  <div className="mt-2 rounded bg-red-100 px-2 py-1 text-[10px] text-red-700 font-medium">
                    Sem BLOB_READ_WRITE_TOKEN — PDFs perdidos entre deploys no Vercel.
                    Adicione Vercel Blob ao projeto para persistir extratos.
                  </div>
                )}
              </div>
              <div className="mt-3 text-[10px] font-semibold">
                {blobStatus === "production_ready"
                  ? <span className="text-emerald-600">producao-ok</span>
                  : <span className="text-amber-600">apenas local</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Store contents ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Conteúdo do Store</h2>
            <span className="ml-auto text-[10px] text-gray-400">
              {docs.length === 0 ? "vazio" : docs.length + " docs · " + txns.length + " txns"}
            </span>
          </div>

          {docs.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
              <Package size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs font-semibold text-gray-500">Nenhum extrato ingerido</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Acesse{" "}
                <Link href="/awq/ingest" className="underline hover:text-gray-600">/awq/ingest</Link>{" "}
                para fazer upload de extratos bancários.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-500">Banco</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-500">Conta</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-500">Entidade</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-500">Status</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-500">Txns</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-500">Ingerido</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                      <td className="py-2 px-2 font-medium text-gray-800">{d.bank}</td>
                      <td className="py-2 px-2 text-gray-600">{d.accountName}</td>
                      <td className="py-2 px-2 text-gray-600">{d.entity}</td>
                      <td className="py-2 px-2">
                        {d.status === "done"
                          ? <CheckCircle2 size={12} className="inline text-emerald-500" />
                          : d.status === "error"
                            ? <XCircle size={12} className="inline text-red-400" />
                            : <Clock size={12} className="inline text-amber-500" />}
                        <span className="ml-1 text-gray-500">{d.status}</span>
                      </td>
                      <td className="py-2 px-2 text-right text-gray-600">{d.transactionCount}</td>
                      <td className="py-2 px-2 text-gray-400">{d.uploadedAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lastDoc && (
            <div className="mt-3 text-[10px] text-gray-400">
              Último ingerido: <span className="font-semibold text-gray-600">{lastDoc.bank}</span>{" "}
              {lastDoc.uploadedAt.slice(0, 10)} · {lastDoc.transactionCount} transações
            </div>
          )}
        </div>

        {/* ── Storage layer status ─────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={15} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Camadas de Storage — Status</h2>
            <span className="ml-auto text-[10px] text-gray-400">{storageLayers.length} camadas</span>
          </div>
          <div className="space-y-3">
            {storageLayers.map((layer) => (
              <div key={layer.name} className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {layer.implementation === "implemented"
                    ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    : <XCircle size={13} className="text-red-400 shrink-0" />}
                  <span className="text-xs font-semibold text-gray-800">{layer.name}</span>
                  <span className={
                    "ml-auto inline-block px-2 py-0.5 rounded text-[9px] font-bold " +
                    (layer.production === "production_ready"
                      ? "bg-emerald-100 text-emerald-700"
                      : layer.production === "local_only"
                        ? "bg-red-100 text-red-600"
                        : "bg-amber-100 text-amber-700")
                  }>
                    {layer.production === "production_ready" ? "produção" :
                     layer.production === "local_only"       ? "apenas local" :
                     layer.production === "requires_infra_upgrade" ? "requer infra" : "staging"}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mb-1">{layer.files[0]}</div>
                <p className="text-[11px] text-gray-600">{layer.notes.slice(0, 120)}{layer.notes.length > 120 ? "..." : ""}</p>
                {layer.knownLimitations.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {layer.knownLimitations.slice(0, 2).map((lim, i) => (
                      <div key={i} className="flex items-start gap-1 text-[10px] text-amber-700">
                        <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                        <span>{lim}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Production checklist ─────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={15} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Checklist para Produção</h2>
          </div>
          <div className="space-y-2">
            {[
              {
                done: USE_DB,
                label: "Configurar DATABASE_URL (Neon Postgres)",
                detail: "Sem DATABASE_URL os dados financeiros são gravados em JSON local — efêmero no Vercel.",
              },
              {
                done: USE_BLOB,
                label: "Configurar BLOB_READ_WRITE_TOKEN (Vercel Blob)",
                detail: "Sem Blob token os PDFs de extratos são perdidos entre cold starts no Vercel.",
              },
              {
                done: docs.length > 0,
                label: "Ingerir ao menos um extrato real",
                detail: "Nenhum extrato bancário real foi processado ainda. Acesse /awq/ingest.",
              },
              {
                done: doneDocs.length > 0 && errorDocs.length === 0,
                label: "Pipeline sem documentos em erro",
                detail: errorDocs.length > 0
                  ? errorDocs.length + " documento(s) com status error — revisar logs de ingestão."
                  : "Nenhum documento com erro.",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                {item.done
                  ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  : <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />}
                <div>
                  <p className={"text-xs font-semibold " + (item.done ? "text-emerald-800" : "text-gray-800")}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><Database size={10} /> Rota: <code>/awq/data/storage</code></span>
            <span className="flex items-center gap-1"><Server size={10} /> Adaptador: <code>lib/db.ts</code> (USE_DB, USE_BLOB)</span>
            <span className="flex items-center gap-1"><Layers size={10} /> Pipeline: <code>lib/financial-ingest-status.ts</code></span>
            <span className="ml-auto flex items-center gap-1">
              <ArrowRight size={10} />
              <Link href="/awq/data" className="underline hover:text-gray-700">Visão Geral</Link>
              <span className="mx-1">·</span>
              <Link href="/awq/ingest" className="underline hover:text-gray-700">Ingestão</Link>
              <span className="mx-1">·</span>
              <Link href="/awq/financial" className="underline hover:text-gray-700">Financial</Link>
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
