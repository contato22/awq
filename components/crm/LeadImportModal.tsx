"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  AlertCircle, CheckCircle2, Download, Upload, X,
} from "lucide-react";
import {
  LEAD_CSV_MAX_CHARS,
  LEAD_CSV_TEMPLATE,
  LEAD_IMPORT_BUS,
  isLeadImportBu,
  parseLeadCsv,
} from "@/lib/lead-csv";
import type { LeadImportReport } from "@/lib/lead-import-run";
import { OWNER_OPTIONS } from "@/lib/crm-types";

type Props = {
  onClose: () => void;
  onPersisted: () => void;
};

// Same BU lock as requireSession. ENRD is not a crm_leads value.
const ROLE_BU_LOCK: Record<string, string> = {
  enrd: "ENRD",
  caza: "CAZA",
  jacqes: "JACQES",
};

const selectCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

export default function LeadImportModal({ onClose, onPersisted }: Props) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const lockedBu = ROLE_BU_LOCK[role] ?? null;
  const lockedImportBu = lockedBu && isLeadImportBu(lockedBu) ? lockedBu : null;
  const blockedBu = lockedBu && !lockedImportBu ? lockedBu : null;
  const [csv, setCsv] = useState("");
  const [defaultBu, setDefaultBu] = useState<string>(lockedImportBu ?? "JACQES");
  const [defaultAssigned, setDefaultAssigned] = useState<string>(OWNER_OPTIONS[0]);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [report, setReport] = useState<LeadImportReport | null>(null);

  useEffect(() => {
    if (lockedImportBu) setDefaultBu(lockedImportBu);
  }, [lockedImportBu]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview = useMemo(
    () => parseLeadCsv(csv, {
      defaultBu,
      defaultAssignedTo: defaultAssigned,
      forcedBu: lockedImportBu,
    }),
    [csv, defaultBu, defaultAssigned, lockedImportBu],
  );

  const lineCount = csv.trim() ? preview.rows.length : 0;

  function updateCsv(value: string) {
    setCsv(value);
    setReport(null);
    setServerError("");
    setFileError("");
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > LEAD_CSV_MAX_CHARS) {
      setFileError("Arquivo maior que 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateCsv(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsText(file, "utf-8");
  }

  function downloadTemplate() {
    const blob = new Blob([LEAD_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leads_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!csv.trim() || blockedBu) return;
    setLoading(true);
    setServerError("");
    setReport(null);
    try {
      const res = await fetch("/api/crm/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv,
          default_bu: lockedImportBu ?? defaultBu,
          default_assigned_to: defaultAssigned,
        }),
      });
      const json = await res.json() as { success?: boolean; error?: string; data?: LeadImportReport };
      if (!res.ok || !json.success || !json.data) {
        setServerError(json.error ?? "Não foi possível validar o CSV.");
        return;
      }
      setReport(json.data);
    } catch {
      setServerError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  const saved = report?.persistence === "on" && (report.saved ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-import-title"
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Upload size={15} className="text-blue-600" aria-hidden="true" />
            <h2 id="lead-import-title" className="text-sm font-bold text-gray-900">Importar leads via CSV</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar janela" className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {blockedBu && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              A BU {blockedBu} não entra no cadastro de leads.
            </p>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
            <div>
              <p className="text-xs font-semibold text-blue-800">Precisa do modelo?</p>
              <p className="text-[11px] text-blue-600">Baixe o CSV com as colunas reconhecidas</p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Download size={12} aria-hidden="true" />
              Template
            </button>
          </div>

          <div>
            <label htmlFor="lead-csv-file" className="block text-xs font-semibold text-gray-700 mb-2">Arquivo CSV</label>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              <Upload size={18} className="text-gray-400 mb-1" aria-hidden="true" />
              <span className="text-xs text-gray-500">Clique para selecionar o arquivo</span>
              <span className="text-[10px] text-gray-400">.csv, UTF-8, até 500 KB</span>
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
                <span className="ml-2 text-[10px] font-normal text-gray-500">
                  {lineCount} {lineCount === 1 ? "linha" : "linhas"}
                </span>
              )}
            </label>
            <textarea
              id="lead-csv-paste"
              rows={5}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              placeholder="nome,empresa,email,telefone,cargo,bu,fonte,budget,necessidade..."
              value={csv}
              onChange={(event) => updateCsv(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lead-csv-bu" className="block text-xs font-semibold text-gray-700 mb-1.5">BU padrão</label>
              {lockedImportBu ? (
                <p id="lead-csv-bu" className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-semibold text-orange-700">{lockedImportBu}</p>
              ) : (
                <select
                  id="lead-csv-bu"
                  className={selectCls}
                  value={defaultBu}
                  onChange={(event) => { setDefaultBu(event.target.value); setReport(null); }}
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
                onChange={(event) => { setDefaultAssigned(event.target.value); setReport(null); }}
              >
                {OWNER_OPTIONS.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
              </select>
            </div>
          </div>

          {fileError && <Notice tone="error">{fileError}</Notice>}
          {csv.trim() && !report && (
            <ValidationPreview fileErrors={preview.fileErrors} rows={preview.rows} />
          )}
          {serverError && <Notice tone="error">{serverError}</Notice>}
          {report && <ServerReport report={report} />}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          {saved ? (
            <button type="button" onClick={onPersisted} className="btn-primary flex items-center gap-2 text-sm">
              <CheckCircle2 size={14} aria-hidden="true" />
              Ver leads gravados
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                Fechar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!csv.trim() || loading || !!blockedBu}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Validando…
                  </>
                ) : (
                  <>
                    <Upload size={14} aria-hidden="true" />
                    Validar importação
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

function ValidationPreview({
  fileErrors,
  rows,
}: {
  fileErrors: string[];
  rows: { row: number; ok: boolean; errors: string[]; name?: string; lead?: { lead_score: number; company_name: string } }[];
}) {
  const valid = rows.filter((row) => row.ok);
  const invalid = rows.filter((row) => !row.ok);
  const tone = fileErrors.length || invalid.length ? "warn" : "ok";
  return (
    <div className={`p-3 rounded-xl border text-sm ${tone === "ok" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <p className="text-xs font-semibold text-gray-800 mb-2">
        {fileErrors.length
          ? "O arquivo não pôde ser lido"
          : `${valid.length} válido${valid.length === 1 ? "" : "s"} · ${invalid.length} com erro`}
      </p>
      <ul className="space-y-1 max-h-36 overflow-y-auto">
        {fileErrors.map((message) => (
          <li key={message} className="text-[11px] text-amber-800">{message}</li>
        ))}
        {valid.slice(0, 8).map((row) => (
          <li key={`ok-${row.row}`} className="text-[11px] text-emerald-800">
            Linha {row.row}: {row.lead?.company_name} — score {row.lead?.lead_score}
          </li>
        ))}
        {invalid.slice(0, 8).map((row) => (
          <li key={`bad-${row.row}`} className="text-[11px] text-amber-800">
            Linha {row.row}{row.name ? ` (${row.name})` : ""}: {row.errors.join("; ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServerReport({ report }: { report: LeadImportReport }) {
  const tone = report.fileErrors.length || report.errors > 0 ? "warn" : "ok";
  const headline = report.fileErrors.length
    ? "A validação do servidor recusou o arquivo"
    : report.persistence === "off"
      ? `${report.valid} válido${report.valid === 1 ? "" : "s"} · ${report.errors} com erro. Nada foi gravado.`
      : `${report.saved} gravado${report.saved === 1 ? "" : "s"} · ${report.errors} com erro.`;
  return (
    <div className={`p-3 rounded-xl border text-sm ${tone === "ok" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center gap-2 mb-2">
        {tone === "ok"
          ? <CheckCircle2 size={14} className="text-emerald-600" aria-hidden="true" />
          : <AlertCircle size={14} className="text-amber-600" aria-hidden="true" />}
        <span className="text-xs font-semibold text-gray-800">{headline}</span>
      </div>
      <ul className="space-y-1 max-h-36 overflow-y-auto">
        {report.fileErrors.map((message) => (
          <li key={message} className="text-[11px] text-amber-800">{message}</li>
        ))}
        {report.results.filter((row) => row.success).slice(0, 8).map((row) => (
          <li key={`s-${row.row}`} className="text-[11px] text-emerald-800">
            Linha {row.row}: {row.name} — score {row.score}
            {row.persisted ? "" : " (não gravado)"}
          </li>
        ))}
        {report.results.filter((row) => !row.success).slice(0, 8).map((row) => (
          <li key={`e-${row.row}`} className="text-[11px] text-amber-800">
            Linha {row.row}{row.name ? ` (${row.name})` : ""}: {row.error}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "warn" | "ok"; children: ReactNode }) {
  const cls = tone === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : "bg-emerald-50 border-emerald-200 text-emerald-800";
  return <p className={`text-xs border rounded-xl px-3 py-2 ${cls}`}>{children}</p>;
}
