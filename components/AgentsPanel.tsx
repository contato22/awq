"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot, Play, RefreshCw, Loader2, CheckCircle2,
  AlertCircle, LayoutDashboard, TrendingUp, Users,
  FileBarChart, Building2, Key, Sparkles,
} from "lucide-react";
import { AGENTS } from "@/lib/agents-config";

// GitHub Pages static export: call Anthropic API directly from browser.
// Server/Vercel mode: call the Next.js API route proxy.
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

const LS_KEY = "openclaw_api_key";

interface AgentResult {
  id: string;
  name: string;
  role: string;
  content: string;
  status: "idle" | "running" | "done" | "error";
  timestamp?: string;
}

const AGENT_META: Record<string, { icon: React.ElementType; color: string; buColor: string }> = {
  overview: { icon: LayoutDashboard, color: "text-brand-400", buColor: "bg-brand-500/10 border-brand-500/20" },
  revenue: { icon: TrendingUp, color: "text-emerald-400", buColor: "bg-emerald-500/10 border-emerald-500/20" },
  customers: { icon: Users, color: "text-cyan-400", buColor: "bg-cyan-500/10 border-cyan-500/20" },
  reports: { icon: FileBarChart, color: "text-purple-400", buColor: "bg-purple-500/10 border-purple-500/20" },
  "awq-master": { icon: Building2, color: "text-amber-400", buColor: "bg-amber-500/10 border-amber-500/20" },
};

const BU_AGENTS = ["overview", "revenue", "customers", "reports"];

// ── Single agent card ──────────────────────────────────────────────────────────
function AgentCard({
  agent,
  onRun,
}: {
  agent: AgentResult;
  onRun: (id: string) => void;
}) {
  const meta = AGENT_META[agent.id];
  const Icon = meta.icon;

  return (
    <div className={`card p-5 border ${meta.buColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.buColor} border`}>
            <Icon size={16} className={meta.color} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-200">{agent.name}</div>
            <div className="text-[10px] text-gray-600 mt-0.5">{agent.role}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {agent.status === "done" && (
            <CheckCircle2 size={14} className="text-emerald-400" />
          )}
          {agent.status === "error" && (
            <AlertCircle size={14} className="text-red-400" />
          )}
          {agent.status === "running" && (
            <Loader2 size={14} className="text-brand-400 animate-spin" />
          )}
          <button
            onClick={() => onRun(agent.id)}
            disabled={agent.status === "running"}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              agent.status === "done"
                ? "bg-gray-800 hover:bg-gray-700 text-gray-400"
                : "bg-brand-600/20 hover:bg-brand-600/40 text-brand-400"
            }`}
            title="Executar agente"
          >
            {agent.status === "running" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : agent.status === "done" ? (
              <RefreshCw size={12} />
            ) : (
              <Play size={12} />
            )}
          </button>
        </div>
      </div>

      <div className="min-h-[60px]">
        {agent.status === "idle" && (
          <p className="text-[11px] text-gray-600 italic">
            Clique em ▶ para executar análise automática
          </p>
        )}
        {agent.status === "running" && !agent.content && (
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <Loader2 size={11} className="animate-spin" />
            Analisando dados...
          </div>
        )}
        {agent.content && (
          <div className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
            {agent.content}
          </div>
        )}
        {agent.status === "error" && !agent.content && (
          <p className="text-[11px] text-red-400">Falha ao executar agente</p>
        )}
      </div>

      {agent.timestamp && (
        <div className="mt-3 pt-2 border-t border-gray-800 text-[10px] text-gray-700">
          Última análise: {agent.timestamp}
        </div>
      )}
    </div>
  );
}

// ── No key screen ──────────────────────────────────────────────────────────────
function NoKeyScreen() {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);

  const save = () => {
    const k = value.trim();
    if (!k) return;
    localStorage.setItem(LS_KEY, k);
    window.location.reload();
  };

  return (
    <div className="card p-10 flex flex-col items-center text-center gap-4 max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center">
        <Key size={22} className="text-brand-400" />
      </div>
      <div>
        <div className="text-base font-semibold text-gray-200">Configurar Open Claw</div>
        <div className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs">
          Insira sua chave da API Anthropic para ativar os agentes autônomos de cada BU.
        </div>
      </div>
      <div className="w-full relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="sk-ant-..."
          className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <button
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
      <button
        onClick={save}
        disabled={!value.trim()}
        className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Salvar e ativar agentes
      </button>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function AgentsPanel() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentResult[]>([]);
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem(LS_KEY);
    setApiKey(key);

    if (IS_STATIC) {
      // Static mode: use shared config directly — no server manifest needed
      setAgents(AGENTS.map((a) => ({ ...a, content: "", status: "idle" as const })));
    } else {
      // Server mode: fetch manifest from API route
      fetch("/api/agents")
        .then((r) => r.json())
        .then((list: { id: string; name: string; role: string }[]) => {
          setAgents(list.map((a) => ({ ...a, content: "", status: "idle" as const })));
        })
        .catch(() => {
          setAgents(AGENTS.map((a) => ({ ...a, content: "", status: "idle" as const })));
        });
    }
  }, []);

  const runAgent = useCallback(async (agentId: string, key?: string) => {
    const activeKey = key ?? apiKey;
    if (!activeKey) return;

    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, status: "running", content: "" } : a))
    );

    try {
      let text = "";

      if (IS_STATIC) {
        // ── Static / GitHub Pages mode ────────────────────────────────────────
        // Call Anthropic API directly from the browser (no server required).
        const agent = AGENTS.find((a) => a.id === agentId)!;
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": activeKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-opus-4-6",
            max_tokens: 512,
            stream: true,
            system: agent.system,
            messages: [{ role: "user", content: agent.prompt }],
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const d = line.slice(6).trim();
            if (!d) continue;
            try {
              const parsed = JSON.parse(d) as {
                type: string;
                delta?: { type: string; text: string };
              };
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                text += parsed.delta.text;
                setAgents((prev) =>
                  prev.map((a) => (a.id === agentId ? { ...a, content: text } : a))
                );
              }
            } catch { /* ignore malformed lines */ }
          }
        }
      } else {
        // ── Server / Vercel mode ──────────────────────────────────────────────
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-anthropic-key": activeKey,
          },
          body: JSON.stringify({ agentId }),
        });

        if (!res.ok) {
          const data = await res.json();
          if (data.error === "API_KEY_REQUIRED") {
            setApiKey(null);
            localStorage.removeItem(LS_KEY);
          }
          throw new Error(data.error);
        }

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
              const parsed = JSON.parse(d) as { text?: string };
              if (parsed.text) {
                text += parsed.text;
                setAgents((prev) =>
                  prev.map((a) => (a.id === agentId ? { ...a, content: text } : a))
                );
              }
            } catch { /* ignore */ }
          }
        }
      }

      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId
            ? { ...a, status: "done", timestamp: new Date().toLocaleTimeString("pt-BR") }
            : a
        )
      );
    } catch {
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, status: "error" } : a))
      );
    }
  }, [apiKey]);

  const runAllAgents = async () => {
    if (!apiKey || runningAll) return;
    setRunningAll(true);
    // Run BU agents in parallel, then AWQ master
    await Promise.all(BU_AGENTS.map((id) => runAgent(id)));
    await runAgent("awq-master");
    setRunningAll(false);
  };

  if (!apiKey) return <NoKeyScreen />;

  const buAgents = agents.filter((a) => BU_AGENTS.includes(a.id));
  const masterAgent = agents.find((a) => a.id === "awq-master");
  const doneCount = agents.filter((a) => a.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <Sparkles size={14} className="text-brand-400" />
          <span className="text-xs font-semibold text-gray-300">Multi-Agent Sistema</span>
          <span className="badge badge-blue">{doneCount}/{agents.length} concluídos</span>
        </div>
        <button
          onClick={runAllAgents}
          disabled={runningAll || !apiKey}
          className="btn-primary flex items-center gap-2 text-xs disabled:opacity-50"
        >
          {runningAll ? (
            <><Loader2 size={12} className="animate-spin" />Executando...</>
          ) : (
            <><Play size={12} />Executar todos os agentes</>
          )}
        </button>
        <button
          onClick={() => { setApiKey(null); localStorage.removeItem(LS_KEY); }}
          className="btn-secondary text-xs flex items-center gap-1.5"
          title="Remover chave e reconfigurar"
        >
          <Key size={12} />Trocar chave
        </button>
      </div>

      {/* BU Agents grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bot size={14} className="text-gray-500" />
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
            Agentes por BU — Auto-gerenciamento
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onRun={runAgent} />
          ))}
        </div>
      </div>

      {/* AWQ Master Agent */}
      {masterAgent && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={14} className="text-gray-500" />
            <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
              AWQ Master Agent — Gestão de Portfolio
            </span>
          </div>
          <AgentCard agent={masterAgent} onRun={runAgent} />
        </div>
      )}
    </div>
  );
}
