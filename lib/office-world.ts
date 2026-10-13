/**
 * Mapa do mundo do Office: cada cliente é um prédio em um bairro isométrico.
 * Pré-renderiza o terreno (grama, ruas, praça) e redesenha a cada quadro prédios,
 * carros, pedestres, luzes e indicadores de atividade. Sem React e sem imagens.
 */

import {
  aleat, ceu, ESCALA, losango, losangoEsc, luzDoDia, mistura, OUT, ret, sombreia, TEMAS, disco,
} from "./office-iso";

export const WW = 640;
export const WH = 336;
const WOX = 288;
const WOY = 62;
const GWm = 16;
const GHm = 12;

export type TipoPredio = "escritorio" | "clinica" | "escola" | "lab";

export interface Empresa {
  bu: string;
  nome: string;
  slug: string;
  tema: number;
  agentes: number;
  execs: number;
  /** Alertas altos nas execuções registradas. */
  alta: number;
  /** Agentes trabalhando agora. */
  trabalhando: number;
  relatorio: boolean;
}

export interface PredioW {
  empresa: Empresa;
  x: number;
  y: number;
  w: number;
  h: number;
  tipo: TipoPredio;
  alt: number;
}

const SLOTS = [
  { x: 1, y: 0 }, { x: 10, y: 0 }, { x: 1, y: 7 }, { x: 10, y: 7 }, { x: 4, y: 0 }, { x: 4, y: 7 },
];

function tipoDe(slug: string): TipoPredio {
  if (slug.includes("tatiana")) return "clinica";
  if (slug.includes("cem")) return "escola";
  if (slug.includes("teste")) return "lab";
  return "escritorio";
}

const ALTURA: Record<TipoPredio, number> = { escritorio: 40, clinica: 22, escola: 18, lab: 26 };

export function layoutPredios(empresas: Empresa[]): PredioW[] {
  const ordem = [0, 1, 2, 3, 4, 5];
  return empresas.slice(0, 6).map((e, i) => {
    const s = SLOTS[ordem[i]];
    const tipo = tipoDe(e.slug);
    return { empresa: e, x: s.x, y: s.y, w: 3, h: 3, tipo, alt: ALTURA[tipo] };
  });
}

const iw = (gx: number, gy: number) => ({ x: WOX + (gx - gy) * 16, y: WOY + (gx + gy) * 8 });

export function centroDoPredio(p: PredioW): { x: number; y: number } {
  const c = iw(p.x + p.w / 2, p.y + p.h / 2);
  return { x: c.x, y: c.y - p.alt / 2 };
}

function noPoligono(px: number, py: number, pts: { x: number; y: number }[]): boolean {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

export function predioNoPonto(predios: PredioW[], x: number, y: number): PredioW | null {
  let melhor: PredioW | null = null;
  let prof = -1;
  for (const p of predios) {
    const t = iw(p.x, p.y), r = iw(p.x + p.w, p.y), b = iw(p.x + p.w, p.y + p.h), l = iw(p.x, p.y + p.h);
    const poly = [
      { x: t.x, y: t.y - p.alt }, { x: r.x, y: r.y - p.alt }, { x: r.x, y: r.y }, { x: b.x, y: b.y }, { x: l.x, y: l.y }, { x: l.x, y: l.y - p.alt },
    ];
    if (noPoligono(x, y, poly)) {
      const d = p.x + p.w + p.y + p.h;
      if (d > prof) { prof = d; melhor = p; }
    }
  }
  return melhor;
}

// ── Terreno (em cache) ─────────────────────────────────────────────────────────

const estrada = (gx: number, gy: number) => gy === 5 || gy === 6 || gx === 7 || gx === 8;

function terreno(c: CanvasRenderingContext2D) {
  for (let gy = 0; gy < GHm; gy++) {
    for (let gx = 0; gx < GWm; gx++) {
      const p = iw(gx, gy);
      const rua = estrada(gx, gy);
      const praca = gx >= 7 && gx <= 8 && gy >= 5 && gy <= 6;
      const calcada = !rua && (gy === 4 || gy === 7 || gx === 6 || gx === 9);
      let cor: string;
      if (praca) cor = (gx + gy) % 2 ? "#e7dcc2" : "#dccfae";
      else if (rua) cor = (gx + gy) % 2 ? "#4b5563" : "#454f5c";
      else if (calcada) cor = (gx + gy) % 2 ? "#cdd5e0" : "#c2cad6";
      else cor = (gx + gy) % 2 ? "#58a868" : "#4f9d5f";
      losango(c, p.x, p.y, cor);
      if (!rua && !calcada && !praca) {
        for (let k = 0; k < 4; k++) {
          ret(c, p.x + (aleat(gx, gy, k) - 0.5) * 20, p.y + 8 + (aleat(gy, gx, k + 5) - 0.5) * 7, 0.5, 0.5, sombreia(cor, aleat(gx, gy, k + 9) > 0.5 ? 0.12 : -0.12));
        }
      }
      for (let i = 0; i < 32; i++) {
        c.fillStyle = "rgba(0,0,0,0.06)";
        c.fillRect(p.x - 16 + i * 0.5, p.y + 8 + i * 0.25, 0.5, 0.5);
        c.fillRect(p.x + i * 0.5, p.y + 16 - i * 0.25, 0.5, 0.5);
      }
    }
  }
  // faixa central das ruas
  for (let i = 0; i < GWm * 32; i++) {
    if (i % 16 < 8) { const q = iw(i / 32, 6); ret(c, q.x, q.y, 1, 0.5, "#f1f5f9"); }
  }
  for (let i = 0; i < GHm * 32; i++) {
    if (i % 16 < 8) { const q = iw(8, i / 32); ret(c, q.x, q.y, 1, 0.5, "#f1f5f9"); }
  }
  // faixas de pedestre
  for (const [gx, gy, ao] of [[6, 5, "x"], [9, 5, "x"], [7, 4, "y"], [7, 7, "y"]] as const) {
    for (let k = 0; k < 4; k++) {
      const q = ao === "x" ? iw(gx + 0.5, gy + k * 0.5) : iw(gx + k * 0.5, gy + 0.5);
      ret(c, q.x - 1, q.y, 2, 0.5, "rgba(248,250,252,0.85)");
    }
  }
  // espessura da ilha
  const x0 = WOX - GHm * 16;
  for (let i = 0; i < GWm * 32; i++) {
    const yy = WOY + GHm * 8 + i * 0.25;
    ret(c, x0 + i * 0.5, yy, 0.5, 2.5, "#8b6b45"); ret(c, x0 + i * 0.5, yy + 2.5, 0.5, 4, "#6b4f31");
  }
  const x1 = WOX + (GWm - GHm) * 16;
  for (let i = 0; i < GHm * 32; i++) {
    const yy = WOY + (GWm + GHm) * 8 - i * 0.25;
    ret(c, x1 + i * 0.5, yy, 0.5, 2.5, "#6b4f31"); ret(c, x1 + i * 0.5, yy + 2.5, 0.5, 4, "#4d3922");
  }
}

let cacheTerreno: HTMLCanvasElement | null = null;

function fundo(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (!cacheTerreno) {
    const cv = document.createElement("canvas");
    cv.width = WW * ESCALA;
    cv.height = WH * ESCALA;
    const g = cv.getContext("2d");
    if (!g) return null;
    g.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
    g.imageSmoothingEnabled = false;
    terreno(g);
    cacheTerreno = cv;
  }
  return cacheTerreno;
}

// ── Prédios ────────────────────────────────────────────────────────────────────

interface Cores { topo: string; esq: string; dir: string }

function bloco(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, alt: number, z: number, cor: Cores) {
  const base = iw(x0, y0 + h);
  for (let i = 0; i < w * 32; i++) {
    const x = base.x + i * 0.5;
    const yb = base.y + i * 0.25 - z;
    ret(c, x, yb - alt, 0.5, alt, cor.esq);
    ret(c, x, yb - Math.min(alt, 3), 0.5, Math.min(alt, 3), sombreia(cor.esq, -0.16));
  }
  const q = iw(x0 + w, y0 + h);
  for (let i = 0; i < h * 32; i++) {
    const x = q.x + i * 0.5;
    const yb = q.y - i * 0.25 - z;
    ret(c, x, yb - alt, 0.5, alt, cor.dir);
    ret(c, x, yb - Math.min(alt, 3), 0.5, Math.min(alt, 3), sombreia(cor.dir, -0.13));
  }
  for (let gy = y0; gy < y0 + h; gy++) for (let gx = x0; gx < x0 + w; gx++) {
    const p = iw(gx, gy);
    losango(c, p.x, p.y - alt - z, cor.topo);
  }
  // realce das arestas
  const t = iw(x0, y0), r = iw(x0 + w, y0), l = iw(x0, y0 + h), b2 = iw(x0 + w, y0 + h);
  for (let i = 0; i < w * 32; i++) ret(c, l.x + i * 0.5, l.y + i * 0.25 - alt - z, 0.5, 0.5, sombreia(cor.topo, 0.35));
  for (let i = 0; i < h * 32; i++) ret(c, b2.x + i * 0.5, b2.y - i * 0.25 - alt - z, 0.5, 0.5, sombreia(cor.topo, 0.3));
  ret(c, l.x, l.y - alt - z, 0.5, alt, sombreia(cor.esq, -0.3));
  ret(c, b2.x - 0.5, b2.y - alt - z, 1, alt, sombreia(cor.esq, -0.35));
  ret(c, r.x + 15.5 - 16 + 0, r.y - alt - z, 0.5, 0.5, sombreia(cor.topo, 0.3));
  void t;
}

function janelas(
  c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, alt: number, z: number,
  acesas: (k: number) => boolean, cor: string, linhas: number, margem = 5
) {
  const base = iw(x0, y0 + h);
  for (let i = 0; i < w * 32; i++) {
    if (i % 12 < 3 || i % 12 > 8 || i < 4 || i > w * 32 - 5) continue;
    const yb = base.y + i * 0.25 - z;
    for (let j = 0; j < linhas; j++) {
      const k = Math.floor(i / 12) * 7 + j;
      ret(c, base.x + i * 0.5, yb - alt + margem + j * ((alt - margem - 7) / Math.max(1, linhas)), 0.5, 3.5, acesas(k) ? "#fde68a" : cor);
    }
  }
  const q = iw(x0 + w, y0 + h);
  for (let i = 0; i < h * 32; i++) {
    if (i % 12 < 3 || i % 12 > 8 || i < 4 || i > h * 32 - 5) continue;
    const yb = q.y - i * 0.25 - z;
    for (let j = 0; j < linhas; j++) {
      const k = Math.floor(i / 12) * 11 + j + 3;
      ret(c, q.x + i * 0.5, yb - alt + margem + j * ((alt - margem - 7) / Math.max(1, linhas)), 0.5, 3.5, acesas(k) ? "#fde68a" : sombreia(cor, -0.12));
    }
  }
}

function porta(c: CanvasRenderingContext2D, p: PredioW, corToldo: string) {
  const base = iw(p.x, p.y + p.h);
  const meio = Math.floor(p.w * 32 * 0.5);
  for (let i = meio - 5; i < meio + 5; i++) {
    const yb = base.y + i * 0.25;
    ret(c, base.x + i * 0.5, yb - 8, 0.5, 8, "#3b2a1b");
    ret(c, base.x + i * 0.5, yb - 8, 0.5, 0.5, "#6b4a2a");
    ret(c, base.x + i * 0.5, yb - 10, 0.5, 2, corToldo);
  }
}

function desenharPredio(c: CanvasRenderingContext2D, p: PredioW, op: OpcoesMundo) {
  const tema = TEMAS[p.empresa.tema % TEMAS.length];
  const noite = luzDoDia(op.hora) < 0.45;
  const ativo = p.empresa.trabalhando > 0;
  const aces = (k: number) => noite ? aleat(k, p.x, p.y) > 0.35 : ativo && aleat(k, p.x, p.y + 3) > 0.7;
  const destaque = op.hover === p.empresa.bu || op.selecionado === p.empresa.bu;
  const claro = destaque ? 0.1 : 0;

  // sombra
  for (let gy = p.y; gy < p.y + p.h; gy++) for (let gx = p.x; gx < p.x + p.w; gx++) {
    const q = iw(gx, gy);
    losango(c, q.x + 5, q.y + 2.5, "rgba(8,14,28,0.18)");
  }

  if (p.tipo === "escritorio") {
    const cor: Cores = { topo: sombreia(tema.paredeD, 0.38 + claro), esq: sombreia(tema.paredeE, 0.18 + claro), dir: sombreia(tema.paredeD, 0.08 + claro) };
    bloco(c, p.x, p.y, p.w, p.h, p.alt, 0, cor);
    janelas(c, p.x, p.y, p.w, p.h, p.alt, 0, aces, "#8fb6df", 5);
    porta(c, p, tema.rodape);
    const t = iw(p.x + 1, p.y + 1);
    bloco(c, p.x + 1, p.y + 1, 1, 1, 6, p.alt, { topo: "#94a3b8", esq: "#64748b", dir: "#7b8798" });
    ret(c, t.x + 0.5, t.y - p.alt - 20, 0.5, 14, "#94a3b8");
    ret(c, t.x, t.y - p.alt - 21, 1.5, 1.5, op.quadro % 8 < 4 ? "#ef4444" : "#7f1d1d");
  } else if (p.tipo === "clinica") {
    const cor: Cores = { topo: "#f8fafc", esq: sombreia("#dbe7f0", claro), dir: sombreia("#eaf2f8", claro) };
    bloco(c, p.x, p.y, p.w, p.h, p.alt, 0, cor);
    janelas(c, p.x, p.y, p.w, p.h, p.alt, 0, aces, "#7ec8d9", 2);
    porta(c, p, "#16a34a");
    bloco(c, p.x + 1, p.y + 1, 1, 1, 7, p.alt, { topo: "#e2e8f0", esq: "#b8c6d4", dir: "#cbd7e2" });
    const t = iw(p.x + 1.5, p.y + 1.5);
    ret(c, t.x - 5, t.y - p.alt - 25, 10, 10, OUT); ret(c, t.x - 4.5, t.y - p.alt - 24.5, 9, 9, "#ffffff");
    ret(c, t.x - 1, t.y - p.alt - 24, 2, 8, "#ef4444"); ret(c, t.x - 3.5, t.y - p.alt - 21, 7, 2, "#ef4444");
    ret(c, t.x - 0.5, t.y - p.alt - 15, 1, 8, "#94a3b8");
  } else if (p.tipo === "escola") {
    const cor: Cores = { topo: "#a85a3d", esq: sombreia("#b86a4a", claro), dir: sombreia("#cf8460", claro) };
    bloco(c, p.x, p.y, p.w, p.h, p.alt, 0, cor);
    janelas(c, p.x, p.y, p.w, p.h, p.alt, 0, aces, "#a9cbe8", 2, 4);
    porta(c, p, "#2563eb");
    bloco(c, p.x + 2, p.y + 2, 1, 1, 22, p.alt, { topo: "#7a3f28", esq: "#c97654", dir: "#dd8f69" });
    const t = iw(p.x + 2.5, p.y + 2.5);
    disco(c, t.x - 3, t.y - p.alt - 18, 3.5, OUT); disco(c, t.x - 3, t.y - p.alt - 18, 3, "#f8fafc");
    ret(c, t.x - 3.25, t.y - p.alt - 20, 0.5, 2, "#0f172a"); ret(c, t.x - 3.25, t.y - p.alt - 18.25, 2, 0.5, "#0f172a");
    ret(c, t.x - 0.25, t.y - p.alt - 38, 0.5, 14, "#e2e8f0");
    const onda = Math.sin(op.t * 3) * 0.5;
    ret(c, t.x + 0.25, t.y - p.alt - 38, 6, 3, "#22c55e"); ret(c, t.x + 1.5 + onda, t.y - p.alt - 37, 3, 1, "#facc15");
  } else {
    const cor: Cores = { topo: "#d6f1f4", esq: sombreia("#5fb3c4", claro), dir: sombreia("#7ccbd9", claro) };
    bloco(c, p.x, p.y, p.w, p.h, p.alt, 0, cor);
    janelas(c, p.x, p.y, p.w, p.h, p.alt, 0, aces, "#bfeaf2", 3);
    porta(c, p, "#0e7490");
    const t = iw(p.x + 1.5, p.y + 1.5);
    disco(c, t.x, t.y - p.alt - 4, 4.5, OUT); disco(c, t.x, t.y - p.alt - 4, 4, "#e5e7eb");
    ret(c, t.x - 0.5, t.y - p.alt - 4, 1, 4, "#94a3b8");
    ret(c, t.x + 4, t.y - p.alt - 14, 0.5, 10, "#94a3b8");
    ret(c, t.x + 3.5, t.y - p.alt - 15, 1.5, 1.5, op.quadro % 6 < 3 ? "#22c55e" : "#14532d");
  }

  if (destaque) {
    const t = iw(p.x, p.y), r = iw(p.x + p.w, p.y), b = iw(p.x + p.w, p.y + p.h), l = iw(p.x, p.y + p.h);
    c.fillStyle = "rgba(251,191,36,0.95)";
    for (let i = 0; i < p.w * 32; i++) c.fillRect(t.x + i * 0.5, t.y + i * 0.25, 0.5, 0.5), c.fillRect(l.x + i * 0.5, l.y + i * 0.25, 0.5, 0.5);
    for (let i = 0; i < p.h * 32; i++) c.fillRect(t.x - i * 0.5, t.y + i * 0.25, 0.5, 0.5), c.fillRect(r.x - i * 0.5, r.y + i * 0.25, 0.5, 0.5);
    void b;
  }
}

function rotulo(c: CanvasRenderingContext2D, p: PredioW, op: OpcoesMundo) {
  const topo = iw(p.x + p.w / 2, p.y + p.h / 2);
  const tema = TEMAS[p.empresa.tema % TEMAS.length];
  const nome = p.empresa.nome.toUpperCase();
  c.font = "bold 5.5px sans-serif";
  const w = Math.ceil(c.measureText(nome).width) + 10;
  const x = Math.round(topo.x - w / 2);
  const y = Math.round(topo.y - p.alt - (p.tipo === "escola" ? 46 : p.tipo === "escritorio" ? 34 : 34));
  const destaque = op.hover === p.empresa.bu || op.selecionado === p.empresa.bu;
  ret(c, x - 0.5, y - 0.5, w + 1, 10, OUT);
  ret(c, x, y, w, 9, destaque ? "#fbbf24" : tema.rodape);
  ret(c, x + 2, y + 3, 3, 3, destaque ? "#0f172a" : sombreia(tema.paredeD, 0.4));
  c.fillStyle = destaque ? "#0f172a" : "#f8fafc";
  c.textAlign = "left"; c.textBaseline = "middle";
  c.fillText(nome, x + 6.5, y + 4.8);
  ret(c, topo.x - 1, y + 9, 2, 3, OUT);

  // indicadores: agentes trabalhando, alertas, relatório
  const itens: { cor: string; txt: string }[] = [];
  itens.push({ cor: p.empresa.trabalhando > 0 ? "#22c55e" : "#64748b", txt: `${p.empresa.trabalhando}/${p.empresa.agentes}` });
  if (p.empresa.alta > 0) itens.push({ cor: "#ef4444", txt: `! ${p.empresa.alta}` });
  if (p.empresa.relatorio) itens.push({ cor: "#38bdf8", txt: "doc" });
  let xi = Math.round(topo.x - (itens.length * 17) / 2);
  const yi = y + 12;
  c.font = "bold 4.5px sans-serif";
  for (const it of itens) {
    ret(c, xi - 0.5, yi - 0.5, 16, 8, OUT);
    ret(c, xi, yi, 15, 7, "#0f172a");
    ret(c, xi + 1, yi + 2, 2, 3, it.cor);
    c.fillStyle = "#e2e8f0";
    c.fillText(it.txt, xi + 4, yi + 3.8);
    xi += 17;
  }
  if (p.empresa.trabalhando > 0 && !op.reduzido) {
    const pulso = 0.5 + 0.5 * Math.sin(op.t * 4);
    c.fillStyle = `rgba(34,197,94,${(0.25 + 0.25 * pulso).toFixed(2)})`;
    c.beginPath(); c.arc(topo.x, topo.y - p.alt - 6, 10 + pulso * 3, 0, Math.PI * 2); c.fill();
  }
}

// ── Vida no bairro ─────────────────────────────────────────────────────────────

function arvore(c: CanvasRenderingContext2D, gx: number, gy: number, ton: number) {
  const q = iw(gx + 0.5, gy + 0.5);
  ret(c, q.x - 3.5, q.y - 1, 7, 1.5, "rgba(8,14,28,0.22)");
  ret(c, q.x - 0.75, q.y - 7, 1.5, 7, "#6b4423"); ret(c, q.x - 0.75, q.y - 7, 0.5, 7, "#8a5a2e");
  const verde = ["#2f8f4e", "#3aa35a", "#278046"][ton % 3];
  disco(c, q.x, q.y - 12, 5.5, OUT); disco(c, q.x, q.y - 12, 5, verde);
  disco(c, q.x - 1.5, q.y - 13.5, 2.5, sombreia(verde, 0.25));
}

function carro(c: CanvasRenderingContext2D, x: number, y: number, cor: string, dirX: boolean) {
  ret(c, x - 6, y - 1, 12, 2, "rgba(8,14,28,0.25)");
  ret(c, x - 5.5, y - 4.5, 11, 4.5, OUT); ret(c, x - 5, y - 4, 10, 3.5, cor);
  ret(c, x - 3, y - 7, 6, 3, OUT); ret(c, x - 2.5, y - 6.5, 5, 2.5, sombreia(cor, 0.15));
  ret(c, x - 2, y - 6, dirX ? 1.5 : 1, 1.5, "#bfe7ff"); ret(c, x + 0.5, y - 6, dirX ? 1.5 : 1, 1.5, "#bfe7ff");
  ret(c, x - 4.5, y - 0.5, 2, 1, "#111827"); ret(c, x + 2.5, y - 0.5, 2, 1, "#111827");
}

function pedestre(c: CanvasRenderingContext2D, x: number, y: number, cor: string, passo: number) {
  ret(c, x - 2, y - 0.5, 4, 1, "rgba(8,14,28,0.22)");
  ret(c, x - 1.25, y - 3, 1, 3 - (passo ? 0.5 : 0), "#1e293b"); ret(c, x + 0.25, y - 3, 1, 3 - (passo ? 0 : 0.5), "#1e293b");
  ret(c, x - 1.75, y - 6.5, 3.5, 3.5, cor); ret(c, x - 1.25, y - 9, 2.5, 2.5, "#f1c9a5"); ret(c, x - 1.25, y - 9.5, 2.5, 1, "#3b2a1b");
}

function praca(c: CanvasRenderingContext2D, op: OpcoesMundo) {
  const q = iw(8, 6);
  disco(c, q.x, q.y + 1, 9, "rgba(8,14,28,0.2)");
  disco(c, q.x, q.y - 1, 8, "#94a3b8"); disco(c, q.x, q.y - 1.5, 7, "#7ccbe8");
  ret(c, q.x - 1, q.y - 9, 2, 8, "#cbd5e1");
  const f = Math.floor(op.t * 6) % 4;
  for (let i = 0; i < 4; i++) ret(c, q.x - 3 + i * 2 + (f % 2) * 0.5, q.y - 6 - ((f + i) % 3) * 0.5, 0.5, 2.5 - ((f + i) % 3) * 0.5, "#e0f2fe");
  c.font = "bold 4.5px sans-serif"; c.fillStyle = "rgba(15,23,42,0.75)"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("GRUPO AWQ", q.x, q.y + 6.5);
}

export interface OpcoesMundo {
  hora: number;
  hover: string | null;
  selecionado: string | null;
  quadro: number;
  t: number;
  reduzido: boolean;
}

export function desenharMundo(c: CanvasRenderingContext2D, predios: PredioW[], op: OpcoesMundo) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, WW * ESCALA, WH * ESCALA);
  c.imageSmoothingEnabled = false;
  const bg = fundo();
  if (bg) c.drawImage(bg, 0, 0);
  c.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
  if (!bg) terreno(c);

  const luz = luzDoDia(op.hora);
  const itens: { d: number; f: () => void }[] = [];
  const add = (d: number, f: () => void) => itens.push({ d, f });

  for (const p of predios) add(p.x + p.w + p.y + p.h, () => desenharPredio(c, p, op));
  add(14, () => praca(c, op));

  // árvores nas áreas livres (longe dos lotes)
  const reservado = (gx: number, gy: number) => SLOTS.some((s) => gx >= s.x - 0.5 && gx < s.x + 3.5 && gy >= s.y - 0.5 && gy < s.y + 3.5);
  let n = 0;
  for (let gy = 0; gy < GHm && n < 22; gy++) for (let gx = 0; gx < GWm && n < 22; gx++) {
    if (estrada(gx, gy) || reservado(gx, gy) || gy === 4 || gy === 7 || gx === 6 || gx === 9) continue;
    if (aleat(gx, gy, 77) > 0.55) { add(gx + gy + 0.4, () => arvore(c, gx, gy, gx + gy)); n++; }
  }

  // carros e pedestres
  if (!op.reduzido) {
    const cores = ["#ef4444", "#3b82f6", "#f59e0b", "#a855f7"];
    for (let i = 0; i < 3; i++) {
      const u = ((op.t * (0.08 + i * 0.015) + i * 0.33) % 1);
      const gx = u * (GWm + 2) - 1;
      const q = iw(gx, 5.5 + (i % 2) * 0.5);
      add(gx + 5.5 + 0.3, () => carro(c, q.x, q.y, cores[i], true));
    }
    for (let i = 0; i < 2; i++) {
      const u = ((op.t * (0.07 + i * 0.02) + 0.2 + i * 0.4) % 1);
      const gy = u * (GHm + 2) - 1;
      const q = iw(7.5 + (i % 2) * 0.5, gy);
      add(7.5 + gy + 0.3, () => carro(c, q.x, q.y, cores[(i + 2) % 4], false));
    }
    for (let i = 0; i < 6; i++) {
      const eixoX = i % 2 === 0;
      const u = 0.5 + 0.5 * Math.sin(op.t * (0.35 + i * 0.07) + i * 1.9);
      const along = 0.6 + u * (eixoX ? GWm - 1.2 : GHm - 1.2);
      const fixo = eixoX ? (i % 4 === 0 ? 4.5 : 7.5) : (i % 4 === 1 ? 6.5 : 9.5);
      const q = eixoX ? iw(along, fixo) : iw(fixo, along);
      add((eixoX ? along + fixo : fixo + along) + 0.2, () => pedestre(c, q.x, q.y, ["#f97316", "#06b6d4", "#e11d48", "#84cc16", "#8b5cf6", "#eab308"][i], Math.floor(op.t * 5 + i) % 2));
    }
  }

  itens.sort((a, b) => a.d - b.d);
  for (const it of itens) it.f();
  for (const p of predios) rotulo(c, p, op);

  const escuro = 1 - luz;
  if (escuro > 0.02) {
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = `rgba(6,12,38,${(0.5 * escuro).toFixed(3)})`;
    c.fillRect(0, 0, WW, WH);
    c.restore();
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const [gx, gy] of [[3, 4.5], [12, 4.5], [3, 7.5], [12, 7.5], [6.5, 1.5], [9.5, 10]] as const) {
      const q = iw(gx, gy);
      const g = c.createRadialGradient(q.x, q.y - 8, 1, q.x, q.y - 8, 20);
      g.addColorStop(0, `rgba(255,205,120,${(0.4 * escuro).toFixed(3)})`); g.addColorStop(1, "rgba(255,205,120,0)");
      c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y - 8, 20, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  void ceu; void losangoEsc;
}
