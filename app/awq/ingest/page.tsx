"use client";

// ─── Environment detection ─────────────────────────────────────────────────────
// NEXT_PUBLIC_STATIC_DATA=1 is set by the GitHub Pages workflow (STATIC_EXPORT=1).
// In a static export there is no server, no filesystem writes, and no API routes.
// The ingestion pipeline is structurally incompatible with this environment.
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

import { useState, useRef, useCallback, useEffect } from "react";
import Header from "@/components/Header";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2, X,
  Building2, ArrowUpRight, ArrowDownRight,
  RefreshCw, AlertTriangle, Eye, Filter, Info,
  GitMerge, Clock, TrendingUp, TrendingDown,
  type LucideIcon,
} from "lucide-react";

// ─── Types (client-safe — mirrors lib/financial-db without fs imports) ────────

type BankName =
  | "Cora" | "Nubank" | "Inter" | "C6 Bank" | "PagBank" | "BTG Empresas" | "XP" | "Mercado Pago"
  | "Itaú" | "Bradesco" | "Banco do Brasil" | "Santander" | "Sicoob" | "Sicredi"
  | "Outro";
type EntityLayer = "AWQ_Holding" | "JACQES" | "Caza_Vision" | "Intercompany" | "Socio_PF" | "Unknown";
type DocumentStatus = "received" | "extracting" | "classifying" | "reconciling" | "done" | "error";

interface FinancialDocument {
  id: string;
  filename: string;
  bank: BankName;
  accountName: string;
  entity: EntityLayer;
  periodStart: string | null;
  periodEnd: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  uploadedAt: string;
  status: DocumentStatus;
  errorMessage: string | null;
  transactionCount: number;
  parserConfidence: "high" | "medium" | "low" | null;
  extractionNotes: string | null;
}

interface BankTransaction {
  id: string;
  documentId: string;
  bank: string;
  accountName: string;
  entity: EntityLayer;
  transactionDate: string;
  descriptionOriginal: string;
  amount: number;
  direction: "credit" | "debit";
  counterpartyName: string | null;
  managerialCategory: string;
  classificationConfidence: "confirmed" | "probable" | "ambiguous" | "unclassifiable";
  classificationNote: string | null;
  isIntercompany: boolean;
  excludedFromConsolidated: boolean;
}

interface PipelineEvent {
  stage?: string;
  message?: string;
  error?: string;
  done?: boolean;
  success?: boolean;
  confidence?: string;
  transactionCount?: number;
  intercompanyMatches?: number;
  amountEliminated?: number;
  ambiguous?: number;
  extractionNotes?: string;
  summary?: {
    transactionCount: number;
    parserConfidence: string;
    intercompanyMatches: number;
    amountEliminated: number;
    ambiguous: number;
    extractionNotes: string;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BANK_GROUPS: { label: string; banks: BankName[] }[] = [
  {
    label: "Digital / Fintech",
    banks: ["Cora", "Nubank", "Inter", "C6 Bank", "PagBank", "BTG Empresas", "XP", "Mercado Pago"],
  },
  {
    label: "Tradicional",
    banks: ["Itaú", "Bradesco", "Banco do Brasil", "Santander", "Sicoob", "Sicredi"],
  },
  {
    label: "Outro",
    banks: ["Outro"],
  },
];

const ENTITY_OPTIONS: { value: EntityLayer; label: string }[] = [
  { value: "AWQ_Holding", label: "AWQ Holding" },
  { value: "JACQES",      label: "JACQES" },
  { value: "Caza_Vision", label: "Caza Vision" },
  { value: "Unknown",     label: "Auto-detectar" },
];

const STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  received:    { label: "Recebido",     color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   icon: Clock },
  extracting:  { label: "Extraindo",    color: "text-amber-700",  bg: "bg-amber-50 border-amber-200", icon: Loader2 },
  classifying: { label: "Classificando",color: "text-purple-700", bg: "bg-purple-50 border-purple-200",icon: Loader2 },
  reconciling: { label: "Reconciliando",color: "text-cyan-700",   bg: "bg-cyan-50 border-cyan-200",   icon: Loader2 },
  done:        { label: "Concluído",    color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200",icon: CheckCircle2 },
  error:       { label: "Erro",         color: "text-red-700",    bg: "bg-red-50 border-red-200",     icon: AlertCircle },
};

const CONFIDENCE_CONFIG = {
  high:   { label: "Alta",  color: "text-emerald-700", bg: "bg-emerald-100" },
  medium: { label: "Média", color: "text-amber-700",   bg: "bg-amber-100" },
  low:    { label: "Baixa", color: "text-red-700",     bg: "bg-red-100" },
};

const CONFIDENCE_TX_CONFIG = {
  confirmed:      { label: "Confirmado",  color: "text-emerald-700", bg: "bg-emerald-100" },
  probable:       { label: "Provável",    color: "text-blue-700",    bg: "bg-blue-100" },
  ambiguous:      { label: "Ambíguo",     color: "text-amber-700",   bg: "bg-amber-100" },
  unclassifiable: { label: "Não classif.",color: "text-red-700",     bg: "bg-red-100" },
};

const ENTITY_CONFIG: Record<EntityLayer, { label: string; color: string }> = {
  AWQ_Holding:  { label: "AWQ Holding",  color: "text-brand-700" },
  JACQES:       { label: "JACQES",       color: "text-purple-700" },
  Caza_Vision:  { label: "Caza Vision",  color: "text-emerald-700" },
  Intercompany: { label: "Intercompany", color: "text-cyan-700" },
  Socio_PF:     { label: "Sócio / PF",   color: "text-orange-700" },
  Unknown:      { label: "Desconhecido", color: "text-gray-500" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(1) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon size={10} className={status !== "done" && status !== "error" && status !== "received" ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" | null }) {
  if (!confidence) return null;
  const cfg = CONFIDENCE_CONFIG[confidence];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IngestPage() {
  const [documents, setDocuments]         = useState<FinancialDocument[]>([]);
  const [transactions, setTransactions]   = useState<BankTransaction[]>([]);
  const [selectedDoc, setSelectedDoc]     = useState<string | null>(null);
  const [showUpload, setShowUpload]       = useState(false);
  const [loading, setLoading]             = useState(true);
  const [txLoading, setTxLoading]         = useState(false);

  // Upload form
  const [file, setFile]                   = useState<File | null>(null);
  const [bank, setBank]                   = useState<BankName>("Cora");
  const [accountName, setAccountName]     = useState("");
  const [entity, setEntity]               = useState<EntityLayer>("Unknown");
  const [uploading, setUploading]         = useState(false);
  const [uploadError, setUploadError]     = useState<string | null>(null);

  // Pipeline
  const [processing, setProcessing]       = useState<string | null>(null);
  const [pipelineLog, setPipelineLog]     = useState<PipelineEvent[]>([]);

  // Filters
  const [filterEntity, setFilterEntity]   = useState<string>("all");
  const [showIntercompany, setShowIntercompany] = useState(false);
  const [showAmbiguous, setShowAmbiguous] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef    = useRef<HTMLDivElement>(null);

  // ── Load documents ──
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ingest/documents");
      if (res.ok) {
        const data = await res.json() as { documents: FinancialDocument[] };
        setDocuments(data.documents ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  // ── Load transactions for selected document ──
  const loadTransactions = useCallback(async (docId: string) => {
    setTxLoading(true);
    try {
      const res = await fetch(`/api/ingest/transactions?documentId=${docId}`);
      if (res.ok) {
        const data = await res.json() as { transactions: BankTransaction[] };
        setTransactions(data.transactions ?? []);
      }
    } catch { /* ignore */ }
    setTxLoading(false);
  }, []);

  useEffect(() => {
    if (selectedDoc) { void loadTransactions(selectedDoc); }
  }, [selectedDoc, loadTransactions]);

  // ── Scroll log to bottom ──
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pipelineLog]);

  // ── Upload ──
  async function handleUpload() {
    if (!file || !accountName.trim()) return;
    setUploading(true);
    setUploadError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("bank", bank);
    form.append("accountName", accountName.trim());
    if (entity !== "Unknown") form.append("entity", entity);

    try {
      const res = await fetch("/api/ingest/upload", { method: "POST", body: form });
      const data = await res.json() as { documentId?: string; error?: string; duplicate?: boolean; message?: string };

      if (!res.ok || data.error) {
        setUploadError(data.error ?? "Erro no upload.");
        return;
      }
      if (data.duplicate) {
        setUploadError(data.message ?? "Arquivo duplicado.");
        return;
      }

      // Upload successful — reset form and reload
      setFile(null);
      setAccountName("");
      setShowUpload(false);
      await loadDocuments();

      // Auto-start processing
      if (data.documentId) {
        void runPipeline(data.documentId);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro de rede.");
    } finally {
      setUploading(false);
    }
  }

  // ── Run pipeline ──
  async function runPipeline(docId: string) {
    setProcessing(docId);
    setPipelineLog([]);

    try {
      const res = await fetch("/api/ingest/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Sem stream de resposta.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const json = line.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const event = JSON.parse(json) as PipelineEvent;
              setPipelineLog((prev: PipelineEvent[]) => [...prev, event]);
              if (event.done) {
                await loadDocuments();
                if (event.success) void loadTransactions(docId);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (err) {
      setPipelineLog((prev: PipelineEvent[]) => [
        ...prev,
        { error: err instanceof Error ? err.message : "Erro na pipeline." },
      ]);
    } finally {
      setProcessing(null);
    }
  }

  // ── Derived data ──
  const selectedDocData = documents.find((d: FinancialDocument) => d.id === selectedDoc) ?? null;
  const filteredTxns = transactions.filter((t: BankTransaction) => {
    if (filterEntity !== "all" && t.entity !== filterEntity) return false;
    if (!showIntercompany && t.isIntercompany) return false;
    if (showAmbiguous && t.classificationConfidence !== "ambiguous") return false;
    return true;
  });

  const docCredits = transactions.filter((t: BankTransaction) => !t.excludedFromConsolidated && t.direction === "credit").reduce((s: number, t: BankTransaction) => s + Math.abs(t.amount), 0);
  const docDebits  = transactions.filter((t: BankTransaction) => !t.excludedFromConsolidated && t.direction === "debit").reduce((s: number, t: BankTransaction) => s + Math.abs(t.amount), 0);
  const intercompanyCount = transactions.filter((t: BankTransaction) => t.isIntercompany).length;
  const ambiguousCount    = transactions.filter((t: BankTransaction) => t.classificationConfidence === "ambiguous").length;

  // ── Static environment blocker ────────────────────────────────────────────
  // In GitHub Pages (NEXT_PUBLIC_STATIC_DATA=1) the API routes do not exist.
  // Rendering the upload form would silently fail — show an honest notice instead.
  if (IS_STATIC) {
    return (
      <>
        <Header
          title="Ingestão Financeira"
          subtitle="Upload de extratos PDF · Extração · Classificação · Reconciliação"
        />
        <div className="px-8 py-10 max-w-2xl">
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-amber-900">
                  Pipeline de ingestão não disponível neste ambiente
                </h2>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Este site está publicado como exportação estática (GitHub Pages).
                  Ambientes estáticos não suportam execução de servidor, gravação em
                  sistema de arquivos ou chamadas à API Claude — todas operações
                  obrigatórias para o pipeline de ingestão bancária.
                </p>
              </div>
            </div>

            <div className="border-t border-amber-200 pt-4 space-y-3">
              <p className="text-xs font-semibold text-amber-900">O que não está disponível aqui:</p>
              <ul className="text-xs text-amber-700 space-y-1 ml-3">
                <li>✗ Upload de PDF de extrato bancário</li>
                <li>✗ Extração de transações (Claude API — requer servidor)</li>
                <li>✗ Classificação e reconciliação (requer Node.js + fs)</li>
                <li>✗ Persistência de <code className="font-mono bg-amber-100 px-1 rounded">documents.json</code> / <code className="font-mono bg-amber-100 px-1 rounded">transactions.json</code></li>
                <li>✗ Streaming SSE do pipeline (<code className="font-mono bg-amber-100 px-1 rounded">/api/ingest/process</code>)</li>
              </ul>
            </div>

            <div className="border-t border-amber-200 pt-4 space-y-3">
              <p className="text-xs font-semibold text-amber-900">Para usar o pipeline real:</p>
              <div className="bg-gray-900 text-green-400 text-xs font-mono rounded-lg p-3 space-y-1">
                <div>git clone https://github.com/contato22/awq</div>
                <div>npm install</div>
                <div>npm run dev  <span className="text-gray-500"># ingestão disponível em localhost:3000</span></div>
              </div>
              <p className="text-[11px] text-amber-600">
                Para produção persistente: migre para Vercel + Vercel Blob (storage externo).
                O filesystem do GitHub Pages é somente leitura e sem execução server-side.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <a
              href="../management"
              className="text-xs px-4 py-2 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              → Ver Gestão da Base
            </a>
            <a
              href="../data"
              className="text-xs px-4 py-2 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              → Base de Dados
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Ingestão Financeira"
        subtitle="Upload de extratos PDF · Extração · Classificação · Reconciliação"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Top action bar ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowUpload((v: boolean) => !v); setUploadError(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Upload size={14} /> Enviar Extrato
            </button>
            <button
              onClick={loadDocuments}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={13} /> Atualizar
            </button>
          </div>
          <div className="text-sm text-gray-400">
            {documents.length} extrato{documents.length !== 1 ? "s" : ""} · {documents.filter((d: FinancialDocument) => d.status === "done").length} processados
          </div>
        </div>

        {/* ── Upload panel ──────────────────────────────────────────────────── */}
        {showUpload && (
          <div className="card p-5 border-brand-200 bg-brand-50/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900 text-sm">Enviar Extrato Bancário</div>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Drag/drop area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e: { preventDefault: () => void }) => e.preventDefault()}
              onDrop={(e: { preventDefault: () => void; dataTransfer: { files: FileList } }) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f?.type === "application/pdf" || f?.name.endsWith(".pdf")) setFile(f);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e: { target: { files: FileList | null } }) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText size={24} className="text-brand-600" />
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{file.name}</div>
                    <div className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <button
                    className="ml-2 text-gray-400 hover:text-red-500"
                    onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); setFile(null); }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={32} className="text-gray-300 mx-auto mb-2" />
                  <div className="text-sm text-gray-500">Arraste o PDF aqui ou clique para selecionar</div>
                  <div className="text-xs text-gray-400 mt-1">Apenas PDF · Máximo 20MB</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                <select
                  value={bank}
                  onChange={(e: { target: { value: string } }) => setBank(e.target.value as BankName)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                >
                  {BANK_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.banks.map((b) => <option key={b} value={b}>{b}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome da Conta</label>
                <input
                  type="text"
                  placeholder="ex: Conta PJ AWQ"
                  value={accountName}
                  onChange={(e: { target: { value: string } }) => setAccountName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Entidade</label>
                <select
                  value={entity}
                  onChange={(e: { target: { value: string } }) => setEntity(e.target.value as EntityLayer)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                >
                  {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {uploadError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {uploadError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={!file || !accountName.trim() || uploading}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? "Enviando..." : "Enviar e Processar"}
              </button>
              <button
                onClick={() => { setShowUpload(false); setFile(null); setUploadError(null); }}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Pipeline log (shown while processing) ────────────────────────── */}
        {pipelineLog.length > 0 && (
          <div className="card p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Pipeline Log</div>
            <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
              {pipelineLog.map((event: PipelineEvent, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 py-1 ${
                    event.error ? "text-red-600" :
                    event.done && event.success ? "text-emerald-700 font-semibold" :
                    "text-gray-600"
                  }`}
                >
                  <span className="text-gray-300 shrink-0">
                    {event.stage === "extracting" ? "📄" :
                     event.stage === "classifying" ? "🏷" :
                     event.stage === "reconciling" ? "🔁" :
                     event.stage === "done" ? "✅" :
                     event.error ? "❌" : "→"}
                  </span>
                  <span>{event.error ?? event.message ?? JSON.stringify(event)}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="flex gap-5">

          {/* ── Document list ────────────────────────────────────────────────── */}
          <div className="w-72 shrink-0 space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Extratos</div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                <Loader2 size={14} className="animate-spin" /> Carregando...
              </div>
            ) : documents.length === 0 ? (
              <div className="text-sm text-gray-400 py-8 text-center">
                <FileText size={32} className="mx-auto mb-2 text-gray-200" />
                Nenhum extrato enviado ainda.
              </div>
            ) : (
              documents.map((doc: FinancialDocument) => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDoc(doc.id); setPipelineLog([]); }}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedDoc === doc.id
                      ? "border-brand-300 bg-brand-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{doc.filename}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{doc.bank} · {doc.accountName}</div>
                      <div className="text-xs text-gray-400">
                        {fmtDate(doc.periodStart)} – {fmtDate(doc.periodEnd)}
                      </div>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      ENTITY_CONFIG[doc.entity]?.color ?? "text-gray-500"
                    } bg-gray-100`}>
                      {ENTITY_CONFIG[doc.entity]?.label ?? doc.entity}
                    </span>
                    {doc.transactionCount > 0 && (
                      <span className="text-[10px] text-gray-400">{doc.transactionCount} lançamentos</span>
                    )}
                  </div>
                  {doc.status !== "done" && doc.status !== "error" && doc.status !== "received" && (
                    <div className="mt-2">
                      <button
                        disabled={processing === doc.id}
                        onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); void runPipeline(doc.id); }}
                        className="text-[10px] text-brand-600 hover:text-brand-800 disabled:opacity-40"
                      >
                        Reprocessar
                      </button>
                    </div>
                  )}
                  {doc.status === "received" && (
                    <div className="mt-2">
                      <button
                        disabled={processing === doc.id}
                        onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); void runPipeline(doc.id); setSelectedDoc(doc.id); }}
                        className="text-[10px] font-semibold text-brand-600 hover:text-brand-800 disabled:opacity-40"
                      >
                        {processing === doc.id ? "Processando..." : "▶ Iniciar pipeline"}
                      </button>
                    </div>
                  )}
                  {doc.status === "error" && doc.errorMessage && (
                    <div className="mt-1 text-[10px] text-red-600 truncate" title={doc.errorMessage}>
                      {doc.errorMessage.slice(0, 60)}…
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* ── Transaction detail panel ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {!selectedDoc ? (
              <div className="card p-12 flex flex-col items-center justify-center text-center text-gray-400">
                <Building2 size={40} className="mb-3 text-gray-200" />
                <div className="text-sm font-medium">Selecione um extrato</div>
                <div className="text-xs mt-1">para ver os lançamentos extraídos e classificados</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Document summary */}
                {selectedDocData && (
                  <div className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{selectedDocData.filename}</div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {selectedDocData.bank} · {selectedDocData.accountName}
                          {selectedDocData.periodStart && (
                            <> · {fmtDate(selectedDocData.periodStart)} – {fmtDate(selectedDocData.periodEnd)}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={selectedDocData.status} />
                        {selectedDocData.parserConfidence && (
                          <ConfidenceBadge confidence={selectedDocData.parserConfidence} />
                        )}
                        <button
                          onClick={() => void runPipeline(selectedDocData.id)}
                          disabled={processing === selectedDocData.id}
                          className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        >
                          <RefreshCw size={11} /> Reprocessar
                        </button>
                      </div>
                    </div>

                    {/* KPI bar */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Entradas (op.)",   value: fmtR(docCredits), icon: TrendingUp,   color: "text-emerald-600" },
                        { label: "Saídas (op.)",     value: fmtR(docDebits),  icon: TrendingDown, color: "text-red-600" },
                        { label: "Intercompany",     value: String(intercompanyCount), icon: GitMerge, color: "text-cyan-600" },
                        { label: "Ambíguos",         value: String(ambiguousCount),    icon: AlertTriangle, color: "text-amber-600" },
                      ].map((k) => {
                        const Icon = k.icon;
                        return (
                          <div key={k.label} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon size={12} className={k.color} />
                              <span className="text-[10px] text-gray-500">{k.label}</span>
                            </div>
                            <div className={`text-base font-bold ${k.color}`}>{k.value}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Extraction notes (only if not high confidence) */}
                    {selectedDocData.extractionNotes && selectedDocData.parserConfidence !== "high" && (
                      <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                        <Info size={13} className="mt-0.5 shrink-0" />
                        <span>{selectedDocData.extractionNotes}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Filters */}
                <div className="flex items-center gap-3">
                  <Filter size={13} className="text-gray-400" />
                  <select
                    value={filterEntity}
                    onChange={(e: { target: { value: string } }) => setFilterEntity(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-brand-400"
                  >
                    <option value="all">Todas as entidades</option>
                    {Object.entries(ENTITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showIntercompany}
                      onChange={(e: { target: { checked: boolean } }) => setShowIntercompany(e.target.checked)}
                      className="rounded"
                    />
                    Intercompany
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAmbiguous}
                      onChange={(e: { target: { checked: boolean } }) => setShowAmbiguous(e.target.checked)}
                      className="rounded"
                    />
                    Só ambíguos
                  </label>
                  <span className="text-xs text-gray-400 ml-auto">
                    {filteredTxns.length} de {transactions.length} lançamentos
                  </span>
                </div>

                {/* Transaction table */}
                <div className="card overflow-hidden">
                  {txLoading ? (
                    <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400">
                      <Loader2 size={16} className="animate-spin" /> Carregando lançamentos...
                    </div>
                  ) : filteredTxns.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                      {transactions.length === 0
                        ? "Nenhum lançamento extraído ainda. Execute o pipeline para processar este extrato."
                        : "Nenhum lançamento com os filtros aplicados."}
                    </div>
                  ) : (
                    <div className="table-scroll">
                      <table className="w-full text-sm min-w-[800px]">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="table-header w-24">Data</th>
                            <th className="table-header">Descrição</th>
                            <th className="table-header">Categoria</th>
                            <th className="table-header">Entidade</th>
                            <th className="table-header-right">Valor</th>
                            <th className="table-header">Confiança</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTxns.map((txn: BankTransaction) => {
                            const txConf = CONFIDENCE_TX_CONFIG[txn.classificationConfidence];
                            const entityCfg = ENTITY_CONFIG[txn.entity];
                            return (
                              <tr
                                key={txn.id}
                                className={`table-row ${
                                  txn.isIntercompany ? "bg-cyan-50/40" :
                                  txn.classificationConfidence === "ambiguous" ? "bg-amber-50/40" :
                                  txn.excludedFromConsolidated ? "bg-gray-50/60 opacity-70" :
                                  ""
                                }`}
                                title={txn.classificationNote ?? undefined}
                              >
                                <td className="py-2.5 px-3 text-gray-500 text-xs tabular-nums whitespace-nowrap">
                                  {fmtDate(txn.transactionDate)}
                                </td>
                                <td className="py-2.5 px-3 max-w-xs">
                                  <div className="text-xs text-gray-800 truncate" title={txn.descriptionOriginal}>
                                    {txn.descriptionOriginal}
                                  </div>
                                  {txn.counterpartyName && (
                                    <div className="text-[10px] text-gray-400 mt-0.5">{txn.counterpartyName}</div>
                                  )}
                                  {txn.isIntercompany && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <GitMerge size={9} className="text-cyan-500" />
                                      <span className="text-[10px] text-cyan-600">Intercompany eliminado</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {txn.managerialCategory.replace(/_/g, " ")}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`text-[10px] font-medium ${entityCfg?.color ?? "text-gray-500"}`}>
                                    {entityCfg?.label ?? txn.entity}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                                  <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${
                                    txn.direction === "credit" ? "text-emerald-700" : "text-red-600"
                                  }`}>
                                    {txn.direction === "credit"
                                      ? <ArrowUpRight size={12} />
                                      : <ArrowDownRight size={12} />}
                                    {fmtR(Math.abs(txn.amount))}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${txConf.color} ${txConf.bg}`}>
                                    {txConf.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Governance notice */}
                {ambiguousCount > 0 && (
                  <div className="flex items-start gap-2 p-3 border border-amber-200 bg-amber-50 rounded-xl text-xs text-amber-700">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold">{ambiguousCount} lançamentos ambíguos</span> precisam de revisão manual
                      antes de serem incluídos em relatórios financeiros consolidados.
                      Lançamentos ambíguos estão excluídos do caixa consolidado automaticamente.
                    </div>
                  </div>
                )}

                {intercompanyCount > 0 && (
                  <div className="flex items-start gap-2 p-3 border border-cyan-200 bg-cyan-50 rounded-xl text-xs text-cyan-700">
                    <GitMerge size={13} className="mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold">{intercompanyCount} transferências intercompany</span> identificadas
                      e eliminadas do consolidado. Nenhuma inflação de receita ou despesa.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Governance footer ──────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-6 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><CheckCircle2 size={9} className="text-emerald-500" /> Todo lançamento rastreado a documento PDF</span>
            <span className="flex items-center gap-1"><GitMerge size={9} className="text-cyan-500" /> Transferências internas eliminadas do consolidado</span>
            <span className="flex items-center gap-1"><AlertTriangle size={9} className="text-amber-500" /> Ambiguidades explícitas — nunca mascaradas</span>
            <span className="flex items-center gap-1"><Eye size={9} className="text-brand-500" /> Classificação auditável por regras documentadas</span>
          </div>
        </div>

      </div>
    </>
  );
}
