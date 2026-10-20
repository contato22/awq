"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode, RefObject } from "react";
import { useSession } from "next-auth/react";
import {
  AlertCircle, CheckCircle2, Download, Upload, X,
} from "lucide-react";
import {
  LEAD_CSV_MAX_CHARS,
  decodeCsvBytes,
  isLeadImportBu,
  leadCsvTemplateFile,
  leadErrorCsv,
  LEAD_IMPORT_BUS,
  parseLeadCsv,
  previewWindow,
  type LeadCsvColumn,
  type LeadErrorCsvRow,
} from "@/lib/lead-csv";
import type { LeadImportReport } from "@/lib/lead-import-run";
import { OWNER_OPTIONS } from "@/lib/crm-types";

type Props = {
  existingEmails: readonly string[];
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onPersisted: () => void;
};

const ROLE_BU_LOCK: Record<string, string> = {
  enrd: "ENRD",
  caza: "CAZA",
  jacqes: "JACQES",
};

const selectCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export default function LeadImportModal({ existingEmails, returnFocusRef, onClose, onPersisted }: Props) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const lockedBu = ROLE_BU_LOCK[role] ?? null;
  const lockedImportBu = lockedBu && isLeadImportBu(lockedBu) ? lockedBu : null;
  const blockedBu = lockedBu && !lockedImportBu ? lockedBu : null;
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [defaultBu, setDefaultBu] = useState<string>(lockedImportBu ?? "JACQES");
  const [defaultAssigned, setDefaultAssigned] = useState<string>(OWNER_OPTIONS[0]);
  const [fileError, setFileError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [serverError, setServerError] = useState("");
  const [report, setReport] = useState<LeadImportReport | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  loadingRef.current = loading;

  useEffect(() => {
    if (lockedImportBu) setDefaultBu(lockedImportBu);
  }, [lockedImportBu]);

  useEffect(() => {
    const node = dialogRef.current;
    const returnFocus = returnFocusRef.current;
    node?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (loadingRef.current) {
          abortRef.current?.abort();
          return;
        }
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute("disabled"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === node || !node.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !node.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnFocus?.focus();
    };
  }, [onClose, returnFocusRef]);

  const preview = useMemo(
    () => parseLeadCsv(csv, {
      defaultBu,
      defaultAssignedTo: defaultAssigned,
      forcedBu: lockedImportBu,
      existingEmails,
    }),
    [csv, defaultBu, defaultAssigned, lockedImportBu, existingEmails],
  );

  const validCount = preview.rows.filter((row) => row.ok).length;
  const canImport = reviewed && !loading && !blockedBu && preview.fileErrors.length === 0 && validCount > 0;

  function invalidate() {
    setReviewed(false);
    setReport(null);
    setServerError("");
    setFileError("");
  }

  function updateCsv(value: string, nextFileName = "") {
    setCsv(value);
    setFileName(nextFileName);
    invalidate();
  }

  async function acceptFile(file: File) {
    if (file.size > LEAD_CSV_MAX_CHARS) {
      setFileError("Arquivo maior que 500 KB.");
      setReviewed(false);
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    updateCsv(decodeCsvBytes(bytes), file.name);
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void acceptFile(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void acceptFile(file);
  }

  function downloadTemplate() {
    downloadText("leads_template.csv", leadCsvTemplateFile());
  }

  function handleValidate() {
    setReport(null);
    setServerError("");
    setReviewed(true);
  }

  async function handleImport() {
    if (!canImport) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setServerError("");
    setReport(null);
    try {
      const res = await fetch("/api/crm/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          csv,
          default_bu: lockedImportBu ?? defaultBu,
          default_assigned_to: defaultAssigned,
          existing_emails: existingEmails,
        }),
      });
      const json = await res.json() as { success?: boolean; error?: string; data?: LeadImportReport };
      if (!res.ok || !json.success || !json.data) {
        setServerError(json.error ?? "Não foi possível importar o CSV.");
        return;
      }
      setReport(json.data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setServerError("Importação cancelada.");
        return;
      }
      setServerError("Erro de conexão.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }

  function requestClose() {
    if (loadingRef.current) {
      abortRef.current?.abort();
      return;
    }
    onClose();
  }

  const saved = report?.persistence === "on" && (report.saved ?? 0) > 0;
  const lineCount = csv.trim() ? preview.rows.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-import-title"
        aria-busy={loading}
        tabIndex={-1}
        className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden outline-none"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <Upload size={15} className="text-blue-600 shrink-0" aria-hidden="true" />
            <h2 id="lead-import-title" className="text-sm font-bold text-gray-900">Importar leads via CSV</h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fechar janela"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {blockedBu && (
            <p role="alert" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              A BU {blockedBu} não entra no cadastro de leads.
            </p>
          )}

          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <div>
              <p className="text-xs font-semibold text-gray-900">Precisa do modelo?</p>
              <p className="text-xs text-gray-600">UTF-8 com separador ponto e vírgula (;)</p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
            >
              <Download size={14} aria-hidden="true" />
              Template
            </button>
          </div>

          <div>
            <label htmlFor="lead-csv-file" className="block text-xs font-semibold text-gray-700 mb-1.5">Arquivo CSV</label>
            <label
              onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={(event) => { event.preventDefault(); setDragOver(false); }}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full min-h-24 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 ${
                dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
              }`}
            >
              <Upload size={18} className="text-gray-600 mb-1" aria-hidden="true" />
              <span className="text-xs text-gray-600 text-center">Arraste o arquivo aqui ou clique para selecionar</span>
              <span className="text-xs text-gray-600 text-center">Vírgula ou ponto e vírgula (;). Até 500 KB.</span>
              {fileName && <span className="text-xs font-medium text-gray-900 mt-1">Arquivo: {fileName}</span>}
              <input
                id="lead-csv-file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={handleFile}
              />
            </label>
          </div>

          <div>
            <label htmlFor="lead-csv-paste" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Ou cole o conteúdo CSV
              {lineCount > 0 && (
                <span className="ml-2 font-normal text-gray-600">
                  {lineCount} {lineCount === 1 ? "linha" : "linhas"}
                </span>
              )}
            </label>
            <textarea
              id="lead-csv-paste"
              rows={5}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              placeholder={"nome;empresa;email\nAna;Acme;ana@acme.com"}
              value={csv}
              onChange={(event) => updateCsv(event.target.value)}
            />
          </div>

          {preview.columns.length > 0 && <ColumnMap columns={preview.columns} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="lead-csv-bu" className="block text-xs font-semibold text-gray-700 mb-1.5">BU padrão</label>
              {lockedImportBu ? (
                <input
                  id="lead-csv-bu"
                  readOnly
                  aria-readonly="true"
                  value={lockedImportBu}
                  className="w-full px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-semibold text-orange-700"
                />
              ) : (
                <select
                  id="lead-csv-bu"
                  className={selectCls}
                  value={defaultBu}
                  onChange={(event) => { setDefaultBu(event.target.value); invalidate(); }}
                  disabled={!!blockedBu}
                >
                  {LEAD_IMPORT_BUS.map((bu) => <option key={bu} value={bu}>{bu}</option>)}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="lead-csv-owner" className="block text-xs font-semibold text-gray-700 mb-1.5">Responsável padrão</label>
              <select
                id="lead-csv-owner"
                className={selectCls}
                value={defaultAssigned}
                onChange={(event) => { setDefaultAssigned(event.target.value); invalidate(); }}
              >
                {OWNER_OPTIONS.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
              </select>
            </div>
          </div>

          <div aria-live="polite" aria-relevant="additions text" className="space-y-3">
            {fileError && <Notice tone="error">{fileError}</Notice>}
            {csv.trim() && !report && (
              <ValidationPreview
                reviewed={reviewed}
                fileErrors={preview.fileErrors}
                rows={preview.rows}
              />
            )}
            {serverError && <Notice tone="error">{serverError}</Notice>}
            {report && <ServerReport report={report} />}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          {saved ? (
            <button type="button" onClick={onPersisted} className="btn-primary flex items-center gap-2 text-sm">
              <CheckCircle2 size={14} aria-hidden="true" />
              Ver leads gravados
            </button>
          ) : (
            <>
              <button type="button" onClick={requestClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                Fechar
              </button>
              <button
                type="button"
                onClick={handleValidate}
                disabled={!csv.trim() || loading || !!blockedBu}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Validar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Importando…
                  </>
                ) : (
                  <>
                    <Upload size={14} aria-hidden="true" />
                    Importar {validCount}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnMap({ columns }: { columns: LeadCsvColumn[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-700 mb-1.5">Mapeamento de colunas</h3>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th scope="col" className="font-semibold px-3 py-2">Coluna no arquivo</th>
              <th scope="col" className="font-semibold px-3 py-2">Campo</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column, index) => (
              <tr key={`${column.header}-${index}`} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-900">{column.header}</td>
                <td className="px-3 py-2 text-gray-600">{column.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ValidationPreview({
  reviewed,
  fileErrors,
  rows,
}: {
  reviewed: boolean;
  fileErrors: string[];
  rows: { row: number; ok: boolean; errors: string[]; name?: string; lead?: { lead_score: number; company_name: string } }[];
}) {
  const valid = rows.filter((row) => row.ok);
  const invalid = rows.filter((row) => !row.ok);
  const errors: LeadErrorCsvRow[] = [
    ...fileErrors.map((error) => ({ row: 0, error })),
    ...invalid.map((row) => ({ row: row.row, name: row.name, error: row.errors.join("; ") })),
  ];
  const lines = [
    ...invalid.map((row) => ({
      key: `bad-${row.row}`,
      text: `Linha ${row.row}${row.name ? ` (${row.name})` : ""}: ${row.errors.join("; ")}`,
      error: true,
    })),
    ...valid.map((row) => ({
      key: `ok-${row.row}`,
      text: `Linha ${row.row}: ${row.lead?.company_name} — score ${row.lead?.lead_score}`,
      error: false,
    })),
  ];
  const tone = fileErrors.length || invalid.length ? "warn" : "ok";
  return (
    <div className={`p-3 rounded-xl border text-sm ${tone === "ok" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-800">
          {reviewed ? "Validação" : "Prévia"}
          {fileErrors.length
            ? " — o arquivo não pôde ser lido"
            : ` — ${valid.length} válido${valid.length === 1 ? "" : "s"} · ${invalid.length} com erro`}
        </p>
        {errors.length > 0 && (
          <button type="button" onClick={() => downloadText("erros-leads.csv", leadErrorCsv(errors))} className="text-xs font-semibold text-gray-700 underline">
            Baixar erros
          </button>
        )}
      </div>
      {fileErrors.length > 0 && (
        <div role="alert" className="space-y-1 mb-2">
          {fileErrors.map((message) => <p key={message} className="text-xs text-amber-800">{message}</p>)}
        </div>
      )}
      <LineList lines={lines} />
    </div>
  );
}

function ServerReport({ report }: { report: LeadImportReport }) {
  const tone = report.fileErrors.length || report.errors > 0 ? "warn" : "ok";
  const headline = report.fileErrors.length
    ? "A importação recusou o arquivo"
    : report.persistence === "off"
      ? `${report.valid} válido${report.valid === 1 ? "" : "s"} · ${report.errors} com erro. Nada foi gravado.`
      : `${report.saved} gravado${report.saved === 1 ? "" : "s"} · ${report.errors} com erro.`;
  const failures = report.results.filter((row) => !row.success);
  const successes = report.results.filter((row) => row.success);
  const errors: LeadErrorCsvRow[] = [
    ...report.fileErrors.map((error) => ({ row: 0, error })),
    ...failures.map((row) => ({ row: row.row, name: row.name, error: row.error ?? "erro" })),
  ];
  const lines = [
    ...failures.map((row) => ({
      key: `e-${row.row}`,
      text: `Linha ${row.row}${row.name ? ` (${row.name})` : ""}: ${row.error}`,
      error: true,
    })),
    ...successes.map((row) => ({
      key: `s-${row.row}`,
      text: `Linha ${row.row}: ${row.name} — score ${row.score}${row.persisted ? "" : " (não gravado)"}`,
      error: false,
    })),
  ];
  return (
    <div className={`p-3 rounded-xl border text-sm ${tone === "ok" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {tone === "ok"
            ? <CheckCircle2 size={14} className="text-emerald-600" aria-hidden="true" />
            : <AlertCircle size={14} className="text-amber-600" aria-hidden="true" />}
          <span className="text-xs font-semibold text-gray-800">{headline}</span>
        </div>
        {errors.length > 0 && (
          <button type="button" onClick={() => downloadText("erros-leads.csv", leadErrorCsv(errors))} className="text-xs font-semibold text-gray-700 underline shrink-0">
            Baixar erros
          </button>
        )}
      </div>
      {report.fileErrors.length > 0 && (
        <div role="alert" className="space-y-1 mb-2">
          {report.fileErrors.map((message) => <p key={message} className="text-xs text-amber-800">{message}</p>)}
        </div>
      )}
      <LineList lines={lines} />
    </div>
  );
}

function LineList({ lines }: { lines: { key: string; text: string; error: boolean }[] }) {
  const ordered = [...lines.filter((line) => line.error), ...lines.filter((line) => !line.error)];
  const { visible, hidden } = previewWindow(ordered);
  const errors = visible.filter((line) => line.error);
  const ok = visible.filter((line) => !line.error);
  return (
    <>
      {errors.length > 0 && (
        <ul role="alert" className="space-y-1">
          {errors.map((line) => <li key={line.key} className="text-xs text-amber-800">{line.text}</li>)}
        </ul>
      )}
      {ok.length > 0 && (
        <ul className="space-y-1 mt-1">
          {ok.map((line) => <li key={line.key} className="text-xs text-emerald-800">{line.text}</li>)}
        </ul>
      )}
      {hidden > 0 && (
        <p className="text-xs text-gray-600 mt-2">+{hidden} {hidden === 1 ? "outra" : "outras"}</p>
      )}
    </>
  );
}

function Notice({ tone, children }: { tone: "error" | "warn" | "ok"; children: ReactNode }) {
  const cls = tone === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : "bg-emerald-50 border-emerald-200 text-emerald-800";
  return (
    <p role={tone === "error" ? "alert" : undefined} className={`text-xs border rounded-xl px-3 py-2 ${cls}`}>
      {children}
    </p>
  );
}

function downloadText(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
