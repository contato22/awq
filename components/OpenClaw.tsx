"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, AlertCircle, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  "What are the top growth opportunities this quarter?",
  "Which customers are at highest churn risk?",
  "Compare APAC vs Europe revenue performance",
  "What's driving the Analytics Suite NPS decline?",
  "Recommend actions to hit $6M monthly revenue",
];

export default function OpenClaw() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
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
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const { text } = JSON.parse(data);
              if (text) {
                assistantText += text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantText };
                  return updated;
                });
              }
            } catch {
              // ignore malformed SSE
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setMessages((prev) => prev.slice(0, -1)); // remove empty assistant message if present
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

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center mb-4 shadow-lg">
              <Sparkles size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-1">OpenClaw AI</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Your JACQES BI intelligence assistant. Ask anything about your business data.
            </p>
            <div className="space-y-2 w-full max-w-sm">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left px-3 py-2.5 text-xs text-gray-400 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-lg transition-colors"
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700/50"
              }`}
            >
              {msg.content || (
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Loader2 size={12} className="animate-spin" />
                  Thinking...
                </span>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-400">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-800 px-4 py-3">
        <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 focus-within:border-brand-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask OpenClaw anything about your data..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder:text-gray-600 resize-none focus:outline-none min-h-[24px] max-h-40"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {loading ? (
              <Loader2 size={14} className="text-white animate-spin" />
            ) : (
              <Send size={14} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-700 text-center mt-1.5">
          Powered by Claude · JACQES BI data as of Mar 2026
        </p>
      </div>
    </div>
  );
}
