"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import {
  Play, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle,
  Zap, Activity, Eye, ChevronDown, ChevronRight, Radio,
  RefreshCw, Shield, Bot, ArrowUpRight, Pause,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentSummary {
  agentId: string;
  agentName: string;
  status: string;
  durationMs: number;
  toolCalls: number;
  escalations: number;
  reportPreview: string;
}

interface CycleComplete {
  id: string;
  status: string;
  durationMs: number;
  escalations: string[];
  masterSynthesis: string | null;
  agents: AgentSummary[];
}

interface CycleHistoryItem {
  id: string;
  trigger: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  durationMs: number;
  agentCount: number;
  escalationCount: number;
  agents: { agentId: string; status: string; durationMs: number }[];
}

interface Stats {
  totalCycles: number;
  completedCycles: number;
  cyclesLast24h: number;
  avgDurationMs: number;
  totalEscalations: number;
  lastCycleAt: string | null;
}

type LiveEvent =
  | { type: "cycle_start"; cycleId: string }
  | { type: "agent_start"; agentId: string; agentName: string }
  | { type: "agent_tool"; agentId: string; toolName: string; summary: string }
  | { type: "agent_text"; agentId: string; text: string }
  | { type: "agent_done"; agentId: string; status: string; durationMs: number }
  | { type: "master_synthesis"; text: string }
  | { type: "cycle_done"; status: string; durationMs: number; escalations: string[] }
  | { type: "cycle_complete"; cycle: CycleComplete }
  | { type: "error"; message: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}min`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}min atrás`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h atrás`;
  return `${Math.floor(diff / 86_400_000)}d atrás`;
}

const AGENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  jacqes:       { bg: "bg-brand-50",   text: "text-brand-600",   border: "border-brand-200" },
  "caza-vision": { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  "awq-venture": { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  "awq-master":  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
};

const STATUS_BADGE: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Concluído" },
  running:   { icon: Loader2,      color: "text-brand-600",   bg: "bg-brand-50 border-brand-200",     label: "Executando" },
  partial:   { icon: AlertTriangle, color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",     label: "Parcial" },
  failed:    { icon: XCircle,       color: "text-red-600",    bg: "bg-red-50 border-red-200",         label: "Falhou" },
  success:   { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "OK" },
  error:     { icon: XCircle,       color: "text-red-600",    bg: "bg-red-50 border-red-200",         label: "Erro" },
  timeout:   { icon: Clock,         color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",     label: "Timeout" },
};

const LS_KEY = "openclaw_api_key";

// ── Component ────────────────────────────────────────────────────────────────

export default function DirectorPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<CycleHistoryItem[]>([]);
  const [running, setRunning] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [activeCycle, setActiveCycle] = useState<CycleComplete | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Load API key
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setApiKey(stored);
  }, []);

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/director/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setHistory(data.cycles);
      }
    } catch { /* offline / static export */ }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Auto-scroll live log
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [liveEvents]);

  // Run cycle
  const runCycle = useCallback(async () => {
    if (running || !apiKey) return;
    setRunning(true);
    setLiveEvents([]);
    setActiveCycle(null);
    setActiveAgent(null);

    try {
      const res = await fetch("/api/director/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anthropic-key": apiKey,
        },
        body: JSON.stringify({ trigger: "manual" }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") break;
          try {
            const event = JSON.parse(d) as LiveEvent;
            setLiveEvents((prev) => [...prev, event]);

            if (event.type === "agent_start") setActiveAgent(event.agentId);
            if (event.type === "cycle_complete") setActiveCycle(event.cycle);
            if (event.type === "cycle_done") setActiveAgent(null);
          } catch { /* malformed */ }
        }
      }
    } catch (err) {
      setLiveEvents((prev) => [...prev, { type: "error", message: err instanceof Error ? err.message : "Failed" }]);
    } finally {
      setRunning(false);
      loadHistory();
    }
  }, [running, apiKey, loadHistory]);

  return (
    <>
      <Header
        title="Design Director"
        subtitle="Agente autônomo 24/7 — orquestra, monitora e governa todos os sleeves"
      />
      <div className="px-8 py-6 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { label: "Ciclos Totais",  value: stats?.totalCycles ?? 0,     icon: Activity, color: "text-brand-600",   bg: "bg-brand-50" },
            { label: "Últimas 24h",    value: stats?.cyclesLast24h ?? 0,   icon: Clock,    color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Tempo Médio",    value: stats ? fmtDuration(stats.avgDurationMs) : "—", icon: Zap, color: "text-violet-700", bg: "bg-violet-50" },
            { label: "Escalações",     value: stats?.totalEscalations ?? 0, icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Último Ciclo",   value: stats?.lastCycleAt ? timeAgo(stats.lastCycleAt) : "Nunca", icon: Radio, color: "text-gray-600", bg: "bg-gray-100" },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={kpi.color} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Ciclo Autônomo</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Executa JACQES → Caza → Venture → Master em sequência. Cada agente lê dados, toma ações e reporta.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!apiKey && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                  Configure API key no OpenClaw primeiro
                </span>
              )}
              <button
                onClick={runCycle}
                disabled={running || !apiKey}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 text-xs font-semibold rounded-xl transition-colors"
              >
                {running ? (
                  <><Loader2 size={14} className="animate-spin" /> Executando...</>
                ) : (
                  <><Play size={14} /> Executar Ciclo</>
                )}
              </button>
              <button
                onClick={loadHistory}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Atualizar histórico"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Live feed */}
          {(running || liveEvents.length > 0) && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                {running && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                <span className="text-xs font-semibold text-gray-700">
                  {running ? "Ciclo em execução..." : "Último ciclo"}
                </span>
                {activeAgent && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${AGENT_COLORS[activeAgent]?.bg ?? "bg-gray-100"} ${AGENT_COLORS[activeAgent]?.text ?? "text-gray-600"} border ${AGENT_COLORS[activeAgent]?.border ?? "border-gray-200"}`}>
                    {activeAgent}
                  </span>
                )}
              </div>
              <div
                ref={logRef}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-64 overflow-y-auto font-mono text-[11px] space-y-0.5"
              >
                {liveEvents.map((ev, i) => {
                  if (ev.type === "cycle_start") return <div key={i} className="text-brand-600">▶ Ciclo iniciado: {ev.cycleId}</div>;
                  if (ev.type === "agent_start") return <div key={i} className="text-gray-800 font-semibold mt-1">┌ {ev.agentName}</div>;
                  if (ev.type === "agent_tool") return <div key={i} className="text-gray-500 pl-3">│ 🔧 {ev.toolName} → {ev.summary}</div>;
                  if (ev.type === "agent_done") {
                    const s = STATUS_BADGE[ev.status];
                    return <div key={i} className={`pl-3 ${s?.color ?? "text-gray-500"}`}>└ {s?.label ?? ev.status} ({fmtDuration(ev.durationMs)})</div>;
                  }
                  if (ev.type === "cycle_done") {
                    const s = STATUS_BADGE[ev.status];
                    return (
                      <div key={i} className="mt-1 font-semibold text-gray-800">
                        ■ Ciclo {s?.label ?? ev.status} — {fmtDuration(ev.durationMs)} — {ev.escalations.length} escalações
                      </div>
                    );
                  }
                  if (ev.type === "error") return <div key={i} className="text-red-600">✗ {ev.message}</div>;
                  // Skip agent_text and master_synthesis in compact log
                  return null;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Active cycle results */}
        {activeCycle && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Resultado do Ciclo</h2>
              <div className="flex items-center gap-2">
                {(() => {
                  const s = STATUS_BADGE[activeCycle.status];
                  const Icon = s?.icon ?? Clock;
                  return (
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s?.bg ?? "bg-gray-100"} ${s?.color ?? "text-gray-500"}`}>
                      <Icon size={10} />
                      {s?.label ?? activeCycle.status}
                    </span>
                  );
                })()}
                <span className="text-[10px] text-gray-400">{fmtDuration(activeCycle.durationMs)}</span>
              </div>
            </div>

            {/* Agent reports */}
            <div className="space-y-3">
              {activeCycle.agents.map((agent) => {
                const colors = AGENT_COLORS[agent.agentId] ?? { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
                const isExpanded = expandedAgent === agent.agentId;
                const s = STATUS_BADGE[agent.status];
                const StatusIcon = s?.icon ?? Clock;

                return (
                  <div key={agent.agentId} className={`rounded-xl border ${colors.border} overflow-hidden`}>
                    <button
                      onClick={() => setExpandedAgent(isExpanded ? null : agent.agentId)}
                      className={`w-full flex items-center justify-between p-3 ${colors.bg} hover:opacity-90 transition-opacity`}
                    >
                      <div className="flex items-center gap-3">
                        <Bot size={14} className={colors.text} />
                        <div className="text-left">
                          <div className={`text-xs font-semibold ${colors.text}`}>{agent.agentName}</div>
                          <div className="text-[10px] text-gray-500">
                            {agent.toolCalls} tools · {agent.escalations} escalações · {fmtDuration(agent.durationMs)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon size={12} className={s?.color ?? "text-gray-400"} />
                        {isExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="p-3 bg-white border-t border-gray-100">
                        <pre className="text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {agent.reportPreview}{agent.reportPreview.length >= 300 ? "..." : ""}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Master synthesis */}
            {activeCycle.masterSynthesis && (
              <div className="mt-4 p-4 rounded-xl bg-violet-50 border border-violet-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={13} className="text-violet-700" />
                  <span className="text-xs font-semibold text-violet-700">Síntese da Control Tower</span>
                </div>
                <pre className="text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {activeCycle.masterSynthesis.slice(0, 1000)}
                  {activeCycle.masterSynthesis.length > 1000 ? "..." : ""}
                </pre>
              </div>
            )}

            {/* Escalations */}
            {activeCycle.escalations.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={13} className="text-red-600" />
                  <span className="text-xs font-semibold text-red-700">
                    {activeCycle.escalations.length} Escalações
                  </span>
                </div>
                <div className="space-y-1">
                  {activeCycle.escalations.map((e, i) => (
                    <div key={i} className="text-[11px] text-red-700">{e}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Histórico de Ciclos</h2>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <Bot size={24} className="mx-auto text-gray-300 mb-2" />
              <div className="text-xs text-gray-400">Nenhum ciclo executado ainda</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Execute o primeiro ciclo para iniciar o monitoramento autônomo</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Ciclo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Trigger</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Agentes</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Escalações</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Duração</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => {
                  const s = STATUS_BADGE[c.status];
                  const StatusIcon = s?.icon ?? Clock;
                  return (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-xs font-medium text-gray-800">{fmtTime(c.startedAt)}</div>
                        <div className="text-[10px] text-gray-400">{c.id.slice(0, 16)}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          c.trigger === "cron" ? "bg-brand-50 text-brand-600 border border-brand-200" :
                          c.trigger === "manual" ? "bg-gray-100 text-gray-600 border border-gray-200" :
                          "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}>
                          {c.trigger === "cron" ? "Automático" : c.trigger === "manual" ? "Manual" : c.trigger}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`flex items-center gap-1 text-[10px] font-semibold ${s?.color ?? "text-gray-500"}`}>
                          <StatusIcon size={10} className={c.status === "running" ? "animate-spin" : ""} />
                          {s?.label ?? c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.agents.map((a) => {
                            const ac = AGENT_COLORS[a.agentId];
                            const as_ = STATUS_BADGE[a.status];
                            return (
                              <div
                                key={a.agentId}
                                className={`w-2 h-2 rounded-full ${as_?.color === "text-emerald-600" ? "bg-emerald-500" : as_?.color === "text-red-600" ? "bg-red-500" : "bg-amber-500"}`}
                                title={`${a.agentId}: ${a.status}`}
                              />
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                        {c.escalationCount > 0 ? (
                          <span className="text-red-600 font-semibold">{c.escalationCount}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtDuration(c.durationMs)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Architecture info */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Arquitetura do Director</h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Frequência", value: "A cada 6h (cron)" },
              { label: "Agentes/Ciclo", value: "4 (sequencial)" },
              { label: "Modelo", value: "Claude Sonnet 4" },
              { label: "Max Iterações", value: "8 por agente" },
              { label: "Timeout", value: "2min por agente" },
              { label: "Tools", value: "Notion + FS" },
              { label: "Ordem", value: "Motor → Suporte → Captura → Tower" },
              { label: "Persistência", value: "50 ciclos (JSON)" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-[10px] text-gray-400">{item.label}</div>
                <div className="text-xs font-semibold text-gray-800 mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
