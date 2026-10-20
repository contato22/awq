/**
 * Planta do escritório da AWQ: o nível mais amplo do Office. Um só andar com
 * corredores e janelas, e cada cliente como um cluster em uma sala própria, com
 * paredes de vidro, as mesas da squad e os agentes dentro. Espaços sem cliente viram
 * áreas da casa (diretoria e lounge). Sem React e sem imagens: tudo é desenhado em código.
 */

import {
  aleat, bebedouro, cadeira, cafeteira, caixa, disco, ESCALA, LOOK, losango, losangoEsc, luzDoDia, mistura, monitor, OUT, parte,
  planta, ret, sombreia, TEMAS, ceu, type Agente, type Estado, type Papel,
} from "./office-iso";

export const WW = 640;
export const WH = 336;
const WOX = 280;
const WOY = 66;
const GWm = 18;
const GHm = 13;
const WALL = 44;

/** Andares do prédio: cada um é uma BU do grupo, com paleta própria. */
export type AndarId = "jacqes" | "awaqe" | "caza";

export interface Andar {
  id: AndarId;
  numero: number;
  nome: string;
  descricao: string;
}

export const ANDARES: Andar[] = [
  { id: "jacqes", numero: 1, nome: "JACQES", descricao: "BU que cuida dos clientes de social media" },
  { id: "awaqe", numero: 2, nome: "AWAQE", descricao: "BU AWAQE" },
  { id: "caza", numero: 3, nome: "Caza Vision", descricao: "Produtora" },
];

/**
 * BUs (nomes das squads) que ficam fora do 1º andar.
 * A Caza Vision, produtora, mora no 3º andar — o do Estúdio.
 */
export const ANDAR_DA_BU: Record<string, AndarId> = {
  "Caza Vision": "caza",
  Caza_Vision: "caza",
  CAZA: "caza",
};

const ANDAR_DA_BU_NORM: Record<string, AndarId> = Object.fromEntries(
  Object.entries(ANDAR_DA_BU).map(([k, v]) => [k.trim().toLowerCase(), v]),
);

export const andarDaEmpresa = (e: { bu: string; andar?: AndarId }): AndarId =>
  e.andar ?? ANDAR_DA_BU[e.bu] ?? ANDAR_DA_BU_NORM[e.bu.trim().toLowerCase()] ?? "jacqes";

export interface Empresa {
  bu: string;
  /** Andar do prédio (padrão: jacqes). */
  andar?: AndarId;
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
  /** Estado de cada agente (real para a sala atual, aproximado das execuções nas demais). */
  estados?: Record<Agente, Estado>;
}

/** Uma sala de cliente na planta. */
export interface PredioW {
  empresa: Empresa;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Altura das paredes (para o clique). */
  alt: number;
}

const SLOTS = [
  { x: 1, y: 1 }, { x: 7, y: 1 }, { x: 13, y: 1 }, { x: 1, y: 8 }, { x: 7, y: 8 }, { x: 13, y: 8 },
];
const LADO = 5;
const ALT_PAREDE = 26;
const ALT_VIDRO = 9;

// Sala 0 (fundo da planta, "o topo") é a do Miguel e a 5 é a de reuniões; clientes ocupam as 1 a 4.
const SLOTS_CLIENTES = [1, 2, 3, 4];

/** Mesma planta do mundo 2D, para o Modo 3D posicionar a diretoria e a sala de reuniões. */
export const SALAS_CASA = {
  lado: LADO,
  diretoria: SLOTS[0],
  reunioes: SLOTS[5],
} as const;

/** Sala do Estúdio no andar da Caza Vision (mesmo slot da sala de reuniões dos outros andares). */
export const SALA_ESTUDIO = {
  id: "estudio" as const,
  nome: "Estúdio",
  andar: "caza" as const,
  slot: SLOTS[5],
  lado: LADO,
  alt: ALT_PAREDE,
};

export type SalaCasaId = "diretoria" | "reunioes" | "estudio";

export function layoutPredios(empresas: Empresa[]): PredioW[] {
  return empresas.slice(0, SLOTS_CLIENTES.length).map((e, i) => {
    const sl = SLOTS[SLOTS_CLIENTES[i]];
    return { empresa: e, x: sl.x, y: sl.y, w: LADO, h: LADO, alt: ALT_PAREDE };
  });
}

const iw = (gx: number, gy: number) => ({ x: WOX + (gx - gy) * 16, y: WOY + (gx + gy) * 8 });

export function centroDoPredio(p: PredioW): { x: number; y: number } {
  const c = iw(p.x + p.w / 2, p.y + p.h / 2);
  return { x: c.x, y: c.y - 6 };
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

/** Centro da sala de reuniões (para a câmera). */
export function centroDaReuniao(): { x: number; y: number } {
  const sl = SLOTS[5];
  const c = iw(sl.x + LADO / 2, sl.y + LADO / 2);
  return { x: c.x, y: c.y - 6 };
}

/** Centro do Estúdio da Caza (mesmo slot, outro andar). */
export function centroDoEstudio(): { x: number; y: number } {
  return centroDaReuniao();
}

/** Centro da sala do Miguel (para a câmera). */
export function centroDaDiretoria(): { x: number; y: number } {
  const sl = SLOTS[0];
  const c = iw(sl.x + LADO / 2, sl.y + LADO / 2);
  return { x: c.x, y: c.y - 6 };
}

// cadeiras da sala de reuniões (relativas à sala): fundo, frente e a cabeceira do gestor
const ASSENTOS: [number, number][] = [[1.5, 1.5], [2.5, 1.5], [3.5, 1.5], [1.5, 3.5], [2.5, 3.5], [3.5, 3.5]];
const CABECEIRA: [number, number] = [4.5, 2.5];
const LOOKS: Papel[] = ["ref", "criativo", "midia", "ref", "criativo", "midia"];

/** Sala da casa sob o ponto. No andar da Caza o slot de reuniões é o Estúdio. */
export function casaNoPonto(x: number, y: number, andar: AndarId = "jacqes"): SalaCasaId | null {
  const salas: [number, SalaCasaId][] = [[0, "diretoria"], [5, andar === "caza" ? "estudio" : "reunioes"]];
  for (const [i, tipo] of salas) {
    const sl = SLOTS[i];
    const t = iw(sl.x, sl.y), r = iw(sl.x + LADO, sl.y), b = iw(sl.x + LADO, sl.y + LADO), l = iw(sl.x, sl.y + LADO);
    const poly = [
      { x: t.x, y: t.y - ALT_PAREDE }, { x: r.x, y: r.y - ALT_PAREDE }, { x: r.x, y: r.y }, { x: b.x, y: b.y }, { x: l.x, y: l.y }, { x: l.x, y: l.y - ALT_PAREDE },
    ];
    if (noPoligono(x, y, poly)) return tipo;
  }
  return null;
}

// ── Cenário fixo (em cache) ────────────────────────────────────────────────────

interface Paleta { paredeD: string; paredeE: string; rodape: string; corredor: [string, string]; passadeira: [string, string]; faixa: string }
const PALETAS: Record<AndarId, Paleta> = {
  jacqes: { paredeD: "#2c4382", paredeE: "#22346a", rodape: "#15204a", corredor: ["#c9a876", "#bd9a66"], passadeira: ["#35508f", "#30498a"], faixa: "#2c4382" },
  awaqe: { paredeD: "#1f5e58", paredeE: "#184a46", rodape: "#0d302d", corredor: ["#cdb37f", "#c2a873"], passadeira: ["#2f7a6f", "#2a6e64"], faixa: "#1f5e58" },
  caza: { paredeD: "#6b2d3c", paredeE: "#542333", rodape: "#3a1520", corredor: ["#c4b49a", "#b7a78c"], passadeira: ["#8f3d4e", "#7d3344"], faixa: "#6b2d3c" },
};

function colunaParede(lado: "D" | "E", u: number) {
  return { x: lado === "D" ? WOX + u * 16 : WOX - u * 16 - 0.5, base: WOY + u * 8 };
}

function paredeExterna(c: CanvasRenderingContext2D, lado: "D" | "E", AWQ: Paleta) {
  const n = lado === "D" ? GWm : GHm;
  const cor = lado === "D" ? AWQ.paredeD : AWQ.paredeE;
  for (let k = 0; k < n * 32; k++) {
    const u = k / 32;
    const { x, base } = colunaParede(lado, u);
    const ao = Math.max(0, 1 - (u * 16) / 34) * 0.22;
    const principal = sombreia(cor, -ao);
    ret(c, x, base - WALL, 0.5, WALL, principal);
    ret(c, x, base - WALL, 0.5, 1.5, sombreia(cor, 0.26));
    // chapa microperfurada (inspirada em fachadas de alumínio perfurado): grade regular de furos claros na faixa acima das janelas
    if (k % 6 === 0) {
      const furo = sombreia(cor, 0.16);
      for (let fy = base - WALL + 4; fy < base - 19; fy += 3) ret(c, x, fy, 0.5, 0.5, furo);
    }
    ret(c, x, base - 17, 0.5, 12, sombreia(principal, -0.07));
    ret(c, x, base - 5, 0.5, 5, AWQ.rodape);
    ret(c, x, base - 5, 0.5, 0.5, sombreia(AWQ.rodape, 0.38));
  }
}

function janelaExterna(c: CanvasRenderingContext2D, lado: "D" | "E", a: number, b: number, hora: number) {
  const sky = ceu(hora);
  const noite = luzDoDia(hora) < 0.35;
  const larg = (b - a) * 16;
  for (let k = Math.round(a * 32); k < Math.round(b * 32); k++) {
    const u = k / 32;
    const { x, base } = colunaParede(lado, u);
    const off = (u - a) * 16;
    const top = base - WALL + 5;
    const alto = 13;
    if (off < 1 || off > larg - 1 || Math.abs(off - larg / 2) < 0.5) { ret(c, x, top - 1, 0.5, alto + 2, "#e3d3b0"); continue; }
    ret(c, x, top - 1, 0.5, 1.5, "#e3d3b0");
    for (let r = 0; r < alto * 2; r++) ret(c, x, top + r * 0.5, 0.5, 0.5, mistura(sky.topo, sky.base, r / (alto * 2)));
    const hb = 2 + aleat(Math.floor(off / 2.5), lado === "D" ? 1 : 2, 7) * 5;
    ret(c, x, top + alto - hb, 0.5, hb, noite ? "#070d1c" : mistura(sky.base, "#51647f", 0.5));
    if (noite && aleat(k, Math.floor(hb), 3) > 0.82) ret(c, x, top + alto - hb + 1, 0.5, 0.5, "#fde68a");
    if (noite && aleat(k, 3, 5) > 0.97) ret(c, x, top + 1 + aleat(k, 2, 2) * 4, 0.5, 0.5, "#f8fafc");
  }
}

function logoAWQ(c: CanvasRenderingContext2D) {
  const u0 = 6.4, u1 = 8.8;
  for (let k = Math.round(u0 * 32); k < Math.round(u1 * 32); k++) {
    const u = k / 32;
    const { x, base } = colunaParede("D", u);
    const off = (u - u0) * 16;
    const larg = (u1 - u0) * 16;
    const top = base - WALL + 5;
    const borda = off < 0.8 || off > larg - 0.8;
    for (let r = 0; r < 28; r++) {
      const y = r * 0.5;
      let cor = "#0f1b3d";
      if (borda || y < 0.8 || y > 13.2) cor = "#c8a46a";
      else if (y > 5 && y < 6.5 && off > 3 && off < larg - 3) cor = "#fbbf24";
      else if (y > 8 && y < 9 && off > 5 && off < larg - 5) cor = "#93c5fd";
      ret(c, x, top + y, 0.5, 0.5, cor);
    }
  }
}

function pisoPlanta(c: CanvasRenderingContext2D, predios: PredioW[], AWQ: Paleta) {
  const sala = (gx: number, gy: number) => SLOTS.find((s) => gx >= s.x && gx < s.x + LADO && gy >= s.y && gy < s.y + LADO);
  const dono = (s: { x: number; y: number }) => predios.find((p) => p.x === s.x && p.y === s.y);
  for (let gy = 0; gy < GHm; gy++) {
    for (let gx = 0; gx < GWm; gx++) {
      const p = iw(gx, gy);
      const s = sala(gx, gy);
      let cor: string;
      if (s) {
        const d = dono(s);
        const tema = d ? TEMAS[d.empresa.tema % TEMAS.length] : TEMAS[0];
        const centro = gx >= s.x + 1 && gx <= s.x + 3 && gy >= s.y + 1 && gy <= s.y + 3;
        cor = centro ? tema.tapete[(gx + gy) % 2] : tema.piso[(gx + gy) % 2];
        if (!d) cor = mistura(AWQ.corredor[(gx + gy) % 2], "#94a3b8", 0.18);
      } else {
        cor = AWQ.corredor[(gx + gy) % 2];
      }
      const passadeira = !s && (gy === 6 || gy === 7) && gx >= 1 && gx <= 16;
      if (passadeira) cor = AWQ.passadeira[(gx + gy) % 2];
      losango(c, p.x, p.y, cor);
      if (passadeira) {
        losangoEsc(c, p.x, p.y + 8, 0.62, sombreia(cor, 0.1));
        losangoEsc(c, p.x, p.y + 8, 0.3, sombreia(cor, -0.1));
        c.fillStyle = "rgba(200,164,106,0.6)";
        if (gy === 6) for (let i = 0; i < 32; i++) c.fillRect(p.x + i * 0.5, p.y + i * 0.25, 0.5, 0.5);
      }
      for (let k = 0; k < 3; k++) {
        ret(c, p.x + (aleat(gx, gy, k) - 0.5) * 18, p.y + 8 + (aleat(gy, gx, k + 4) - 0.5) * 6, 0.5, 0.5, sombreia(cor, aleat(gx, gy, k + 9) > 0.5 ? 0.07 : -0.07));
      }
      for (let i = 0; i < 32; i++) {
        c.fillStyle = "rgba(0,0,0,0.07)";
        c.fillRect(p.x - 16 + i * 0.5, p.y + 8 + i * 0.25, 0.5, 0.5);
        c.fillRect(p.x + i * 0.5, p.y + 16 - i * 0.25, 0.5, 0.5);
      }
      // tábuas de madeira: junta a cada 3 células no corredor (piso tipo assoalho, não pedra)
      if (!s && !passadeira && gx % 3 === 0) {
        c.fillStyle = "rgba(0,0,0,0.1)";
        for (let i = 0; i < 16; i++) c.fillRect(p.x - 16 + i * 1, p.y + 8 + i * 0.5, 1, 0.5);
      }
      if (gy === 0 || gx === 0) losango(c, p.x, p.y, "rgba(0,0,0,0.10)");
    }
  }
  const x0 = WOX - GHm * 16;
  for (let i = 0; i < GWm * 32; i++) {
    const yy = WOY + GHm * 8 + i * 0.25;
    ret(c, x0 + i * 0.5, yy, 0.5, 2.5, "#64748b"); ret(c, x0 + i * 0.5, yy + 2.5, 0.5, 3, "#475569");
  }
  const x1 = WOX + (GWm - GHm) * 16;
  for (let i = 0; i < GHm * 32; i++) {
    const yy = WOY + (GWm + GHm) * 8 - i * 0.25;
    ret(c, x1 + i * 0.5, yy, 0.5, 2.5, "#475569"); ret(c, x1 + i * 0.5, yy + 2.5, 0.5, 3, "#334155");
  }
}

/** Paredes de fundo da sala (as duas que ficam atrás das mesas, vistas por dentro). */
function paredesDeFundo(c: CanvasRenderingContext2D, s: { x: number; y: number }, cor: string) {
  const vidro = "rgba(186,224,255,0.34)";
  // plano gx = x (face voltada para +gx), de gy = y a y + LADO
  for (let k = 0; k < LADO * 32; k++) {
    const u = s.y + k / 32;
    const x = WOX + (s.x - u) * 16 - 0.5;
    const base = WOY + (s.x + u) * 8;
    ret(c, x, base - ALT_PAREDE, 0.5, ALT_PAREDE, sombreia(cor, -0.12));
    ret(c, x, base - ALT_PAREDE, 0.5, 1, sombreia(cor, 0.3));
    ret(c, x, base - 15, 0.5, 8, vidro);
    ret(c, x, base - 4, 0.5, 4, sombreia(cor, -0.28));
  }
  // plano gy = y (face voltada para +gy), de gx = x a x + LADO
  for (let k = 0; k < LADO * 32; k++) {
    const u = s.x + k / 32;
    const x = WOX + (u - s.y) * 16;
    const base = WOY + (u + s.y) * 8;
    ret(c, x, base - ALT_PAREDE, 0.5, ALT_PAREDE, sombreia(cor, 0.02));
    ret(c, x, base - ALT_PAREDE, 0.5, 1, sombreia(cor, 0.34));
    ret(c, x, base - 15, 0.5, 8, vidro);
    ret(c, x, base - 4, 0.5, 4, sombreia(cor, -0.22));
  }
}

/** Penumbra no chão junto às duas paredes de fundo de cada sala (oclusão ambiente). */
function penumbraDasSalas(c: CanvasRenderingContext2D) {
  for (const s of SLOTS) {
    for (let k = 0; k < LADO; k++) {
      const a = iw(s.x + k, s.y), b = iw(s.x, s.y + k);
      losango(c, a.x, a.y, "rgba(8,14,32,0.10)");
      if (k > 0) losango(c, b.x, b.y, "rgba(8,14,32,0.10)");
      if (k < LADO - 1) {
        const a2 = iw(s.x + k + 1, s.y + 1), b2 = iw(s.x + 1, s.y + k + 1);
        losango(c, a2.x, a2.y, "rgba(8,14,32,0.04)");
        if (k > 0) losango(c, b2.x, b2.y, "rgba(8,14,32,0.04)");
      }
    }
  }
}

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

type Pt = { x: number; y: number };
/** Feixes de sol das janelas externas: [dois pontos na parede, dois pontos no chão], em coordenadas de grade. */
const FEIXES: [[number, number], [number, number], [number, number], [number, number]][] = [
  [[2.2, 0], [4.4, 0], [0.4, 5.6], [2.6, 5.6]],
  [[10, 0], [12.4, 0], [8, 5.6], [10.4, 5.6]],
  [[14.2, 0], [16.6, 0], [12.2, 5.6], [14.6, 5.6]],
  [[0, 2.6], [0, 4.8], [5.4, 4.2], [5.4, 6.4]],
  [[0, 8], [0, 10.2], [5.4, 9.6], [5.4, 11.8]],
];

function feixesDeSol(c: CanvasRenderingContext2D, hora: number) {
  const l = luzDoDia(hora);
  if (l < 0.05) return;
  c.save();
  c.beginPath();
  const t = iw(0, 0), r = iw(GWm, 0), b = iw(GWm, GHm), e = iw(0, GHm);
  c.moveTo(t.x, t.y); c.lineTo(r.x, r.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.closePath();
  c.clip();
  for (const [a0, a1, b1, b0] of FEIXES) {
    const p0 = iw(a0[0], a0[1]), p1 = iw(a1[0], a1[1]), p2 = iw(b1[0], b1[1]), p3 = iw(b0[0], b0[1]);
    const m0 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, m1 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
    const g = c.createLinearGradient(m0.x, m0.y, m1.x, m1.y);
    g.addColorStop(0, `rgba(255,244,200,${(0.26 * l).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,244,200,0)");
    c.fillStyle = g;
    c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); c.closePath(); c.fill();
  }
  c.restore();
}

/** Grãos de poeira que flutuam dentro dos feixes de sol (só de dia). */
function poeira(c: CanvasRenderingContext2D, hora: number, t: number) {
  const l = luzDoDia(hora);
  if (l < 0.3) return;
  FEIXES.forEach(([a0, a1, b1, b0], f) => {
    for (let k = 0; k < 6; k++) {
      const s = (t * (0.025 + 0.01 * k) + aleat(f, k, 1)) % 1;
      const w = aleat(f, k, 2) + Math.sin(t * 0.5 + k * 1.7 + f) * 0.04;
      const lerp = (u: number[], v: number[], q: number): number[] => [u[0] + (v[0] - u[0]) * q, u[1] + (v[1] - u[1]) * q];
      const topo = lerp(a0, a1, w), base = lerp(b0, b1, w);
      const g = lerp(topo, base, s);
      const q: Pt = iw(g[0], g[1]);
      const alt = 4 + s * 10 + Math.sin(t * 0.8 + k) * 1.5;
      c.fillStyle = `rgba(255,250,215,${(Math.sin(s * Math.PI) * 0.75 * l).toFixed(3)})`;
      c.fillRect(Math.round(q.x * 2) / 2, Math.round((q.y - alt) * 2) / 2, 0.5, 0.5);
    }
  });
}

function cenarioEstatico(c: CanvasRenderingContext2D, predios: PredioW[], hora: number, andar: AndarId) {
  const pal = PALETAS[andar];
  paredeExterna(c, "D", pal);
  paredeExterna(c, "E", pal);
  for (const [a, b] of [[2.2, 4.4], [10, 12.4], [14.2, 16.6]] as const) janelaExterna(c, "D", a, b, hora);
  for (const [a, b] of [[2.6, 4.8], [8, 10.2]] as const) janelaExterna(c, "E", a, b, hora);
  logoAWQ(c);
  pisoPlanta(c, predios, pal);
  feixesDeSol(c, hora);
  penumbraDasSalas(c);
  for (const s of SLOTS) {
    const d = predios.find((p) => p.x === s.x && p.y === s.y);
    const tema = d ? TEMAS[d.empresa.tema % TEMAS.length] : TEMAS[0];
    paredesDeFundo(c, s, d ? tema.paredeD : "#7b8aa8");
  }
}

const cacheFundo = new Map<string, HTMLCanvasElement>();

function fundo(predios: PredioW[], hora: number, andar: AndarId): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const chave = `${andar}|${Math.floor(hora * 4)}|${predios.map((p) => `${p.x},${p.y},${p.empresa.tema}`).join(";")}`;
  let cv = cacheFundo.get(chave);
  if (!cv) {
    cv = document.createElement("canvas");
    cv.width = WW * ESCALA;
    cv.height = WH * ESCALA;
    const g = cv.getContext("2d");
    if (!g) return null;
    g.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
    g.imageSmoothingEnabled = false;
    cenarioEstatico(g, predios, hora, andar);
    if (cacheFundo.size > 12) cacheFundo.delete(cacheFundo.keys().next().value as string);
    cacheFundo.set(chave, cv);
  }
  return cv;
}

// ── Itens dinâmicos ────────────────────────────────────────────────────────────

type Item = { d: number; f: () => void };
const AGENTES: Agente[] = ["cs", "ref", "criativo", "midia"];
// posição (relativa à sala) da mesa de cada agente: [coluna, linha]; a cadeira fica uma linha acima
const MESAS_SALA: Record<Agente, [number, number]> = { cs: [0, 1], ref: [3, 1], criativo: [0, 3], midia: [3, 3] };

/**
 * Cabelo com silhueta própria por papel (não só cor) — cada função reconhecível de longe,
 * como o Sims faz com silhuetas de Create-a-Sim. `topo` é o y do topo da caixa da cabeça.
 */
function cabeloDoPapel(c: CanvasRenderingContext2D, cx: number, topo: number, papel: Papel, cor: string) {
  switch (papel) {
    case "criativo": // topete desalinhado, mais alto de um lado — o "despojado"
      parte(c, cx - 4, topo - 3, 8, 3, cor);
      parte(c, cx + 1.5, topo - 5, 2.5, 2.5, cor);
      ret(c, cx + 1.5, topo - 5, 2.5, 0.5, sombreia(cor, 0.22));
      break;
    case "midia": // preso atrás, volume alto — o "sempre em câmera"
      parte(c, cx - 4, topo - 3, 8, 3, cor);
      parte(c, cx + 2.5, topo - 2.5, 2, 3, cor);
      break;
    case "ref": // curto e discreto, repartido de lado — o "atrás das telas"
      parte(c, cx - 4, topo - 2.5, 8, 2.5, cor);
      ret(c, cx - 4, topo - 2.5, 2, 0.5, sombreia(cor, 0.22));
      break;
    case "cs":
    case "gestor":
    default: // repartido ao meio, clássico — o "fala com todo mundo"
      parte(c, cx - 4, topo - 3.5, 8, 3.5, cor);
      ret(c, cx - 0.5, topo - 3.5, 1, 3.5, sombreia(cor, -0.22));
      break;
  }
}

function bonecoSentado(c: CanvasRenderingContext2D, cx: number, cy: number, papel: Papel, st: Estado, quadro: number) {
  const L = LOOK[papel];
  const Y = cy + 3.5;
  const par = quadro % 2 === 0;
  ret(c, cx - 5.5, cy - 1, 11, 1.5, "rgba(0,0,0,0.16)");
  parte(c, cx - 4.5, Y - 15.5, 9, 7.5, L.corpo);
  ret(c, cx + 3, Y - 15, 1.5, 6.5, sombreia(L.corpo, -0.2));
  if (st === "working") {
    parte(c, cx - 6.5, Y - 14.5, 2, 4.5, L.corpo); parte(c, cx + 4.5, Y - 14.5, 2, 4.5, L.corpo);
    parte(c, cx - 5.5 + (par ? 0.5 : 0), Y - 10.5, 2, 1.5, L.pele); parte(c, cx + 3.5 - (par ? 0 : 0.5), Y - 10.5, 2, 1.5, L.pele);
  } else {
    parte(c, cx - 6.5, Y - 14.5, 2, 6, L.corpo); parte(c, cx + 4.5, Y - 14.5, 2, 6, L.corpo);
  }
  ret(c, cx - 1, Y - 18.5, 2, 3, sombreia(L.pele, -0.12));
  // cabeça maior e mais arredondada (estilo CAS: proporção "boneco", não realista — mais legível em tamanho pequeno)
  const hx = cx - 4, hy = Y - 28.5, hw = 8, hh = 9.5;
  parte(c, hx, hy, hw, hh, L.pele);
  ret(c, hx, hy, 1, 1, sombreia(L.pele, 0.15)); ret(c, hx + hw - 1, hy, 1, 1, sombreia(L.pele, 0.15)); // cantos suavizados
  ret(c, hx, hy + hh - 2, hw, 2, sombreia(L.pele, -0.1)); // sombra de queixo/maxilar
  cabeloDoPapel(c, cx, hy, papel, L.cabelo);
  // olhos maiores, com reflexo de luz — mais expressivo, "estilo cartoon" em vez de realista
  ret(c, cx - 3.2, hy + 4.8, 2.2, 1.8, "#ffffff"); ret(c, cx + 1, hy + 4.8, 2.2, 1.8, "#ffffff");
  ret(c, cx - 2.6, hy + 5.2, 1.2, 1.2, "#0f172a"); ret(c, cx + 1.6, hy + 5.2, 1.2, 1.2, "#0f172a");
  ret(c, cx - 2.4, hy + 5.2, 0.5, 0.5, "#f8fafc"); ret(c, cx + 1.8, hy + 5.2, 0.5, 0.5, "#f8fafc");
  ret(c, cx - 1, hy + 8, 2, 0.5, "#9a3412");
}

function balaoMini(c: CanvasRenderingContext2D, cx: number, y: number, tipo: "pontos" | "ok" | "erro", f: number) {
  const w = 14;
  const x = Math.round(cx - w / 2);
  ret(c, x + 0.5, y - 0.5, w - 1, 10, OUT); ret(c, x - 0.5, y + 0.5, w + 1, 8, OUT);
  ret(c, x + 0.5, y, w - 1, 9, "#ffffff"); ret(c, x, y + 0.5, w, 8, "#ffffff");
  if (tipo === "pontos") { const n = (f % 3) + 1; for (let i = 0; i < 3; i++) ret(c, x + 3 + i * 3, y + 3.5, 1.5, 1.5, i < n ? "#0f172a" : "#cbd5e1"); }
  else if (tipo === "ok") { ret(c, x + 4, y + 4, 1.5, 1.5, "#16a34a"); ret(c, x + 5.5, y + 5, 1.5, 1.5, "#16a34a"); ret(c, x + 7, y + 3.5, 1.5, 1.5, "#16a34a"); ret(c, x + 8.5, y + 2, 1.5, 1.5, "#16a34a"); }
  else { ret(c, x + 6, y + 1.5, 2, 4, "#dc2626"); ret(c, x + 6, y + 6.5, 2, 1.5, "#dc2626"); }
}

/** Sombra suave no chão: um losango mais escuro e um halo maior e mais claro, deslocados para a frente. */
function sombraNoChao(c: CanvasRenderingContext2D, gx: number, gy: number, esc = 1) {
  const q = iw(gx, gy);
  losangoEsc(c, q.x + 4, q.y + 10, 1.22 * esc, "rgba(8,14,32,0.055)");
  losango(c, q.x + 4, q.y + 2, "rgba(8,14,32,0.13)");
}

function sofa(c: CanvasRenderingContext2D, gx: number, gy: number) {
  for (let i = 0; i < 2; i++) {
    const q = iw(gx + i, gy);
    for (let k = 0; k < 32; k++) {
      const x = q.x + k * 0.5, y = q.y + k * 0.25 - 7;
      ret(c, x, y - 9, 0.5, 9, k < 1 ? "#6b2a1a" : "#a8452d");
      ret(c, x, y - 9, 0.5, 1.5, "#d56b4c");
    }
    caixa(c, q.x, q.y, 7, "#c4573a", "#8e3a24", "#a8452d");
    losangoEsc(c, q.x, q.y - 7 + 8, 0.72, "#d56b4c");
    losangoEsc(c, q.x, q.y - 7 + 8, 0.3, "#c4573a");
  }
}

function impressora(c: CanvasRenderingContext2D, q: Pt, f: number) {
  caixa(c, q.x, q.y, 9, "#eef0f3", "#9ca3af", "#b6bcc6");
  ret(c, q.x - 5, q.y - 9.5, 9, 0.5, "#ffffff"); ret(c, q.x - 4, q.y - 11, 7, 1.5, "#f8fafc");
  ret(c, q.x + 3, q.y - 7.5, 1, 1, f % 8 < 4 ? "#22c55e" : "#14532d");
  ret(c, q.x - 4, q.y - 5.5, 6, 1.5, "#1f2937");
  const saida = f % 40;
  if (saida < 10) ret(c, q.x - 3, q.y - 5 + saida * 0.25, 4, 0.5 + saida * 0.25, "#ffffff");
}

function estante(c: CanvasRenderingContext2D, q: Pt) {
  caixa(c, q.x, q.y, 18, "#a8723f", "#7a4e26", "#8f5f31");
  const cores = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7", "#f97316", "#14b8a6"];
  for (let i = 0; i < 32; i += 2) {
    const yb = q.y - 18 + 16 - i * 0.25;
    for (let r = 0; r < 2; r++) {
      const h = 3.5 + aleat(i, r, 3) * 2.5;
      ret(c, q.x + i * 0.5, yb + 2.5 + r * 6.5 + (5.5 - h), 1, h, cores[(i + r * 3) % cores.length]);
    }
    ret(c, q.x + i * 0.5, yb + 8, 1, 0.5, "#5a3a1c");
  }
  ret(c, q.x - 3, q.y - 21, 3, 3, "#fbbf24"); ret(c, q.x - 2.5, q.y - 18.5, 2, 0.5, "#92400e");
}

/** Cantos da planta fora das salas: copa e impressora, encostadas nas paredes externas. */
function corredor(c: CanvasRenderingContext2D, op: OpcoesMundo, add: (d: number, f: () => void) => void, sombra: (gx: number, gy: number, esc?: number) => void) {
  const f = op.quadro;
  sombra(0, 3); sombra(0, 4); sombra(3, 0);
  add(0 + 3 + 0.2, () => { const q = iw(0.5, 3.5); cafeteira(c, q.x, q.y, f); });
  add(0 + 4 + 0.2, () => { const q = iw(0.5, 4.5); bebedouro(c, q.x, q.y, f); });
  add(3 + 0 + 0.2, () => impressora(c, iw(3, 0), f));
}

/** Placa com o andar e a BU, acima do prédio. */
function faixaDoAndar(c: CanvasRenderingContext2D, andar: AndarId, squads: number) {
  const a = ANDARES.find((x) => x.id === andar)!;
  const txt = `ANDAR ${a.numero} · ${a.nome}`;
  c.font = "bold 6.5px sans-serif";
  const w = Math.ceil(c.measureText(txt).width) + 14;
  const x = Math.round(WOX - w / 2), y = 4;
  ret(c, x - 0.5, y - 0.5, w + 1, 12, OUT);
  ret(c, x, y, w, 11, PALETAS[andar].faixa);
  ret(c, x, y, w, 1, "rgba(255,255,255,0.35)");
  ret(c, x + 3, y + 3.5, 4, 4, "#fbbf24");
  c.fillStyle = "#f8fafc"; c.textAlign = "left"; c.textBaseline = "middle";
  c.fillText(txt, x + 10, y + 6);
  if (squads === 0) {
    c.font = "bold 4.5px sans-serif";
    const sub = "SEM SQUADS CONFIGURADAS AINDA";
    const w2 = Math.ceil(c.measureText(sub).width) + 8;
    ret(c, Math.round(WOX - w2 / 2) - 0.5, y + 12.5, w2 + 1, 8, OUT);
    ret(c, Math.round(WOX - w2 / 2), y + 13, w2, 7, "#0f172a");
    c.fillStyle = "#fcd34d"; c.fillText(sub, Math.round(WOX - w2 / 2) + 4, y + 16.8);
  }
}

function relogioParede(c: CanvasRenderingContext2D, hora: number) {
  const { x, base } = colunaParede("D", 5.4);
  const cx = x + 0.25, cy = base - WALL + 17;
  disco(c, cx, cy, 5, OUT);
  disco(c, cx, cy, 4.5, "#f8fafc");
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ret(c, cx + Math.sin(a) * 3.6 - 0.25, cy - Math.cos(a) * 3.6 - 0.25, 0.5, 0.5, "#64748b");
  }
  const ponteiro = (ang: number, len: number, cor: string) => {
    for (let r = 0.5; r <= len; r += 0.5) ret(c, cx + Math.sin(ang) * r - 0.25, cy - Math.cos(ang) * r - 0.25, 0.5, 0.5, cor);
  };
  ponteiro(((hora % 12) / 12) * Math.PI * 2, 2.2, "#0f172a");
  ponteiro((hora % 1) * Math.PI * 2, 3.4, "#334155");
}

function salaCliente(c: CanvasRenderingContext2D, p: PredioW, op: OpcoesMundo, add: (d: number, f: () => void) => void, sombra: (gx: number, gy: number, esc?: number) => void) {
  const e = p.empresa;
  const estados: Record<Agente, Estado> = e.estados ?? { cs: "idle", ref: "idle", criativo: "idle", midia: "idle" };
  for (const a of AGENTES) {
    const [dx, dy] = MESAS_SALA[a];
    const st = estados[a];
    const gx = p.x + dx, gy = p.y + dy;
    for (let i = 0; i < 2; i++) {
      sombra(gx + i, gy);
      add(gx + i + gy, () => {
        const q = iw(gx + i, gy);
        caixa(c, q.x, q.y, 10, "#c28f58", "#8a5a2e", "#a06c3c");
        ret(c, q.x - 4, q.y - 4, 8, 2, "#a1a1aa");
        if (i === 0) {
          // caneca com vapor
          ret(c, q.x - 9, q.y - 6.5, 2.5, 2.5, "#f8fafc"); ret(c, q.x - 9, q.y - 6.5, 2.5, 0.5, "#92400e");
          if (st !== "error") {
            const v = (op.quadro + gx * 3) % 6;
            ret(c, q.x - 8.25 + (v % 2) * 0.5, q.y - 8 - v * 0.5, 0.5, 1, `rgba(255,255,255,${(0.6 - v * 0.08).toFixed(2)})`);
          }
        }
        if (i === 1) monitor(c, q.x + 9, q.y - 1, st, op.quadro, a);
      });
    }
    sombra(gx, gy - 1, 0.55);
    add(gx + gy - 0.1, () => cadeira(c, iw(gx + 0.5, gy - 0.5)));
    add(gx + gy - 0.05, () => {
      const q = iw(gx + 0.5, gy - 0.5);
      bonecoSentado(c, q.x, q.y, a, st, op.quadro);
    });
  }
  sombra(p.x + 2, p.y, 1); sombra(p.x + LADO - 1, p.y); sombra(p.x, p.y + LADO - 1);
  add(p.x + 2 + p.y + 0.3, () => estante(c, iw(p.x + 2, p.y)));
  const cantos: [number, number][] = [[LADO - 1, 0], [0, LADO - 1]];
  for (const [dx, dy] of cantos) add(p.x + dx + p.y + dy + 0.3, () => { const q = iw(p.x + dx + 0.5, p.y + dy + 0.5); planta(c, q.x, q.y, op.quadro + dx); });
}

/** Vidro baixo na frente da sala, com um vão de porta. */
function vidroFrontal(c: CanvasRenderingContext2D, p: PredioW, cor: string) {
  const faixa = (x: number, base: number) => {
    ret(c, x, base - ALT_VIDRO, 0.5, ALT_VIDRO, "rgba(186,224,255,0.22)");
    ret(c, x, base - ALT_VIDRO, 0.5, 0.5, "rgba(255,255,255,0.8)");
    ret(c, x, base - 0.5, 0.5, 0.5, sombreia(cor, -0.1));
  };
  // plano gx = x + LADO, de gy = y a y + LADO
  for (let k = 0; k < LADO * 32; k++) {
    const u = p.y + k / 32;
    faixa(WOX + (p.x + LADO - u) * 16 - 0.5, WOY + (p.x + LADO + u) * 8);
  }
  // plano gy = y + LADO, de gx = x a x + LADO (com vão de porta entre 1.8 e 3.2)
  for (let k = 0; k < LADO * 32; k++) {
    const off = k / 32;
    if (off > 1.8 && off < 3.2) continue;
    const u = p.x + off;
    faixa(WOX + (u - (p.y + LADO)) * 16, WOY + (u + p.y + LADO) * 8);
  }
}

function rotulo(c: CanvasRenderingContext2D, p: PredioW, op: OpcoesMundo) {
  const topo = iw(p.x + p.w / 2, p.y);
  const tema = TEMAS[p.empresa.tema % TEMAS.length];
  const nome = p.empresa.nome.toUpperCase();
  c.font = "bold 5.5px sans-serif";
  const w = Math.ceil(c.measureText(nome).width) + 10;
  const x = Math.round(topo.x - w / 2);
  const y = Math.round(topo.y - p.alt - 24);
  const destaque = op.hover === p.empresa.bu || op.selecionado === p.empresa.bu;
  ret(c, x - 0.5, y - 0.5, w + 1, 10, OUT);
  ret(c, x, y, w, 9, destaque ? "#fbbf24" : tema.rodape);
  ret(c, x + 2, y + 3, 3, 3, destaque ? "#0f172a" : sombreia(tema.paredeD, 0.4));
  c.fillStyle = destaque ? "#0f172a" : "#f8fafc";
  c.textAlign = "left"; c.textBaseline = "middle";
  c.fillText(nome, x + 6.5, y + 4.8);

  const itens: { cor: string; txt: string }[] = [{ cor: p.empresa.trabalhando > 0 ? "#22c55e" : "#64748b", txt: `${p.empresa.trabalhando}/${p.empresa.agentes}` }];
  if (p.empresa.alta > 0) itens.push({ cor: "#ef4444", txt: `! ${p.empresa.alta}` });
  if (p.empresa.relatorio) itens.push({ cor: "#38bdf8", txt: "doc" });
  let xi = Math.round(topo.x - (itens.length * 17) / 2);
  const yi = y + 11;
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
    c.fillStyle = `rgba(34,197,94,${(0.14 + 0.16 * pulso).toFixed(2)})`;
    const q = iw(p.x + p.w / 2, p.y + p.h / 2);
    c.beginPath(); c.arc(q.x, q.y - 4, 26 + pulso * 3, 0, Math.PI * 2); c.fill();
  }
}

/** Estúdio da Caza: ciclorama, grade no piso, três refletores e a câmera no tripé. */
function estudio(c: CanvasRenderingContext2D, s: { x: number; y: number }, add: (d: number, f: () => void) => void) {
  add(s.x + s.y + 0.6, () => {
    const topo = iw(s.x + LADO / 2, s.y);
    const nome = "ESTÚDIO";
    c.font = "bold 5.5px sans-serif";
    const w = Math.ceil(c.measureText(nome).width) + 10;
    const x = Math.round(topo.x - w / 2), y = Math.round(topo.y - ALT_PAREDE - 18);
    ret(c, x - 0.5, y - 0.5, w + 1, 10, OUT);
    ret(c, x, y, w, 9, "#6b2d3c");
    ret(c, x + 2, y + 3, 3, 3, "#fbbf24");
    c.fillStyle = "#f8fafc";
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillText(nome, x + 6.5, y + 4.8);
  });
  add(s.x + 2 + s.y + 0.35, () => {
    const q = iw(s.x + 2.5, s.y + 0.6);
    ret(c, q.x - 18, q.y - 20, 36, 12, "#f7f4ee");
    ret(c, q.x - 18, q.y - 20, 36, 1, "#ffffff");
    ret(c, q.x - 18, q.y - 9, 36, 2, "#e4ddd2");
  });
  add(s.x + 2 + s.y + 2.2, () => {
    for (let i = 0; i < 3; i++) {
      const q = iw(s.x + 1.5 + i, s.y + 2.2);
      losango(c, q.x, q.y, "rgba(255,255,255,0.45)");
    }
  });
  const luzes: [number, number, string][] = [[1.2, 1.2, "#fde68a"], [3.8, 1.2, "#bfdbfe"], [2.5, 0.8, "#ffffff"]];
  for (const [dx, dy, cor] of luzes) {
    add(s.x + dx + s.y + dy + 0.15, () => {
      const q = iw(s.x + dx, s.y + dy);
      ret(c, q.x, q.y - 14, 0.5, 14, "#475569");
      disco(c, q.x + 0.25, q.y - 15, 2.2, cor);
    });
  }
  add(s.x + 2.5 + s.y + 3.4, () => {
    const q = iw(s.x + 2.5, s.y + 3.4);
    ret(c, q.x - 3, q.y - 1, 6, 0.5, "#334155");
    ret(c, q.x, q.y - 9, 0.5, 9, "#334155");
    ret(c, q.x - 3, q.y - 12, 6, 3.5, "#0f172a");
    ret(c, q.x + 2, q.y - 11, 3, 1.5, "#38bdf8");
  });
}

/** Áreas da casa: a sala do Miguel (topo da planta) e a sala de reuniões. */
function areaDaCasa(c: CanvasRenderingContext2D, s: { x: number; y: number }, tipo: "diretoria" | "reunioes", op: OpcoesMundo, add: (d: number, f: () => void) => void) {
  const nome = tipo === "diretoria" ? "SALA DO MIGUEL" : "SALA DE REUNIÕES";
  add(s.x + s.y + 0.6, () => {
    const topo = iw(s.x + LADO / 2, s.y);
    c.font = "bold 5.5px sans-serif";
    const w = Math.ceil(c.measureText(nome).width) + 10;
    const x = Math.round(topo.x - w / 2), y = Math.round(topo.y - ALT_PAREDE - 18);
    ret(c, x - 0.5, y - 0.5, w + 1, 10, OUT); ret(c, x, y, w, 9, tipo === "diretoria" ? "#7c5a1a" : "#334155");
    ret(c, x + 2, y + 3, 3, 3, "#fbbf24");
    c.fillStyle = "#f8fafc"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(nome, x + 6.5, y + 4.8);
  });
  if (tipo === "diretoria") {
    for (let i = 0; i < 3; i++) add(s.x + 1 + i + s.y + 2, () => { const q = iw(s.x + 1 + i, s.y + 2); caixa(c, q.x, q.y, 11, "#5b3b22", "#3d2616", "#4b301c"); if (i === 1) monitor(c, q.x + 2, q.y - 2, "working", op.quadro, "cs"); });
    add(s.x + 2 + s.y + 1.4, () => cadeira(c, iw(s.x + 2.5, s.y + 1.5)));
    add(s.x + 2 + s.y + 1.45, () => { const q = iw(s.x + 2.5, s.y + 1.5); bonecoSentado(c, q.x, q.y, "cs", "working", op.quadro); });
    add(s.x + 3 + s.y + 3.5, () => { const q = iw(s.x + 3.5, s.y + 3.5); ret(c, q.x - 0.5, q.y - 22, 1, 22, "#94a3b8"); ret(c, q.x + 0.5, q.y - 22, 8, 5, "#fbbf24"); ret(c, q.x + 0.5, q.y - 19, 8, 1.5, "#2c4382"); });
    add(s.x + 1 + s.y + 3.6, () => { const q = iw(s.x + 1.2, s.y + 3.6); caixa(c, q.x, q.y, 5, "#e0cba6", "#a89377", "#bfa987"); });
  } else {
    for (let i = 0; i < 3; i++) add(s.x + 1 + i + s.y + 2, () => { const q = iw(s.x + 1 + i, s.y + 2); caixa(c, q.x, q.y, 8, "#e5e7eb", "#9ca3af", "#cbd5e1"); });
    for (const gx of [1.5, 2.5, 3.5]) {
      add(s.x + gx + s.y + 1.4, () => cadeira(c, iw(s.x + gx, s.y + 1.5)));
      add(s.x + gx + s.y + 3.6, () => cadeira(c, iw(s.x + gx, s.y + 3.5)));
    }
    // reunião em andamento: o gestor na cabeceira e os CSs sentados em volta da mesa
    if (op.reuniao && op.reuniao.length > 0) {
      add(s.x + CABECEIRA[0] + s.y + CABECEIRA[1] - 0.1, () => cadeira(c, iw(s.x + CABECEIRA[0], s.y + CABECEIRA[1])));
      add(s.x + CABECEIRA[0] + s.y + CABECEIRA[1] - 0.05, () => { const q = iw(s.x + CABECEIRA[0], s.y + CABECEIRA[1]); bonecoSentado(c, q.x, q.y, "cs", "idle", op.quadro); });
      const decorrido = op.reuniaoDesde != null ? op.t - op.reuniaoDesde : 999;
      op.reuniao.slice(0, ASSENTOS.length).forEach((est, i) => {
        const [ax, ay] = ASSENTOS[i];
        // chegada escalonada: cada CS entra ~0.35s depois do anterior, deslizando e esmaecendo até o lugar
        // (duração generosa de propósito: tem que dar pra notar olhando a tela, não só em câmera lenta)
        const prog = clamp((decorrido - i * 0.35) / 0.9, 0, 1);
        if (prog <= 0) return;
        const suave = prog * prog * (3 - 2 * prog); // smoothstep
        add(s.x + ax + s.y + ay - 0.05, () => {
          const q = iw(s.x + ax, s.y + ay);
          c.save();
          c.globalAlpha = suave;
          const escala = 0.7 + 0.3 * suave;
          const dy = (1 - suave) * 16; // desliza de baixo para cima até sentar
          c.translate(q.x, q.y + dy);
          c.scale(escala, escala);
          bonecoSentado(c, 0, 0, LOOKS[i], est === "pensando" ? "working" : "idle", op.quadro);
          c.restore();
        });
      });
    }
    add(s.x + 2 + s.y + 0.4, () => { const q = iw(s.x + 2.5, s.y + 0.6); ret(c, q.x - 9, q.y - 20, 18, 11, OUT); ret(c, q.x - 8, q.y - 19, 16, 9, "#0f172a"); ret(c, q.x - 6, q.y - 17, 5, 2, "#38bdf8"); ret(c, q.x - 6, q.y - 13, 10, 1.5, "#64748b"); });
  }
  add(s.x + LADO - 1 + s.y + 0.3, () => { const q = iw(s.x + LADO - 0.5, s.y + 0.5); planta(c, q.x, q.y, op.quadro); });
}

/** Sala sem cliente: lounge com sofá, mesa de centro, estante e plantas. */
function lounge(c: CanvasRenderingContext2D, s: { x: number; y: number }, op: OpcoesMundo, add: (d: number, f: () => void) => void, sombra: (gx: number, gy: number, esc?: number) => void) {
  sombra(s.x + 1, s.y); sombra(s.x + 2, s.y); sombra(s.x + 3, s.y); sombra(s.x + 1, s.y + 2); sombra(s.x + 2, s.y + 2);
  add(s.x + 1 + s.y + 0.2, () => sofa(c, s.x + 1, s.y));
  add(s.x + 3 + s.y + 0.2, () => estante(c, iw(s.x + 3, s.y)));
  add(s.x + 2 + s.y + 2.4, () => {
    const q = iw(s.x + 2, s.y + 2);
    caixa(c, q.x, q.y, 4, "#e5e7eb", "#9ca3af", "#cbd5e1");
    ret(c, q.x - 4, q.y - 7, 5, 2, "#38bdf8"); ret(c, q.x - 4, q.y - 7, 5, 0.5, "#e0f2fe");
    ret(c, q.x + 2, q.y - 8, 2.5, 2.5, "#f8fafc"); ret(c, q.x + 2, q.y - 8, 2.5, 0.5, "#92400e");
    const v = op.quadro % 6;
    ret(c, q.x + 2.75 + (v % 2) * 0.5, q.y - 9.5 - v * 0.5, 0.5, 1, `rgba(255,255,255,${(0.6 - v * 0.08).toFixed(2)})`);
  });
  add(s.x + LADO - 1 + s.y + 0.3, () => { const q = iw(s.x + LADO - 0.5, s.y + 0.5); planta(c, q.x, q.y, op.quadro + s.x); });
  add(s.x + s.y + LADO - 1 + 0.3, () => { const q = iw(s.x + 0.5, s.y + LADO - 0.5); planta(c, q.x, q.y, op.quadro + s.y); });
}

function colega(c: CanvasRenderingContext2D, x: number, y: number, cor: string, passo: number) {
  ret(c, x - 2, y - 0.5, 4, 1, "rgba(8,14,28,0.22)");
  ret(c, x - 1.25, y - 3, 1, 3 - (passo ? 0.5 : 0), "#1e293b"); ret(c, x + 0.25, y - 3, 1, 3 - (passo ? 0 : 0.5), "#1e293b");
  ret(c, x - 1.75, y - 6.5, 3.5, 3.5, cor); ret(c, x - 1.25, y - 9, 2.5, 2.5, "#f1c9a5"); ret(c, x - 1.25, y - 9.5, 2.5, 1, "#3b2a1b");
}

export type EstadoReuniao = "chegando" | "pensando" | "pronto" | "erro";

export interface OpcoesMundo {
  /** Andar desenhado (padrão: jacqes). */
  andar?: AndarId;
  /** CSs sentados na sala de reuniões (vazio fora da reunião). */
  reuniao?: EstadoReuniao[];
  /** Tempo de simulação (o mesmo de `t`) em que a reunião atual começou a ser mostrada; null fora da reunião. Anima a chegada escalonada dos CSs. */
  reuniaoDesde?: number | null;
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
  const andar = op.andar ?? "jacqes";
  const bg = fundo(predios, op.hora, andar);
  if (bg) c.drawImage(bg, 0, 0);
  c.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
  if (!bg) cenarioEstatico(c, predios, op.hora, andar);

  relogioParede(c, op.hora);

  const itens: Item[] = [];
  const add = (d: number, f: () => void) => itens.push({ d, f });
  const sombras: [number, number, number][] = [];
  const sombra = (gx: number, gy: number, esc = 1) => { sombras.push([gx, gy, esc]); };
  corredor(c, op, add, sombra);

  for (const p of predios) {
    salaCliente(c, p, op, add, sombra);
    add(p.x + p.w + p.y + p.h + 0.2, () => vidroFrontal(c, p, TEMAS[p.empresa.tema % TEMAS.length].paredeD));
  }
  SLOTS.forEach((s, i) => {
    if (predios.some((p) => p.x === s.x && p.y === s.y)) return;
    if (SLOTS_CLIENTES.includes(i)) lounge(c, s, op, add, sombra);
    else if (i === 0) areaDaCasa(c, s, "diretoria", op, add);
    else if (i === 5 && andar === "caza") estudio(c, s, add);
    else if (i === 5) areaDaCasa(c, s, "reunioes", op, add);
  });
  for (const [gx, gy] of [[0, 6.5], [17, 6.5], [6, 12], [12, 0]] as const) add(gx + gy + 0.3, () => { const q = iw(gx + 0.5, gy + 0.5); planta(c, q.x, q.y, op.quadro + gx); });
  if (!op.reduzido) {
    for (let i = 0; i < 4; i++) {
      const u = 0.5 + 0.5 * Math.sin(op.t * (0.3 + i * 0.06) + i * 2.1);
      const eixoX = i % 2 === 0;
      const along = 1 + u * (eixoX ? GWm - 2 : GHm - 2);
      const fixo = eixoX ? 6.5 + (i === 2 ? 0.6 : 0) : 6.4 + (i === 3 ? 5.6 : 0);
      const q = eixoX ? iw(along, fixo) : iw(fixo, along);
      add((eixoX ? along + fixo : fixo + along) + 0.2, () => colega(c, q.x, q.y, ["#f97316", "#06b6d4", "#e11d48", "#84cc16"][i], Math.floor(op.t * 5 + i) % 2));
    }
  }

  for (const [gx, gy, esc] of sombras) sombraNoChao(c, gx, gy, esc);
  itens.sort((a, b) => a.d - b.d);
  for (const it of itens) it.f();
  if (!op.reduzido) poeira(c, op.hora, op.t);

  // brilho das telas ligadas (mais forte à noite e pulsando de leve)
  {
    const noite = 1 - luzDoDia(op.hora);
    c.save();
    c.globalCompositeOperation = "lighter";
    predios.forEach((p, n) => {
      const est = p.empresa.estados;
      if (!est) return;
      AGENTES.forEach((a, k) => {
        if (est[a] !== "working") return;
        const [dx, dy] = MESAS_SALA[a];
        const q = iw(p.x + dx + 1, p.y + dy);
        const pulso = op.reduzido ? 1 : 0.85 + 0.15 * Math.sin(op.t * 3 + n * 1.3 + k);
        const g = c.createRadialGradient(q.x + 9, q.y - 9, 1, q.x + 9, q.y - 9, 16);
        g.addColorStop(0, `rgba(120,190,255,${((0.12 + 0.2 * noite) * pulso).toFixed(3)})`);
        g.addColorStop(1, "rgba(120,190,255,0)");
        c.fillStyle = g; c.beginPath(); c.arc(q.x + 9, q.y - 9, 16, 0, Math.PI * 2); c.fill();
      });
    });
    c.restore();
  }

  faixaDoAndar(c, andar, predios.length);

  for (const p of predios) {
    rotulo(c, p, op);
    const e = p.empresa.estados;
    if (e) {
      AGENTES.forEach((a) => {
        const [dx, dy] = MESAS_SALA[a];
        const q = iw(p.x + dx + 0.5, p.y + dy - 0.5);
        const st = e[a];
        if (st === "working") balaoMini(c, q.x, q.y - 34, "pontos", op.quadro);
        else if (st === "done") balaoMini(c, q.x, q.y - 34, "ok", op.quadro);
        else if (st === "error") balaoMini(c, q.x, q.y - 34, "erro", op.quadro);
      });
    }
    if (op.hover === p.empresa.bu || op.selecionado === p.empresa.bu) {
      const t = iw(p.x, p.y), r = iw(p.x + p.w, p.y), l = iw(p.x, p.y + p.h);
      c.fillStyle = "rgba(251,191,36,0.95)";
      for (let i = 0; i < p.w * 32; i++) { c.fillRect(t.x + i * 0.5, t.y + i * 0.25, 0.5, 0.5); c.fillRect(l.x + i * 0.5, l.y + i * 0.25, 0.5, 0.5); }
      for (let i = 0; i < p.h * 32; i++) { c.fillRect(t.x - i * 0.5, t.y + i * 0.25, 0.5, 0.5); c.fillRect(r.x - i * 0.5, r.y + i * 0.25, 0.5, 0.5); }
    }
  }

  if (op.reuniao) {
    const sl = SLOTS[5];
    const decorrido = op.reuniaoDesde != null ? op.t - op.reuniaoDesde : 999;
    op.reuniao.slice(0, ASSENTOS.length).forEach((est, i) => {
      // só mostra o balão depois que o CS terminou de "chegar" (evita balão flutuando sobre a cadeira vazia)
      if (decorrido - i * 0.35 < 0.9) return;
      const [ax, ay] = ASSENTOS[i];
      const q = iw(sl.x + ax, sl.y + ay);
      if (est === "pensando") balaoMini(c, q.x, q.y - 36, "pontos", op.quadro);
      else if (est === "pronto") balaoMini(c, q.x, q.y - 36, "ok", op.quadro);
      else if (est === "erro") balaoMini(c, q.x, q.y - 36, "erro", op.quadro);
    });
  }

  const escuro = 1 - luzDoDia(op.hora);
  if (escuro > 0.02) {
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = `rgba(6,12,38,${(0.5 * escuro).toFixed(3)})`;
    c.fillRect(0, 0, WW, WH);
    c.restore();
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const p of predios) {
      const q = iw(p.x + p.w / 2, p.y + p.h / 2);
      const forte = p.empresa.trabalhando > 0 ? 0.38 : 0.2;
      const g = c.createRadialGradient(q.x, q.y - 6, 2, q.x, q.y - 6, 34);
      g.addColorStop(0, `rgba(255,205,120,${(forte * escuro).toFixed(3)})`); g.addColorStop(1, "rgba(255,205,120,0)");
      c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y - 6, 34, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  // vinheta suave nas bordas da planta
  c.save();
  c.globalCompositeOperation = "source-atop";
  const vg = c.createRadialGradient(WW / 2, WH / 2 + 8, 90, WW / 2, WH / 2 + 8, 250);
  vg.addColorStop(0, "rgba(6,10,28,0)");
  vg.addColorStop(1, "rgba(6,10,28,0.2)");
  c.fillStyle = vg;
  c.fillRect(0, 0, WW, WH);
  c.restore();
}
