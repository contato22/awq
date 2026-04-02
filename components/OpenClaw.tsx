"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, AlertCircle, Sparkles, Key, Eye, EyeOff, ExternalLink, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LS_KEY = "openclaw_api_key";

// Full-page OpenClaw is accessed via the JACQES sidebar — context is always JACQES
const BU_CONTEXT = "jacqes";

const SUGGESTED_PROMPTS = [
  "Quais clientes estão em maior risco de churn?",
  "Por que a margem subiu para 67.4%?",
  "Compare APAC vs Europe em receita",
  "O que está causando a queda de NPS do Analytics Suite?",
  "Como atingir $6M de receita mensal?",
];

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
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-10 text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
        <Key size={26} className="text-awq-gold" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-800">Configurar OpenClaw</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-xs leading-relaxed">
          Insira sua chave da API Anthropic para ativar o assistente. A chave é salva localmente no seu navegador.
        </p>
      </div>
      <div className="w-full max-w-sm relative">
        <input
          autoFocus
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="sk-ant-..."
          className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 transition-colors"
        />
        <button
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-400"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <button
        onClick={save}
        disabled={!value.trim()}
        className="w-full max-w-sm py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Salvar e ativar
      </button>
      <a
        href="https://console.anthropic.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-500 transition-colors"
      >
        Obter chave no console.anthropic.com
        <ExternalLink size={12} />
      </a>
    </div>
  );
}

export default function OpenClaw() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setApiKey(stored);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
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
        body: JSON.stringify({ messages: newMessages, buContext: BU_CONTEXT }),
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
      const msg = err instanceof Error ? err.message : "Algo deu errado";
      setError(msg);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  if (!apiKey) {
    return (
      <div className="flex flex-col h-full">
        <SetupScreen onSave={setApiKey} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 shadow-lg">
              <Sparkles size={24} className="text-awq-gold" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">OpenClaw · JACQES</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Assistente de inteligência de negócios da JACQES. Pergunte qualquer coisa sobre clientes, receita, CS e operações.
            </p>
            <div className="space-y-2 w-full max-w-sm">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left px-3 py-2.5 text-xs text-slate-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-slate-300 rounded-xl transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-awq-gold" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-slate-800 text-white rounded-br-sm"
                  : "bg-gray-50 text-slate-700 rounded-bl-sm border border-gray-200"
              }`}
            >
              {msg.content || (
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Loader2 size={12} className="animate-spin" />
                  Pensando...
                </span>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-600">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-brand-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre clientes, receita, CS ou operações JACQES..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-gray-400 resize-none focus:outline-none min-h-[24px] max-h-40"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {loading ? (
              <Loader2 size={14} className="text-white animate-spin" />
            ) : (
              <Send size={14} className="text-white" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-gray-400">
            Powered by Claude · JACQES · Mar 2026
          </p>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setError(null); }}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-400 transition-colors"
                title="Nova conversa"
              >
                <RotateCcw size={10} />Nova conversa
              </button>
            )}
            <button
              onClick={() => { setApiKey(null); localStorage.removeItem(LS_KEY); setMessages([]); setError(null); }}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-500 transition-colors"
              title="Trocar chave de API"
            >
              <Key size={10} />Trocar chave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
