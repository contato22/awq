"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, FileText, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import {
  atorNoPonto, criarMundo, desenhar, ESCALA, H, humorDe, moverGestor, passo, TEMAS, tileDoPonto, W,
  type Agente, type Estado, type Humor, type Mundo, type Papel,
} from "@/lib/office-iso";

/**
 * Escritório isométrico do Office, estilo The Sims: os agentes andam, sentam e
 * conversam com o ambiente. Você controla o avatar do gestor clicando no chão e
 * clica em um agente para ver as "necessidades" dele (métricas reais) e agir.
 */

export interface MetricaAgente {
  execs: number;
  formato: number | null;
  alta: number;
  media: number;
  ms: number;
}

interface Props {
  estados: Record<Agente, Estado>;
  aguardandoGestor: boolean;
  selecionado: Agente;
  onSelecionar: (a: Agente) => void;
  onConversar: () => void;
  onRelatorio?: () => void;
  metricas: Record<Agente, MetricaAgente>;
  /** Índice da sala (define as cores do cenário). */
  tema: number;
  nomeSala: string;
  descricao: string;
}

const ROTULO: Record<Agente, { nome: string; papel: string }> = {
  cs: { nome: "Headcount/CS", papel: "Orquestra a conta e fala com você" },
  ref: { nome: "Referências e Inteligência", papel: "Pesquisa, tendências e briefings" },
  criativo: { nome: "Criativo e Editor", papel: "Peças, roteiros e legendas" },
  midia: { nome: "Mídia e Publicação", papel: "Calendário, publicação e mídia" },
};

const ESTADO_TXT: Record<Estado, string> = {
  idle: "Ocioso",
  working: "Trabalhando",
  done: "Entregou",
  error: "Com problema",
};

function horaBrasilia(): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(new Date());
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? 12) % 24;
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

function periodo(h: number): { rotulo: string; Icone: React.ElementType } {
  if (h >= 5 && h < 8) return { rotulo: "Amanhecer", Icone: Sunrise };
  if (h >= 8 && h < 17) return { rotulo: "Dia", Icone: Sun };
  if (h >= 17 && h < 19.5) return { rotulo: "Fim de tarde", Icone: Sunset };
  return { rotulo: "Noite", Icone: Moon };
}

export function necessidades(m: MetricaAgente) {
  const conformidade = 1 - Math.min(1, (m.alta * 0.5 + m.media * 0.15) / Math.max(1, m.execs));
  return [
    { chave: "Formato", valor: m.formato, dica: "Campos obrigatórios presentes nas entregas" },
    { chave: "Conformidade", valor: m.execs ? conformidade : null, dica: "Sem afirmar o que não fez, sem inventar números" },
    { chave: "Ritmo", valor: m.execs ? Math.max(0, Math.min(1, 1 - m.ms / 60000)) : null, dica: "Tempo médio de resposta" },
    { chave: "Experiência", valor: Math.min(1, m.execs / 10), dica: "Execuções registradas nesta sala" },
  ];
}

function corBarra(v: number): string {
  return v >= 0.75 ? "bg-emerald-500" : v >= 0.45 ? "bg-amber-400" : "bg-red-500";
}

export default function IsoOffice({
  estados, aguardandoGestor, selecionado, onSelecionar, onConversar, onRelatorio, metricas, tema, nomeSala, descricao,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mundoRef = useRef<Mundo | null>(null);
  const dados = useRef({ estados, aguardandoGestor, selecionado, metricas, tema });
  dados.current = { estados, aguardandoGestor, selecionado, metricas, tema };
  const [reduzido, setReduzido] = useState(false);
  const [hora, setHora] = useState(12);
  const horaRef = useRef(12);
  const [cursor, setCursor] = useState<"default" | "pointer">("default");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzido(mq.matches);
    const onChange = () => setReduzido(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const atualizar = () => { const h = horaBrasilia(); horaRef.current = h; setHora(h); };
    atualizar();
    const id = window.setInterval(atualizar, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const mundo = criarMundo(reduzido);
    mundoRef.current = mundo;
    let ultimo = performance.now();
    let acumulado = 0;
    let quadro = 0;
    let raf = 0;

    const loop = (agora: number) => {
      const dt = Math.min(0.1, (agora - ultimo) / 1000);
      ultimo = agora;
      acumulado += dt;
      const d = dados.current;
      passo(mundo, dt, d.estados);
      mundo.selecionado = d.selecionado;
      if (acumulado >= 0.14) { acumulado = 0; quadro += 1; }
      const humor = {} as Record<Agente, Humor>;
      (Object.keys(d.metricas) as Agente[]).forEach((a) => {
        const k = d.metricas[a];
        humor[a] = humorDe(k.alta, k.media, k.execs, k.formato);
      });
      desenhar(ctx, mundo, {
        tema: TEMAS[d.tema % TEMAS.length], hora: horaRef.current, estados: d.estados,
        aguardandoGestor: d.aguardandoGestor, humor,
      }, quadro);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduzido]);

  const ponto = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }, []);

  const mover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const m = mundoRef.current;
    if (!m) return;
    const { x, y } = ponto(e);
    const a = atorNoPonto(m, x, y);
    m.hover = a;
    setCursor(a || tileDoPonto(x, y) ? "pointer" : "default");
  };

  const clicar = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const m = mundoRef.current;
    if (!m) return;
    const { x, y } = ponto(e);
    const a = atorNoPonto(m, x, y);
    if (a && a !== "gestor") { onSelecionar(a as Agente); return; }
    if (a === "gestor") return;
    const t = tileDoPonto(x, y);
    if (t) moverGestor(m, t);
  };

  const k = metricas[selecionado];
  const humor = humorDe(k.alta, k.media, k.execs, k.formato);
  const per = periodo(hora);
  const hh = String(Math.floor(hora)).padStart(2, "0");
  const mm = String(Math.floor((hora % 1) * 60)).padStart(2, "0");

  return (
    <div className="space-y-3">
      <div className="relative mx-auto" style={{ maxWidth: 960 }}>
        <canvas
          ref={canvasRef}
          width={W * ESCALA}
          height={H * ESCALA}
          onMouseMove={mover}
          onMouseLeave={() => { if (mundoRef.current) mundoRef.current.hover = null; setCursor("default"); }}
          onClick={clicar}
          role="img"
          aria-label={descricao}
          className="w-full rounded-xl border border-gray-200"
          style={{ imageRendering: "pixelated", display: "block", background: "#0b1220", cursor }}
        />
        <div className="absolute top-2 left-2 rounded-lg bg-black/55 text-white text-xs px-2.5 py-1 font-semibold">
          {nomeSala}
        </div>
        <div className="absolute top-2 right-2 rounded-lg bg-black/55 text-white text-xs px-2.5 py-1 flex items-center gap-1.5 font-medium">
          <per.Icone size={13} /> {per.rotulo} · {hh}:{mm} BRT
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap items-center gap-4 mx-auto" style={{ maxWidth: 960 }}>
        <div className="flex items-center gap-3 min-w-[200px]">
          <span
            className={`w-3.5 h-5 rotate-45 rounded-sm ${humor === "critico" ? "bg-red-500" : humor === "atencao" ? "bg-yellow-400" : "bg-emerald-400"}`}
            aria-hidden
          />
          <div>
            <div className="text-sm font-semibold text-gray-800">{ROTULO[selecionado].nome}</div>
            <div className="text-[11px] text-gray-400">{ROTULO[selecionado].papel}</div>
            <div className="text-[11px] text-gray-600 mt-0.5">
              {ESTADO_TXT[estados[selecionado]]} · humor {humor === "ok" ? "bom" : humor === "atencao" ? "atenção" : "crítico"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 flex-1 min-w-[260px]">
          {necessidades(k).map((n) => (
            <div key={n.chave} title={n.dica}>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>{n.chave}</span>
                <span>{n.valor === null ? "sem dado" : `${Math.round(n.valor * 100)}%`}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full ${n.valor === null ? "bg-gray-200" : corBarra(n.valor)}`} style={{ width: `${Math.round((n.valor ?? 0) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onConversar}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium">
            <MessageSquare size={13} /> Conversar
          </button>
          {onRelatorio && (
            <button onClick={onRelatorio}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium">
              <FileText size={13} /> Relatório
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 text-center">
        Clique em um agente para ver as necessidades dele. Clique no chão para mover o gestor. Quando você pede algo ao CS, ele caminha até a mesa de quem vai trabalhar. Nos horários de noite as telas acesas iluminam a sala.
      </p>
    </div>
  );
}
