"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, Loader2, AlertCircle, Minimize2 } from "lucide-react";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const BU_HINTS: Record<string, string> = {
  "/": "Estou na visão geral do dashboard. ",
  "/revenue": "Estou analisando a página de Receita. ",
  "/customers": "Estou na página de Clientes. ",
  "/reports": "Estou na página de Relatórios. ",
  "/settings": "Estou na página de Configurações. ",
};

const BU_PROMPTS: Record<string, string[]> = {
  "/": [
    "Qual BU precisa mais atenção agora?",
    "Resuma os KPIs em uma frase",
    "Quais alertas são mais críticos?",
  ],
  "/revenue": [
    "Por que a margem bruta subiu para 67.4%?",
    "Qual canal tem melhor ROI?",
    "Projete receita para Q2 2026",
  ],
  "/customers": [
    "Quais clientes estão em maior risco?",
    "Como melhorar o LTV médio?",
    "Qual segmento tem maior churn?",
  ],
  "/reports": [
    "Gere um resumo executivo rápido",
    "O que incluir no board pack de Q2?",
    "Quais métricas o board mais valoriza?",
  ],
};

export default function OpenClawWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  // Don't show on the dedicated OpenClaw page
  if (pathname === "/openclaw") return null;

  const hints = BU_HINTS[pathname] ?? "";
  const suggested = BU_PROMPTS[pathname] ?? BU_PROMPTS["/"];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || loading) return;

    const contextMsg = hints ? `${hints}${userMsg}` : userMsg;
    const newMessages: Message[] = [...messages, { role: "user", content: contextMsg }];
    setMessages([...messages, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);
    setError(null);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const { text: t } = JSON.parse(data);
            if (t) {
              assistantText += t;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantText };
                return updated;
              });
            }
          } catch {
            // ignore
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-gray-700 hover:bg-gray-600"
            : "bg-gradient-to-br from-brand-600 to-brand-500 hover:scale-105"
        }`}
        title={open ? "Fechar OpenClaw" : "Abrir OpenClaw"}
      >
        {open ? (
          <X size={18} className="text-white" />
        ) : (
          <Sparkles size={18} className="text-white" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-22 right-6 z-50 w-80 bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
          style={{ height: "480px", bottom: "5.5rem" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-800 bg-gray-900/90 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-200">OpenClaw</div>
              <div className="text-[10px] text-gray-600 leading-none mt-0.5">
                {pathname === "/" ? "Overview" : pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2)} · JACQES BI
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-gray-600 hover:text-gray-400 transition-colors"
            >
              <Minimize2 size={13} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-gray-600 px-1 mb-3">
                  Pergunte sobre esta BU:
                </p>
                {suggested.map((p) => (
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
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={10} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700/40"
                  }`}
                >
                  {msg.content || (
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Loader2 size={10} className="animate-spin" />
                      Pensando...
                    </span>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-5 h-5 rounded-md bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={10} className="text-gray-300" />
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="flex items-start gap-1.5 px-3 py-2 bg-red-950/40 border border-red-800/50 rounded-lg text-[10px] text-red-400">
                <AlertCircle size={11} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
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
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre esta BU..."
                rows={1}
                className="flex-1 bg-transparent text-[11px] text-gray-200 placeholder:text-gray-600 resize-none focus:outline-none min-h-[20px] max-h-20"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-6 h-6 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                {loading ? (
                  <Loader2 size={11} className="text-white animate-spin" />
                ) : (
                  <Send size={11} className="text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
