"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PapelAgente } from "@/lib/office-scenarios";

/**
 * Escritório em pixel art do Office. Desenhado em canvas com retângulos (resolução
 * lógica de 320x208, ampliada com image-rendering: pixelated), sem imagens externas.
 * Cada agente é um personagem na própria mesa; o gestor fica no topo.
 *
 * Estados: ocioso, trabalhando (digita, tela acesa, balão com reticências),
 * entregou (balão verde), erro (balão vermelho). Um envelope viaja do CS para o agente
 * que está trabalhando, ou do gestor para o CS. Clicar em uma mesa seleciona o agente.
 */

export type PixelStatus = "idle" | "working" | "done" | "error";
type Papel = PapelAgente | "gestor";

interface Props {
  status: Record<PapelAgente, PixelStatus>;
  /** O gestor tem uma decisão pendente (pacote aguardando aprovação). */
  aguardandoGestor: boolean;
  selecionado: PapelAgente;
  onSelecionar: (papel: PapelAgente) => void;
  /** Texto para leitores de tela. */
  descricao: string;
}

const W = 320;
const H = 208;

const MESAS: Record<Papel, { x: number; y: number; nome: string; corpo: string; cabelo: string }> = {
  gestor:   { x: 136, y: 58,  nome: "GESTOR",   corpo: "#334155", cabelo: "#1f2937" },
  cs:       { x: 136, y: 114, nome: "CS",       corpo: "#0487D9", cabelo: "#5b3a1e" },
  ref:      { x: 36,  y: 170, nome: "REFERÊNC.", corpo: "#0e7490", cabelo: "#111827" },
  criativo: { x: 136, y: 170, nome: "CRIATIVO", corpo: "#7c3aed", cabelo: "#b45309" },
  midia:    { x: 236, y: 170, nome: "MÍDIA",    corpo: "#059669", cabelo: "#374151" },
};

const PELE = "#f1c9a5";
const MESA_W = 48;

function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cor: string) {
  c.fillStyle = cor;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}

function cenario(c: CanvasRenderingContext2D) {
  // parede
  rect(c, 0, 0, W, 48, "#2b3a67");
  rect(c, 0, 44, W, 4, "#1f2a4d");
  // piso xadrez
  for (let y = 48; y < H; y += 16) {
    for (let x = 0; x < W; x += 16) {
      rect(c, x, y, 16, 16, ((x + y) / 16) % 2 === 0 ? "#cfd8e6" : "#c3cee0");
    }
  }
  // tapete
  rect(c, 96, 52, 128, 98, "#b4c0d8");
  rect(c, 98, 54, 124, 94, "#a9b7d2");
  // janelas
  for (const wx of [24, 256]) {
    rect(c, wx, 8, 40, 28, "#e2e8f0");
    rect(c, wx + 2, 10, 36, 24, "#7dd3fc");
    rect(c, wx + 19, 10, 2, 24, "#e2e8f0");
    rect(c, wx + 2, 21, 36, 2, "#e2e8f0");
    rect(c, wx + 6, 14, 8, 3, "#f0f9ff");
  }
  // quadro central
  rect(c, 136, 8, 48, 26, "#0f172a");
  rect(c, 138, 10, 44, 22, "#1e3a8a");
  rect(c, 146, 18, 28, 4, "#fbbf24");
  rect(c, 146, 25, 18, 2, "#93c5fd");
  // plantas
  for (const [px, py] of [[8, 176], [300, 176], [8, 60], [300, 60]] as const) {
    rect(c, px, py + 10, 12, 10, "#92400e");
    rect(c, px + 1, py + 10, 10, 2, "#b45309");
    rect(c, px + 1, py, 4, 10, "#16a34a");
    rect(c, px + 5, py - 4, 4, 14, "#22c55e");
    rect(c, px + 8, py + 1, 4, 9, "#15803d");
  }
}

function tela(c: CanvasRenderingContext2D, x: number, y: number, st: PixelStatus, f: number, ativo: boolean) {
  // moldura + base do monitor
  rect(c, x, y, 14, 11, "#0f172a");
  rect(c, x + 6, y + 11, 2, 2, "#475569");
  rect(c, x + 3, y + 13, 8, 1, "#475569");
  const base = st === "error" ? "#7f1d1d" : st === "done" ? "#14532d" : st === "working" ? "#0c4a6e" : "#111827";
  rect(c, x + 1, y + 1, 12, 8, base);
  if (st === "working") {
    const linhas = [8, 6, 9, 5];
    linhas.forEach((w, i) => {
      const ww = Math.max(2, ((w + f + i * 2) % 9) + 2);
      rect(c, x + 2, y + 2 + i * 2, Math.min(ww, 10), 1, i % 2 ? "#7dd3fc" : "#38bdf8");
    });
  } else if (st === "done") {
    rect(c, x + 4, y + 5, 2, 2, "#86efac");
    rect(c, x + 6, y + 6, 2, 2, "#86efac");
    rect(c, x + 8, y + 3, 2, 4, "#86efac");
  } else if (st === "error") {
    rect(c, x + 6, y + 2, 2, 4, "#fca5a5");
    rect(c, x + 6, y + 7, 2, 1, "#fca5a5");
  } else if (ativo && f % 8 < 4) {
    rect(c, x + 2, y + 2, 1, 2, "#64748b");
  }
}

function balao(c: CanvasRenderingContext2D, cx: number, y: number, tipo: "pontos" | "ok" | "erro" | "ask", f: number) {
  const w = 18;
  const x = Math.round(cx - w / 2);
  rect(c, x, y, w, 11, "#0f172a");
  rect(c, x + 1, y + 1, w - 2, 9, "#ffffff");
  rect(c, cx - 1, y + 11, 3, 2, "#0f172a");
  rect(c, cx, y + 10, 1, 2, "#ffffff");
  if (tipo === "pontos") {
    const n = (f % 3) + 1;
    for (let i = 0; i < 3; i++) rect(c, x + 4 + i * 4, y + 5, 2, 2, i < n ? "#0f172a" : "#cbd5e1");
  } else if (tipo === "ok") {
    rect(c, x + 5, y + 5, 2, 2, "#16a34a");
    rect(c, x + 7, y + 6, 2, 2, "#16a34a");
    rect(c, x + 9, y + 3, 2, 4, "#16a34a");
    rect(c, x + 11, y + 2, 2, 2, "#16a34a");
  } else if (tipo === "erro") {
    rect(c, x + 8, y + 2, 2, 5, "#dc2626");
    rect(c, x + 8, y + 8, 2, 1, "#dc2626");
  } else {
    rect(c, x + 7, y + 2, 4, 2, "#d97706");
    rect(c, x + 9, y + 4, 2, 2, "#d97706");
    rect(c, x + 8, y + 6, 2, 1, "#d97706");
    rect(c, x + 8, y + 8, 2, 1, "#d97706");
  }
}

function mesa(
  c: CanvasRenderingContext2D, papel: Papel, st: PixelStatus, f: number,
  opts: { selecionado: boolean; pergunta: boolean }
) {
  const { x, y, nome, corpo, cabelo } = MESAS[papel];
  const trabalhando = st === "working";
  const bracoE = trabalhando ? (f % 2 ? 0 : 2) : 0;
  const bracoD = trabalhando ? (f % 2 ? 2 : 0) : 0;
  const respira = !trabalhando && f % 16 < 2 ? 1 : 0;

  if (opts.selecionado) {
    rect(c, x - 5, y - 38, MESA_W + 10, 1, "#fbbf24");
    rect(c, x - 5, y + 21, MESA_W + 10, 1, "#fbbf24");
    rect(c, x - 5, y - 38, 1, 60, "#fbbf24");
    rect(c, x + MESA_W + 4, y - 38, 1, 60, "#fbbf24");
  }

  // cadeira + personagem (atrás da mesa)
  rect(c, x + 10, y - 8, 14, 12, "#334155");
  rect(c, x + 13, y - 18 + respira, 8, 8, PELE);
  rect(c, x + 12, y - 20 + respira, 10, 4, cabelo);
  rect(c, x + 12, y - 17 + respira, 2, 3, cabelo);
  rect(c, x + 15, y - 14 + respira, 1, 2, "#0f172a");
  rect(c, x + 19, y - 14 + respira, 1, 2, "#0f172a");
  rect(c, x + 11, y - 10 + respira, 12, 10, corpo);
  rect(c, x + 16, y - 10 + respira, 2, 3, "#ffffff");
  rect(c, x + 8, y - 8 + bracoE, 4, 7, corpo);
  rect(c, x + 22, y - 8 + bracoD, 4, 7, corpo);
  rect(c, x + 8, y - 1 + bracoE, 4, 2, PELE);
  rect(c, x + 22, y - 1 + bracoD, 4, 2, PELE);

  // mesa
  rect(c, x, y, MESA_W, 8, "#b98450");
  rect(c, x, y + 8, MESA_W, 6, "#8a5a2e");
  rect(c, x + 2, y + 14, 3, 5, "#6b4423");
  rect(c, x + MESA_W - 5, y + 14, 3, 5, "#6b4423");
  rect(c, x + 12, y + 2, 14, 3, "#94a3b8");
  rect(c, x + 13, y + 3, 12, 1, "#cbd5e1");
  tela(c, x + 31, y - 12, st, f, papel !== "gestor");
  if (papel === "gestor") {
    // documento do gestor
    rect(c, x + 3, y + 1, 7, 5, "#f8fafc");
    rect(c, x + 4, y + 2, 5, 1, "#94a3b8");
    rect(c, x + 4, y + 4, 4, 1, "#94a3b8");
  }

  // nome gravado na frente da mesa
  c.fillStyle = "#fde68a";
  c.font = "bold 6px monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(nome, x + MESA_W / 2, y + 11);

  // balões
  const cx = x + 17;
  if (opts.pergunta) balao(c, cx, y - 36, "ask", f);
  else if (st === "working") balao(c, cx, y - 36, "pontos", f);
  else if (st === "done") balao(c, cx, y - 36, "ok", f);
  else if (st === "error") balao(c, cx, y - 36, "erro", f);
}

function envelope(c: CanvasRenderingContext2D, de: Papel, para: Papel, f: number) {
  const a = MESAS[de];
  const b = MESAS[para];
  const t = (f % 20) / 19;
  const x = a.x + 20 + (b.x - a.x) * t;
  const y = a.y + 6 + (b.y - a.y) * t;
  rect(c, x, y, 9, 6, "#0f172a");
  rect(c, x + 1, y + 1, 7, 4, "#fefce8");
  rect(c, x + 2, y + 2, 5, 1, "#dc2626");
}

export default function PixelOffice({ status, aguardandoGestor, selecionado, onSelecionar, descricao }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [reduzido, setReduzido] = useState(false);
  const frame = useRef(0);
  const dados = useRef({ status, aguardandoGestor, selecionado });
  dados.current = { status, aguardandoGestor, selecionado };

  const desenhar = useCallback(() => {
    const canvas = ref.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    const f = frame.current;
    const { status: st, aguardandoGestor: espera, selecionado: sel } = dados.current;

    c.clearRect(0, 0, W, H);
    cenario(c);
    mesa(c, "gestor", "idle", f, { selecionado: false, pergunta: espera });
    mesa(c, "cs", st.cs, f, { selecionado: sel === "cs", pergunta: false });
    mesa(c, "ref", st.ref, f, { selecionado: sel === "ref", pergunta: false });
    mesa(c, "criativo", st.criativo, f, { selecionado: sel === "criativo", pergunta: false });
    mesa(c, "midia", st.midia, f, { selecionado: sel === "midia", pergunta: false });

    const ativos = (["ref", "criativo", "midia"] as const).filter((r) => st[r] === "working");
    if (ativos.length > 0) envelope(c, "cs", ativos[0], f);
    else if (st.cs === "working") envelope(c, "gestor", "cs", f);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzido(mq.matches);
    const onChange = () => setReduzido(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    desenhar();
    if (reduzido) return;
    const id = window.setInterval(() => {
      frame.current += 1;
      desenhar();
    }, 140);
    return () => window.clearInterval(id);
  }, [desenhar, reduzido]);

  // Redesenha quando os estados mudam, mesmo com animação reduzida
  useEffect(() => { desenhar(); }, [status, aguardandoGestor, selecionado, desenhar]);

  const clicar = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    for (const papel of ["cs", "ref", "criativo", "midia"] as const) {
      const m = MESAS[papel];
      if (x >= m.x - 6 && x <= m.x + MESA_W + 6 && y >= m.y - 38 && y <= m.y + 22) {
        onSelecionar(papel);
        return;
      }
    }
  };

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      onClick={clicar}
      role="img"
      aria-label={descricao}
      className="w-full rounded-xl border border-gray-200 cursor-pointer"
      style={{ imageRendering: "pixelated", maxWidth: 960, display: "block", margin: "0 auto", background: "#2b3a67" }}
    />
  );
}
