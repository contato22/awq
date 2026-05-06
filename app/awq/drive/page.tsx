"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HardDrive,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  FolderOpen,
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarRange,
  Archive,
  Play,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriveFile {
  name: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

interface RecentFolder {
  folder: string;
  files: DriveFile[];
}

interface DriveStatus {
  configured: boolean;
  connected?: boolean;
  rootFolderId?: string;
  recentFiles?: RecentFolder[];
  checkedAt?: string;
  error?: string;
  message?: string;
}

interface SyncResult {
  period: string;
  folder: string;
  files: { name: string; ok: boolean }[];
  durationMs: number;
  error?: string;
}

type Period = "daily" | "weekly" | "monthly" | "annual" | "all";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes?: string) {
  if (!bytes) return "";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PERIOD_META: Record<Period, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
  daily: {
    label: "Diário",
    desc: "Transações, documentos e posição de caixa do dia",
    icon: <Calendar className="w-5 h-5" />,
    color: "text-blue-400",
  },
  weekly: {
    label: "Semanal",
    desc: "CRM pipeline, BPM tasks e resumo financeiro da semana",
    icon: <CalendarDays className="w-5 h-5" />,
    color: "text-purple-400",
  },
  monthly: {
    label: "Mensal",
    desc: "DRE gerencial, analytics CRM, projetos e backup mensal",
    icon: <CalendarRange className="w-5 h-5" />,
    color: "text-emerald-400",
  },
  annual: {
    label: "Anual",
    desc: "Balanço consolidado e backup full de todos os módulos",
    icon: <Archive className="w-5 h-5" />,
    color: "text-orange-400",
  },
  all: {
    label: "Sync Completo",
    desc: "Executa todos os períodos de uma só vez",
    icon: <RefreshCw className="w-5 h-5" />,
    color: "text-cyan-400",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DrivePage() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState<Period | null>(null);
  const [results, setResults] = useState<SyncResult[]>([]);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/drive/status");
      setStatus(await res.json());
    } catch {
      setStatus({ configured: false, error: "Erro ao verificar status" });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const runSync = async (period: Period) => {
    setSyncing(period);
    try {
      const res = await fetch("/api/drive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data = await res.json();
      const newResults: SyncResult[] = Array.isArray(data.result)
        ? data.result
        : [data.result];
      setResults((prev) => [...newResults, ...prev].slice(0, 20));
      await fetchStatus();
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Google Drive Sync</h1>
            <p className="text-sm text-gray-400">
              Exportações periódicas automáticas para o Google Drive
            </p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loadingStatus}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingStatus ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Connection Status */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Status da Conexão
        </h2>

        {loadingStatus ? (
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Verificando...
          </div>
        ) : !status?.configured ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-950/40 border border-yellow-800/40">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-yellow-300">Drive não configurado</p>
              <p className="text-sm text-yellow-400/80 mt-1">
                Configure as variáveis de ambiente para ativar a integração:
              </p>
              <ul className="mt-2 space-y-1 text-xs font-mono text-yellow-300/70">
                <li>GOOGLE_SERVICE_ACCOUNT_KEY=&lt;base64 do JSON da Service Account&gt;</li>
                <li>GOOGLE_DRIVE_FOLDER_ID=&lt;ID da pasta raiz no Drive&gt;</li>
              </ul>
            </div>
          </div>
        ) : !status.connected ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-950/40 border border-red-800/40">
            <XCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="font-medium text-red-300">Falha na conexão</p>
              <p className="text-sm text-red-400/80">{status.error}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-medium text-emerald-300">Conectado ao Google Drive</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span>
                Pasta raiz:{" "}
                <a
                  href={`https://drive.google.com/drive/folders/${status.rootFolderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  {status.rootFolderId?.slice(0, 20)}…
                  <ExternalLink className="w-3 h-3" />
                </a>
              </span>
              {status.checkedAt && (
                <span>
                  Verificado: {formatDate(status.checkedAt)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual Sync Buttons */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Exportação Manual
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(Object.entries(PERIOD_META) as [Period, typeof PERIOD_META[Period]][]).map(
            ([period, meta]) => (
              <button
                key={period}
                onClick={() => runSync(period)}
                disabled={!!syncing || !status?.connected}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border border-gray-700 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
              >
                <span className={meta.color}>{meta.icon}</span>
                <span className="font-semibold text-sm">{meta.label}</span>
                <span className="text-xs text-gray-400 leading-snug">{meta.desc}</span>
                {syncing === period && (
                  <span className="flex items-center gap-1 text-xs text-cyan-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Exportando…
                  </span>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Cron Schedule */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Agendamento Automático (Vercel Cron)
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { period: "Diário", cron: "0 2 * * *", desc: "Todo dia às 23:00 BRT (02:00 UTC)" },
            { period: "Semanal", cron: "0 6 * * 1", desc: "Toda segunda-feira às 06:00 UTC" },
            { period: "Mensal", cron: "0 5 1 * *", desc: "Dia 1 de cada mês às 05:00 UTC" },
            { period: "Anual", cron: "0 4 1 1 *", desc: "1 de janeiro às 04:00 UTC" },
          ].map((row) => (
            <div
              key={row.period}
              className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50"
            >
              <Play className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="w-20 font-medium text-gray-200">{row.period}</span>
              <code className="text-xs font-mono text-purple-300 bg-purple-950/30 px-2 py-0.5 rounded">
                {row.cron}
              </code>
              <span className="text-gray-400">{row.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Exports from Drive */}
      {status?.recentFiles && status.recentFiles.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Últimas Exportações no Drive
          </h2>
          <div className="space-y-4">
            {status.recentFiles.map((folder) => (
              <div key={folder.folder}>
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-200">{folder.folder}</span>
                </div>
                <div className="ml-6 space-y-1">
                  {folder.files.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between py-1 px-3 rounded-lg bg-gray-800/40 text-xs"
                    >
                      <span className="text-gray-300">{f.name}</span>
                      <div className="flex items-center gap-3 text-gray-500">
                        {f.size && <span>{formatBytes(f.size)}</span>}
                        {f.modifiedTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(f.modifiedTime)}
                          </span>
                        )}
                        {f.webViewLink && (
                          <a
                            href={f.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Results */}
      {results.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Resultados desta Sessão
          </h2>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {r.error ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="font-medium text-sm">{r.folder}</span>
                  </div>
                  <span className="text-xs text-gray-500">{r.durationMs}ms</span>
                </div>
                {r.error ? (
                  <p className="text-xs text-red-400">{r.error}</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {r.files.map((f) => (
                      <span
                        key={f.name}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          f.ok
                            ? "bg-emerald-900/40 text-emerald-300"
                            : "bg-red-900/40 text-red-300"
                        }`}
                      >
                        {f.ok ? "✓" : "✗"} {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup Guide */}
      {!status?.configured && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Como Configurar
          </h2>
          <ol className="space-y-3 text-sm text-gray-300">
            {[
              "Acesse console.cloud.google.com e crie (ou selecione) um projeto",
              'Ative a API "Google Drive API" no projeto',
              'Em "IAM & Admin → Service Accounts", crie uma Service Account',
              'Gere uma chave JSON e faça o download',
              "Encode em base64: base64 -i service-account.json | tr -d '\\n'",
              "Defina GOOGLE_SERVICE_ACCOUNT_KEY=<resultado do base64> no Vercel",
              "Crie uma pasta no Google Drive e copie o ID da URL (parte após /folders/)",
              "Compartilhe a pasta com o e-mail da Service Account (editor)",
              "Defina GOOGLE_DRIVE_FOLDER_ID=<id-da-pasta> no Vercel",
              "Faça redeploy e volte a esta página para confirmar a conexão",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gray-700 text-gray-300 text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span className="text-gray-400">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
