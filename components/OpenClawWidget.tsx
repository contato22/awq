"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, X, Send, Bot, User, Loader2, AlertCircle,
  Minimize2, Key, Eye, EyeOff, ExternalLink, RotateCcw,
} from "lucide-react";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type BuContext = "awq" | "jacqes" | "caza" | "venture";

const LS_KEY = "openclaw_api_key";

function getBuContext(pathname: string): BuContext {
  if (pathname.startsWith("/caza-vision")) return "caza";
  if (pathname.startsWith("/awq-venture")) return "venture";
  if (pathname.startsWith("/jacqes")) return "jacqes";
  return "awq";
}

const BU_LABELS: Record<BuContext, string> = {
  awq: "AWQ Group",
  jacqes: "JACQES",
  caza: "Caza Vision",
  venture: "AWQ Venture",
};

const BU_PROMPTS: Record<BuContext, string[]> = {
  awq: [
    "Compare o desempenho entre as BUs",
    "Qual BU tem maior potencial de crescimento?",
    "Resuma o estado consolidado do grupo",
  ],
  jacqes: [
    "Quais clientes estão em maior risco de churn?",
    "Por que a margem subiu para 67.4%?",
    "Como melhorar o score médio dos clientes?",
  ],
  caza: [
    "Quais são as prioridades para o lançamento Q2?",
    "Como posicionar a Caza Vision no mercado proptech?",
    "Que métricas devo acompanhar no pipeline?",
  ],
  venture: [
    "Como estruturar o portfólio inicial do fundo?",
    "Quais setores priorizar nos primeiros investimentos?",
    "Como calcular o IRR target para o fundo?",
  ],
};

// ── Setup screen ───────────────────────────────────────────────────────────────
function SetupScreen({ onSave }: { onSave: (key: string) => void }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);

  const save = () => {
    const k = value.trim();
    if (!k) return;
    localStorage.setItem(LS_KEY, k);
    onSave(k);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 py-6 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center">
        <Key size={22} className="text-brand-600" />
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-400">Configurar Open Claw</div>
        <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">
          Insira sua chave da API Anthropic para ativar o agente. A chave é salva localmente no seu navegador.
        </div>
      </div>

      <div className="w-full relative">
        <input
          autoFocus
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="sk-ant-... ou sk-..."
          className="w-full px-3 py-2.5 pr-9 bg-gray-100 border border-gray-300 rounded-xl text-xs text-gray-400 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <button
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-400"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      <button
        onClick={save}
        disabled={!value.trim()}
        className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 text-xs font-semibold rounded-xl transition-colors"
      >
        Salvar e ativar
      </button>

      <a
        href="https://console.anthropic.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-500 transition-colors"
      >
        Obter chave no console.anthropic.com
        <ExternalLink size={10} />
      </a>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────
export default function OpenClawWidget() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setApiKey(stored);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Reset messages when BU context changes
  const buContext = getBuContext(pathname ?? "");
  const prevBuRef = useRef<BuContext>(buContext);
  useEffect(() => {
    if (prevBuRef.current !== buContext) {
      setMessages([]);
      setError(null);
      prevBuRef.current = buContext;
    }
  }, [buContext]);

  const buLabel = BU_LABELS[buContext];
  const suggested = BU_PROMPTS[buContext];

  const sendMessage = useCallback(async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || loading || !apiKey) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anthropic-key": apiKey,
        },
        body: JSON.stringify({ messages: newMessages, buContext }),
      });

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          if (data.error === "API_KEY_REQUIRED") {
            setApiKey(null);
            localStorage.removeItem(LS_KEY);
          }
          errorMsg = data.error || errorMsg;
        } catch { /* response was HTML, not JSON */ }
        throw new Error(errorMsg);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") break;
          let parsed: { text?: string; error?: string } | null = null;
          try { parsed = JSON.parse(d); } catch { /* malformed SSE line, skip */ }
          if (!parsed) continue;
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            assistantText += parsed.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantText };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
    } finally {
      setLoading(false);
    }
  }, [messages, loading, apiKey, buContext]);

  if (pathname === "/openclaw") return null;

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-200 ${
          open ? "bg-gray-200 hover:bg-gray-600" : "bg-gradient-to-br from-brand-600 to-brand-500 hover:scale-105 shadow-brand-900/50"
        }`}
        title={open ? "Fechar OpenClaw" : "Abrir OpenClaw"}
      >
        {open ? <X size={18} className="text-gray-900" /> : <Sparkles size={18} className="text-gray-900" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 w-80 bg-white border border-gray-300/80 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
          style={{ height: 480, bottom: "5.5rem", right: "1.5rem" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
              <Sparkles size={12} className="text-gray-900" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-400">OpenClaw</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {apiKey ? buLabel : "Configuração necessária"}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {apiKey && messages.length > 0 && (
                <button
                  onClick={() => { setMessages([]); setError(null); }}
                  className="p-1.5 text-gray-400 hover:text-gray-400 transition-colors"
                  title="Nova conversa"
                >
                  <RotateCcw size={12} />
                </button>
              )}
              {apiKey && (
                <button
                  onClick={() => { setApiKey(null); localStorage.removeItem(LS_KEY); setMessages([]); setError(null); }}
                  className="p-1.5 text-gray-400 hover:text-gray-500 transition-colors"
                  title="Trocar chave de API"
                >
                  <Key size={12} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-400 transition-colors">
                <Minimize2 size={13} />
              </button>
            </div>
          </div>

          {/* Setup screen or chat */}
          {!apiKey ? (
            <SetupScreen onSave={setApiKey} />
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
                {messages.length === 0 && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2 px-1 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shrink-0">
                        <Sparkles size={11} className="text-gray-900" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-gray-400">OpenClaw</p>
                        <p className="text-[10px] text-gray-400">Contexto: {buLabel}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                    {suggested.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="w-full text-left px-3 py-2 text-[11px] text-gray-400 bg-gray-100/60 hover:bg-gray-100 border border-gray-300/50 hover:border-gray-600 rounded-lg transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={10} className="text-gray-900" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-brand-600 text-gray-900 rounded-br-sm"
                        : "bg-gray-100 text-gray-400 rounded-bl-sm border border-gray-300/40"
                    }`}>
                      {msg.content || (
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Loader2 size={10} className="animate-spin" />Pensando...
                        </span>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-5 h-5 rounded-md bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={10} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}

                {error && (
                  <div className="flex items-start gap-1.5 px-3 py-2 bg-red-950/40 border border-red-800/50 rounded-lg text-[10px] text-red-600">
                    <AlertCircle size={11} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 px-3 py-2.5 shrink-0">
                <div className="flex items-end gap-2 bg-gray-100 border border-gray-300 rounded-xl px-2.5 py-1.5 focus-within:border-brand-500 transition-colors">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(input);
                      }
                    }}
                    placeholder={`Pergunte sobre ${buLabel}...`}
                    rows={1}
                    className="flex-1 bg-transparent text-[11px] text-gray-400 placeholder:text-gray-400 resize-none focus:outline-none min-h-[20px] max-h-20"
                    disabled={loading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="w-6 h-6 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
                  >
                    {loading ? <Loader2 size={11} className="text-gray-900 animate-spin" /> : <Send size={11} className="text-gray-900" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
