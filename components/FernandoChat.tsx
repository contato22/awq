"use client";

import { useEffect, useRef, useState } from "react";
import MiniMarkdown from "@/components/office/MiniMarkdown";

interface Msg { de: "gestor" | "fernando"; texto: string; atividades?: { tool: string; entrada: string }[] }

const LS_KEY = "openclaw_api_key";
const LS_CHAT = "fernando_chat_v1";
const LS_SESSAO = "fernando_sessao_v1";
const MAX_HISTORICO = 12;
// Ponte local (fernando_ponte.py): responde pela assinatura do Miguel, sem API.
const PONTE = "http://127.0.0.1:8787";

// Fernando real (agente do Claude Code) pela ponte: sessão contínua, só leitura + comandos de leitura do Fred.
async function viaPonte(mensagem: string, sessao: string, primeira: boolean): Promise<{ text: string; atividades: Msg["atividades"] } | null> {
  try {
    const res = await fetch(`${PONTE}/fernando`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem, sessao, primeira }),
      signal: AbortSignal.timeout(300000),
    });
    const data = (await res.json()) as { text?: string; atividades?: Msg["atividades"]; erro?: string };
    if (!res.ok || !data.text) throw new Error(data.erro ?? `HTTP ${res.status}`);
    return { text: data.text, atividades: data.atividades };
  } catch (e) {
    // Ponte desligada (falha de rede): cai para a API. Erro da própria ponte é mostrado.
    if (e instanceof TypeError) return null;
    throw e;
  }
}

export default function FernandoChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [chaveInput, setChaveInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      setApiKey(localStorage.getItem(LS_KEY));
      setMsgs(JSON.parse(localStorage.getItem(LS_CHAT) ?? "[]") as Msg[]);
    } catch { /* sem localStorage: segue sem histórico */ }
  }, []);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const gravar = (next: Msg[]) => {
    setMsgs(next);
    try { localStorage.setItem(LS_CHAT, JSON.stringify(next.slice(-60))); } catch { /* ignora */ }
  };

  const salvarChave = () => {
    const k = chaveInput.trim();
    if (!k) return;
    try { localStorage.setItem(LS_KEY, k); } catch { /* ignora */ }
    setApiKey(k);
    setChaveInput("");
  };

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || busy) return;
    setErro(null);
    setInput("");
    setBusy(true);
    const historico = msgs.slice(-MAX_HISTORICO);
    const base: Msg[] = [...msgs, { de: "gestor", texto }];
    gravar([...base, { de: "fernando", texto: "" }]);

    const task = [
      "CONVERSA DIRETA COM O MIGUEL (dono da AWQ). Responda à última mensagem de forma direta e curta.",
      historico.length ? "HISTÓRICO:\n" + historico.map((m) => `${m.de === "gestor" ? "Miguel" : "Você"}: ${m.texto}`).join("\n") : "",
      `NOVA MENSAGEM DO MIGUEL:\n${texto}`,
    ].filter(Boolean).join("\n\n");

    try {
      let sessao = "";
      try { sessao = localStorage.getItem(LS_SESSAO) ?? ""; } catch { /* ignora */ }
      const primeira = !sessao;
      if (primeira) {
        sessao = crypto.randomUUID();
        try { localStorage.setItem(LS_SESSAO, sessao); } catch { /* ignora */ }
      }
      const gratis = await viaPonte(texto, sessao, primeira);
      if (gratis !== null) {
        gravar([...base, { de: "fernando", texto: gratis.text, atividades: gratis.atividades }]);
        return;
      }
      if (!apiKey) {
        setErro("Ponte local desligada. Rode `python3 ~/awq-fred/fernando_ponte.py` para conversar de graça, ou cole a chave da Anthropic acima.");
        gravar(base);
        return;
      }
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-anthropic-key": apiKey as string },
        body: JSON.stringify({ agentId: "fernando", task }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let resposta = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const linhas = buf.split("\n");
        buf = linhas.pop() ?? "";
        for (const l of linhas) {
          if (!l.startsWith("data: ")) continue;
          const d = l.slice(6).trim();
          if (!d || d === "[DONE]") continue;
          const p = JSON.parse(d) as { text?: string; error?: string };
          if (p.error) throw new Error(p.error);
          if (p.text) {
            resposta += (resposta ? " " : "") + p.text;
            setMsgs([...base, { de: "fernando", texto: resposta }]);
          }
        }
      }
      gravar([...base, { de: "fernando", texto: resposta || "(sem resposta)" }]);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Falha na conversa.";
      if (m.includes("API_KEY_REQUIRED")) setApiKey(null);
      setErro(m === "API_KEY_REQUIRED" ? "Falta a chave da Anthropic." : m);
      gravar(base);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl flex flex-col gap-4">
      {!apiKey && (
        <div className="flex gap-2">
          <input
            type="password"
            value={chaveInput}
            onChange={(e) => setChaveInput(e.target.value)}
            placeholder="Opcional: chave da Anthropic (só usada se a ponte grátis estiver desligada)"
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <button onClick={salvarChave} className="px-4 py-2 rounded bg-gray-900 text-white text-sm">Salvar</button>
        </div>
      )}

      <div className="border rounded-lg bg-white p-4 h-[60vh] overflow-y-auto flex flex-col gap-3">
        {msgs.length === 0 && <p className="text-sm text-gray-500">Fale com o Fernando. Ele recomenda e prepara; decisões A3+ e ações externas continuam com você.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.de === "gestor" ? "self-end max-w-[85%] bg-gray-900 text-white rounded-lg px-3 py-2 text-sm whitespace-pre-wrap" : "self-start max-w-[85%] bg-gray-100 rounded-lg px-3 py-2 text-sm"}>
            {m.de === "gestor" ? m.texto : m.texto ? <><MiniMarkdown source={m.texto} />{m.atividades?.length ? <div className="mt-2 pt-2 border-t text-[11px] text-gray-500">{m.atividades.map((a, j) => <div key={j} className="truncate">• {a.tool}: {a.entrada}</div>)}</div> : null}</> : <span className="text-gray-500">Fernando está pensando…</span>}
          </div>
        ))}
        <div ref={fim} />
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); } }}
          rows={2}
          placeholder="Escreva para o Fernando (Enter envia, Shift+Enter quebra linha)"
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button onClick={() => void enviar()} disabled={busy || !input.trim()} className="px-4 rounded bg-gray-900 text-white text-sm disabled:opacity-40">Enviar</button>
      </div>
    </div>
  );
}
