"use client";

/**
 * SupervisorWidget — Persistent BU Supervisor Agent
 *
 * Always visible. Proactively briefs on critical alerts.
 * Accepts chat input. Has full tool use (server mode) or
 * direct Anthropic API call with pre-fetched data (static mode).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ShieldAlert, X, Send, Loader2, AlertCircle,
  Zap, Database, FileCode, ChevronDown, Bell,
  CheckCircle2, AlertTriangle, Info, RotateCcw,
  Minimize2, Maximize2,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { AGENTS } from "@/lib/agents-config";

// ── Constants ─────────────────────────────────────────────────────────────────

const LS_KEY = "openclaw_api_key";
const LS_ALERTS = "supervisor_alerts";
const LS_LAST_BRIEF = "supervisor_last_brief";
const BRIEF_INTERVAL_MS = 60 * 60 * 1000; // 1 h

const BUILTIN_KEY = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "";

function resolveKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_KEY) || BUILTIN_KEY || null;
}

function detectStaticMode(): boolean {
  if (process.env.NEXT_PUBLIC_STATIC_DATA === "1") return true;
  if (typeof window !== "undefined" && window.location.hostname.includes("github.io")) return true;
  return false;
}

async function fetchStaticData(): Promise<string> {
  const files = [
    { label: "Projetos", url: "/data/caza-properties.json" },
    { label: "Clientes", url: "/data/caza-clients.json" },
  ];
  const parts: string[] = [];
  for (const f of files) {
    try {
      const res = await fetch(f.url);
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : (data?.data ?? []);
        parts.push(`[${f.label}] ${rows.length} registros: ${JSON.stringify(rows.slice(0, 5))}`);
      }
    } catch { /* optional */ }
  }
  return parts.length ? `\n\n=== DADOS AO VIVO ===\n${parts.join("\n")}` : "";
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AlertLevel = "critical" | "warning" | "info";

interface SupervisorAlert {
  id: string;
  level: AlertLevel;
  title: string;
  body: string;
  read: boolean;
  ts: number;
}

interface ToolEvent {
  type: "tool_call" | "tool_result";
  name: string;
  label?: string;
  summary?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolEvents?: ToolEvent[];
}

type Tab = "alerts" | "chat";

function getBuContext(pathname: string): string {
  if (pathname.startsWith("/caza-vision")) return "caza";
  if (pathname.startsWith("/awq-venture")) return "venture";
  if (pathname.startsWith("/jacqes")) return "jacqes";
  return "awq";
}

// ── Alert parsers ─────────────────────────────────────────────────────────────

const EMOJI_LEVEL: Record<string, AlertLevel> = {
  "🔴": "critical",
  "🟡": "warning",
  "🟢": "info",
};

function parseAlerts(text: string): SupervisorAlert[] {
  const alerts: SupervisorAlert[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    for (const [emoji, level] of Object.entries(EMOJI_LEVEL)) {
      if (trimmed.startsWith(emoji)) {
        const rest = trimmed.slice(emoji.length).trim();
        const dashIdx = rest.indexOf(" — ");
        const title = dashIdx >= 0 ? rest.slice(0, dashIdx).trim() : rest.slice(0, 60);
        const body = dashIdx >= 0 ? rest.slice(dashIdx + 3).trim() : "";
        alerts.push({
          id: `${Date.now()}-${Math.random()}`,
          level,
          title,
          body,
          read: false,
          ts: Date.now(),
        });
        break;
      }
    }
  }
  return alerts;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AlertCard({ alert, onRead }: { alert: SupervisorAlert; onRead: (id: string) => void }) {
  const cfg = {
    critical: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/8 border-red-500/20", dot: "bg-red-400" },
    warning:  { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/8 border-amber-500/20", dot: "bg-amber-400" },
    info:     { icon: Info, color: "text-brand-400", bg: "bg-brand-500/8 border-brand-500/20", dot: "bg-brand-400" },
  }[alert.level];
  const Icon = cfg.icon;

  return (
    <div
      className={`rounded-xl border p-3 cursor-pointer transition-opacity ${cfg.bg} ${alert.read ? "opacity-60" : ""}`}
      onClick={() => onRead(alert.id)}
    >
      <div className="flex items-start gap-2">
        <Icon size={13} className={`${cfg.color} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-semibold leading-tight ${cfg.color}`}>{alert.title}</div>
          {alert.body && (
            <div className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{alert.body}</div>
          )}
        </div>
        {!alert.read && <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0 mt-1`} />}
      </div>
    </div>
  );
}

function ToolPill({ event }: { event: ToolEvent }) {
  const isCall = event.type === "tool_call";
  const toolIcons: Record<string, React.ElementType> = {
    read_file: FileCode, write_file: FileCode, list_directory: FileCode,
    query_notion_database: Database, update_notion_record: Database, create_notion_alert: Database,
  };
  const IconComp = toolIcons[event.name] ?? Zap;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${
      isCall
        ? "bg-brand-500/10 text-brand-400 border-brand-500/20"
        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    }`}>
      <IconComp size={8} />
      {isCall ? (event.label ?? event.name.replace(/_/g, " ")) : (event.summary ?? "ok")}
    </span>
  );
}

// ── SSE stream reader ─────────────────────────────────────────────────────────

type SSEEvent = { text?: string; type?: string; name?: string; label?: string; summary?: string; error?: string };

async function* readSSE(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    for (const line of decoder.decode(value, { stream: true }).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const d = line.slice(6).trim();
      if (d === "[DONE]") return;
      try { yield JSON.parse(d) as SSEEvent; } catch { /* skip */ }
    }
  }
}

// ── Supervisor briefing system prompt (static mode) ──────────────────────────

const STATIC_BRIEFING_SYSTEM = AGENTS.find((a) => a.id === "jacqes")?.system ?? "";

const STATIC_BRIEFING_PROMPT = `Você é o Supervisor da BU. Faça um briefing conciso agora.
Liste os 3–5 alertas mais críticos do momento usando exatamente este formato, uma linha por alerta:
🔴 TÍTULO — descrição breve. Ação: o que fazer agora.
🟡 TÍTULO — descrição breve. Ação: o que fazer agora.
🟢 TÍTULO — descrição breve. Ação: o que fazer agora.
Apenas liste os alertas, sem mais texto.`;

// ── Main widget ───────────────────────────────────────────────────────────────

export default function SupervisorWidget() {
  const pathname = usePathname() ?? "";
  const buContext = getBuContext(pathname);

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("alerts");
  const [alerts, setAlerts] = useState<SupervisorAlert[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [briefingDone, setBriefingDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiKey = resolveKey();
  const unreadCount = alerts.filter((a) => !a.read).length;
  const criticalCount = alerts.filter((a) => a.level === "critical" && !a.read).length;

  // Load persisted alerts
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_ALERTS);
      if (saved) setAlerts(JSON.parse(saved) as SupervisorAlert[]);
    } catch { /* ignore */ }
  }, []);

  // Persist alerts
  useEffect(() => {
    if (alerts.length > 0) {
      localStorage.setItem(LS_ALERTS, JSON.stringify(alerts.slice(-20)));
    }
  }, [alerts]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Auto-briefing on mount ──────────────────────────────────────────────────
  const runBriefing = useCallback(async () => {
    if (!apiKey || briefingDone) return;
    const last = localStorage.getItem(LS_LAST_BRIEF);
    if (last && Date.now() - parseInt(last, 10) < BRIEF_INTERVAL_MS) {
      setBriefingDone(true);
      return;
    }
    setBriefingDone(true);
    localStorage.setItem(LS_LAST_BRIEF, String(Date.now()));

    try {
      let rawText = "";

      if (detectStaticMode()) {
        const liveData = await fetchStaticData();
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 512,
            stream: true,
            system: STATIC_BRIEFING_SYSTEM,
            messages: [{ role: "user", content: STATIC_BRIEFING_PROMPT + liveData }],
          }),
        });
        if (!res.ok) return;
        const reader = res.body!.getReader();
        for await (const ev of readSSE(reader)) {
          if ((ev as { type?: string; delta?: { type: string; text: string } }).type === "content_block_delta") {
            const delta = (ev as { delta?: { type: string; text: string } }).delta;
            if (delta?.type === "text_delta") rawText += delta.text;
          }
        }
      } else {
        const res = await fetch("/api/supervisor", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-anthropic-key": apiKey },
          body: JSON.stringify({ messages: [], buContext, briefing: true }),
        });
        if (!res.ok) return;
        const reader = res.body!.getReader();
        for await (const ev of readSSE(reader)) {
          if (ev.text) rawText += " " + ev.text;
        }
      }

      const parsed = parseAlerts(rawText.trim());
      if (parsed.length > 0) {
        setAlerts((prev) => [...parsed, ...prev].slice(0, 20));
      }
    } catch { /* silently skip briefing on error */ }
  }, [apiKey, briefingDone, buContext]);

  useEffect(() => {
    if (apiKey && !briefingDone) runBriefing();
  }, [apiKey, briefingDone, runBriefing]);

  // ── Send chat message ──────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || loading || !apiKey) return;

    const newMsgs: ChatMessage[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      let assistantText = "";
      const toolEventsBuffer: ToolEvent[] = [];
      setMessages((prev) => [...prev, { role: "assistant", content: "", toolEvents: [] }]);

      if (detectStaticMode()) {
        const liveData = await fetchStaticData();
        const apiMessages = newMsgs.map((m) => ({ role: m.role, content: m.content }));
        apiMessages[apiMessages.length - 1].content += liveData;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-opus-4-6",
            max_tokens: 1024,
            stream: true,
            system: STATIC_BRIEFING_SYSTEM,
            messages: apiMessages,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body!.getReader();
        for await (const ev of readSSE(reader)) {
          const e = ev as { type?: string; delta?: { type: string; text: string } };
          if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
            assistantText += e.delta.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantText, toolEvents: [] };
              return updated;
            });
          }
        }
      } else {
        const res = await fetch("/api/supervisor", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-anthropic-key": apiKey },
          body: JSON.stringify({
            messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
            buContext,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        const reader = res.body!.getReader();
        for await (const ev of readSSE(reader)) {
          if (ev.text) {
            assistantText += (assistantText && !assistantText.endsWith(" ") ? " " : "") + ev.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantText, toolEvents: [...toolEventsBuffer] };
              return updated;
            });
          } else if (ev.type === "tool_call" || ev.type === "tool_result") {
            toolEventsBuffer.push({ type: ev.type as "tool_call" | "tool_result", name: ev.name ?? "", label: ev.label, summary: ev.summary });
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...updated[updated.length - 1], toolEvents: [...toolEventsBuffer] };
              return updated;
            });
          } else if (ev.error) {
            throw new Error(ev.error);
          }
        }
      }

      // If assistant response contains new alerts, parse and add them
      const newAlerts = parseAlerts(assistantText);
      if (newAlerts.length >= 2) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 20));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao processar";
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return [...prev.slice(0, -1), { role: "assistant", content: `⚠️ ${msg}` }];
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [messages, loading, apiKey, buContext]);

  const markAllRead = () => setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  const clearAlerts = () => { setAlerts([]); localStorage.removeItem(LS_ALERTS); };
  const markRead = (id: string) => setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));

  // Don't render on login page
  if (pathname === "/login") return null;

  const panelW = expanded ? 480 : 380;
  const panelH = expanded ? 620 : 520;

  return (
    <>
      {/* ── Floating trigger button ────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen((v) => !v); if (!open) setTab("alerts"); }}
        className={`fixed bottom-24 right-6 z-50 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-gray-800 hover:bg-gray-700 w-12 h-12"
            : "bg-gradient-to-br from-red-600 via-brand-600 to-brand-500 hover:scale-105 shadow-brand-900/40 w-12 h-12"
        }`}
        title={open ? "Fechar Supervisor" : "Abrir Supervisor BU"}
      >
        {open ? (
          <ChevronDown size={18} className="text-white" />
        ) : (
          <ShieldAlert size={18} className="text-white" />
        )}
        {!open && unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
            criticalCount > 0 ? "bg-red-500" : "bg-amber-500"
          }`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel ──────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl shadow-black/70 flex flex-col overflow-hidden transition-all duration-200"
          style={{ width: panelW, height: panelH, bottom: "9rem", right: "1.5rem" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-800 shrink-0 bg-gray-900/80 backdrop-blur">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-600 to-brand-500 flex items-center justify-center shrink-0">
              <ShieldAlert size={13} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-100">Supervisor BU</div>
              <div className="text-[10px] text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                monitorando 24/7 · {buContext.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setExpanded((v) => !v)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors" title={expanded ? "Minimizar" : "Expandir"}>
                {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800 shrink-0">
            <button
              onClick={() => setTab("alerts")}
              className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 ${
                tab === "alerts" ? "text-brand-400 border-b-2 border-brand-500" : "text-gray-600 hover:text-gray-400"
              }`}
            >
              <Bell size={11} />
              Alertas
              {unreadCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${criticalCount > 0 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("chat")}
              className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 ${
                tab === "chat" ? "text-brand-400 border-b-2 border-brand-500" : "text-gray-600 hover:text-gray-400"
              }`}
            >
              <Zap size={11} />
              Chat + Ações
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* ── ALERTS TAB ────────────────────────────────────────────────── */}
            {tab === "alerts" && (
              <div className="p-3 space-y-2">
                {alerts.length === 0 && !briefingDone && (
                  <div className="flex items-center gap-2 py-6 justify-center text-[11px] text-gray-600">
                    <Loader2 size={13} className="animate-spin" />
                    Executando briefing de supervisão...
                  </div>
                )}
                {alerts.length === 0 && briefingDone && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <CheckCircle2 size={22} className="text-emerald-400" />
                    <p className="text-[11px] text-gray-500">Nenhum alerta crítico no momento.</p>
                  </div>
                )}
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onRead={markRead} />
                ))}
                {alerts.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={markAllRead} className="flex-1 py-1.5 text-[10px] text-gray-600 hover:text-gray-400 border border-gray-800 rounded-lg transition-colors">
                      Marcar tudo lido
                    </button>
                    <button onClick={() => runBriefing().then(() => setBriefingDone(false))} className="flex-1 py-1.5 text-[10px] text-brand-400 hover:text-brand-300 border border-brand-500/20 rounded-lg transition-colors flex items-center justify-center gap-1">
                      <RotateCcw size={9} />Atualizar
                    </button>
                    <button onClick={clearAlerts} className="py-1.5 px-2 text-[10px] text-gray-700 hover:text-red-400 border border-gray-800 rounded-lg transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── CHAT TAB ──────────────────────────────────────────────────── */}
            {tab === "chat" && (
              <div className="p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[10px] text-gray-600 px-1">Pergunte qualquer coisa ou peça uma ação direta:</p>
                    {[
                      "Quais clientes precisam de atenção urgente?",
                      "Leia e corrija lib/data.ts",
                      "Crie um alerta no Notion para CV002",
                      "Analise o NPS do Analytics Suite e proponha ação",
                    ].map((p) => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="w-full text-left px-3 py-2 text-[11px] text-gray-400 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-lg transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    {/* Tool events above assistant message */}
                    {msg.role === "assistant" && msg.toolEvents && msg.toolEvents.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-[90%] pl-1">
                        {msg.toolEvents.map((te, j) => (
                          <ToolPill key={j} event={te} />
                        ))}
                      </div>
                    )}
                    <div className={`max-w-[90%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white rounded-br-sm"
                        : "bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700/40"
                    }`}>
                      {msg.content || (
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Loader2 size={10} className="animate-spin" />
                          {msg.toolEvents?.some((te) => te.type === "tool_call")
                            ? "Executando ação..."
                            : "Pensando..."}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {loading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-600 pl-1">
                    <Loader2 size={10} className="animate-spin" />Supervisor pensando...
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input (chat tab only) */}
          {tab === "chat" && (
            <div className="border-t border-gray-800 px-3 py-2.5 shrink-0">
              <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1.5 focus-within:border-brand-500 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                  }}
                  placeholder="Pergunte ou dê uma ordem ao supervisor..."
                  rows={1}
                  disabled={loading || !apiKey}
                  className="flex-1 bg-transparent text-[11px] text-gray-200 placeholder:text-gray-600 resize-none focus:outline-none min-h-[20px] max-h-20"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading || !apiKey}
                  className="w-6 h-6 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
                >
                  {loading ? <Loader2 size={11} className="text-white animate-spin" /> : <Send size={11} className="text-white" />}
                </button>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="mt-1 flex items-center gap-1 text-[9px] text-gray-700 hover:text-gray-500 transition-colors"
                >
                  <RotateCcw size={8} />Nova conversa
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
