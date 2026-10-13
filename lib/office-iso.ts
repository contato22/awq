/**
 * Escritório isométrico do Office (estilo The Sims): mundo, comportamento dos
 * personagens e desenho em canvas. Sem React e sem imagens externas: tudo é
 * retângulo desenhado em código, em resolução lógica de 480x300.
 *
 * Os agentes são autônomos: sentam e digitam quando trabalham, e quando estão
 * ociosos vão tomar café, beber água, sentar no sofá ou usar a impressora. O CS
 * caminha até a mesa do agente que começa a trabalhar (a "entrega" da demanda) e
 * o gestor, que você controla, caminha até o CS quando ele começa a responder.
 */

export type Papel = "gestor" | "cs" | "ref" | "criativo" | "midia";
export type Agente = Exclude<Papel, "gestor">;
export type Estado = "idle" | "working" | "done" | "error";
export type Humor = "ok" | "atencao" | "critico";

export interface Pt { x: number; y: number }

export const W = 448;
export const H = 268;
export const GW = 12;
export const GH = 11;
const OX = 224;
const OY = 70;
const WALL_H = 44;

export interface Tema {
  piso: [string, string];
  tapete: [string, string];
  paredeD: string;
  paredeE: string;
  rodape: string;
}

export const TEMAS: Tema[] = [
  { piso: ["#d6dcea", "#c8d0e2"], tapete: ["#8fa3d1", "#8196c7"], paredeD: "#3d5190", paredeE: "#2f4075", rodape: "#1f2a52" },
  { piso: ["#d8e6d6", "#c9dcc6"], tapete: ["#8fc29a", "#82b58d"], paredeD: "#3f7a5b", paredeE: "#2f6048", rodape: "#1f4332" },
  { piso: ["#ecd9df", "#e3cbd3"], tapete: ["#d79bb0", "#cb8da4"], paredeD: "#a24d6d", paredeE: "#823c56", rodape: "#5c2a3d" },
  { piso: ["#ebe0cb", "#e1d3b8"], tapete: ["#dcb877", "#d0aa68"], paredeD: "#a87a2e", paredeE: "#85601f", rodape: "#5c4314" },
];

// ── Planta ─────────────────────────────────────────────────────────────────────

export const ASSENTOS: Record<Papel, Pt> = {
  gestor: { x: 2, y: 0 },
  cs: { x: 6, y: 2 },
  ref: { x: 2, y: 5 },
  criativo: { x: 6, y: 6 },
  midia: { x: 9, y: 4 },
};

/** Tile na frente da mesa, onde quem visita fica de pé. */
const VISITA: Record<Papel, Pt> = {
  gestor: { x: 2, y: 2 },
  cs: { x: 6, y: 4 },
  ref: { x: 2, y: 7 },
  criativo: { x: 6, y: 8 },
  midia: { x: 9, y: 6 },
};

const MESAS: { papel: Papel; x: number; y: number }[] = [
  { papel: "gestor", x: 2, y: 1 },
  { papel: "cs", x: 6, y: 3 },
  { papel: "ref", x: 2, y: 6 },
  { papel: "criativo", x: 6, y: 7 },
  { papel: "midia", x: 9, y: 5 },
];

type Lazer = { p: Pt; tipo: "cafe" | "agua" | "sofa" | "impressora" };
const LAZER: Lazer[] = [
  { p: { x: 1, y: 3 }, tipo: "cafe" },
  { p: { x: 1, y: 5 }, tipo: "agua" },
  { p: { x: 1, y: 9 }, tipo: "sofa" },
  { p: { x: 9, y: 2 }, tipo: "impressora" },
];

const CORES: Record<Papel, { corpo: string; cabelo: string; nome: string }> = {
  gestor: { corpo: "#334155", cabelo: "#1f2937", nome: "Gestor" },
  cs: { corpo: "#0487D9", cabelo: "#5b3a1e", nome: "CS" },
  ref: { corpo: "#0e7490", cabelo: "#111827", nome: "Referências" },
  criativo: { corpo: "#7c3aed", cabelo: "#b45309", nome: "Criativo" },
  midia: { corpo: "#059669", cabelo: "#374151", nome: "Mídia" },
};

const PELE = "#f1c9a5";

function montarBloqueios(): boolean[][] {
  const b: boolean[][] = Array.from({ length: GH }, () => Array<boolean>(GW).fill(false));
  const bloquear = (x: number, y: number, w = 1, h = 1) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (b[j]?.[i] !== undefined) b[j][i] = true;
  };
  for (const m of MESAS) bloquear(m.x, m.y, 2, 1);
  bloquear(0, 3); // café
  bloquear(0, 5); // bebedouro
  bloquear(1, 8, 1, 3); // sofá
  bloquear(3, 9); // mesinha
  bloquear(9, 1); // impressora
  bloquear(5, 0, 3, 1); // estante
  bloquear(11, 0); bloquear(0, 0); bloquear(0, 10); bloquear(11, 10); // plantas
  b[9][1] = false; // assento do sofá (1,9) é livre
  return b;
}

export function caminho(bloq: boolean[][], de: Pt, para: Pt): Pt[] | null {
  if (de.x === para.x && de.y === para.y) return [];
  const chave = (p: Pt) => p.y * GW + p.x;
  const anterior = new Map<number, Pt | null>();
  anterior.set(chave(de), null);
  const fila: Pt[] = [de];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < fila.length; i++) {
    const p = fila[i];
    for (const [dx, dy] of dirs) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (q.x < 0 || q.y < 0 || q.x >= GW || q.y >= GH) continue;
      if (anterior.has(chave(q))) continue;
      if (bloq[q.y][q.x] && !(q.x === para.x && q.y === para.y)) continue;
      anterior.set(chave(q), p);
      if (q.x === para.x && q.y === para.y) {
        const rota: Pt[] = [];
        let c: Pt | null = q;
        while (c && !(c.x === de.x && c.y === de.y)) { rota.unshift(c); c = anterior.get(chave(c)) ?? null; }
        return rota;
      }
      fila.push(q);
    }
  }
  return null;
}

// ── Mundo e comportamento ──────────────────────────────────────────────────────

type Modo = "mesa" | "vagando" | "visita";

export interface Ator {
  x: number;
  y: number;
  path: Pt[];
  modo: Modo;
  espera: number;
  noDestino: boolean;
  lazer: Lazer["tipo"] | null;
  dx: number;
  dy: number;
  fase: number;
}

export interface Mundo {
  atores: Record<Papel, Ator>;
  bloq: boolean[][];
  t: number;
  prev: Record<Agente, Estado>;
  reduzido: boolean;
  selecionado: Papel | null;
  hover: Papel | null;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function criarMundo(reduzido: boolean): Mundo {
  const atores = {} as Record<Papel, Ator>;
  (Object.keys(ASSENTOS) as Papel[]).forEach((p, i) => {
    const s = ASSENTOS[p];
    atores[p] = {
      x: s.x + 0.5, y: s.y + 0.5, path: [], modo: "mesa", espera: rnd(4, 12) + i,
      noDestino: false, lazer: null, dx: 0, dy: 1, fase: 0,
    };
  });
  return {
    atores, bloq: montarBloqueios(), t: 0,
    prev: { cs: "idle", ref: "idle", criativo: "idle", midia: "idle" },
    reduzido, selecionado: null, hover: null,
  };
}

function tileDe(a: Ator): Pt { return { x: Math.floor(a.x), y: Math.floor(a.y) }; }

function irPara(m: Mundo, a: Ator, pt: Pt) {
  a.path = caminho(m.bloq, tileDe(a), pt) ?? [];
}

function mover(a: Ator, dt: number) {
  if (a.path.length === 0) return;
  const alvo = a.path[0];
  const tx = alvo.x + 0.5;
  const ty = alvo.y + 0.5;
  const dx = tx - a.x;
  const dy = ty - a.y;
  const dist = Math.hypot(dx, dy);
  const passo = 2.6 * dt;
  a.dx = dx; a.dy = dy;
  a.fase += dt * 9;
  if (dist <= passo) { a.x = tx; a.y = ty; a.path.shift(); }
  else { a.x += (dx / dist) * passo; a.y += (dy / dist) * passo; }
}

export function noAssento(m: Mundo, p: Papel): boolean {
  const a = m.atores[p];
  const s = ASSENTOS[p];
  return a.path.length === 0 && Math.floor(a.x) === s.x && Math.floor(a.y) === s.y;
}

function noLazerSofa(a: Ator): boolean {
  return a.modo === "vagando" && a.lazer === "sofa" && a.path.length === 0 && a.noDestino;
}

export function sentado(m: Mundo, p: Papel): boolean {
  return (m.atores[p].modo === "mesa" && noAssento(m, p)) || noLazerSofa(m.atores[p]);
}

function voltarParaMesa(m: Mundo, p: Papel) {
  const a = m.atores[p];
  a.modo = "mesa"; a.noDestino = false; a.lazer = null;
  a.espera = rnd(8, 16);
  irPara(m, a, ASSENTOS[p]);
}

function visitar(m: Mundo, visitante: Papel, mesaDe: Papel) {
  const a = m.atores[visitante];
  if (a.modo === "visita") return;
  a.modo = "visita"; a.noDestino = false; a.lazer = null;
  irPara(m, a, VISITA[mesaDe]);
}

/** O gestor (você) clica no chão: o avatar anda até lá e depois volta para a mesa. */
export function moverGestor(m: Mundo, tile: Pt) {
  if (tile.x < 0 || tile.y < 0 || tile.x >= GW || tile.y >= GH || m.bloq[tile.y][tile.x]) return;
  const a = m.atores.gestor;
  if (m.reduzido) return;
  a.modo = "vagando"; a.noDestino = false; a.lazer = null;
  irPara(m, a, tile);
}

export function passo(m: Mundo, dt: number, estados: Record<Agente, Estado>) {
  m.t += dt;
  const agentes: Agente[] = ["cs", "ref", "criativo", "midia"];

  for (const p of agentes) {
    const st = estados[p];
    const a = m.atores[p];
    if (st === "working" && m.prev[p] !== "working") {
      if (p === "cs") visitar(m, "gestor", "cs");
      else if (m.atores.cs.modo !== "visita" && estados.cs !== "working") visitar(m, "cs", p);
    }
    m.prev[p] = st;

    if (m.reduzido) {
      const s = ASSENTOS[p];
      a.x = s.x + 0.5; a.y = s.y + 0.5; a.path = []; a.modo = "mesa";
      continue;
    }

    if (st === "working" && a.modo !== "mesa") voltarParaMesa(m, p);

    if (a.modo === "mesa") {
      if (!noAssento(m, p) && a.path.length === 0) irPara(m, a, ASSENTOS[p]);
      mover(a, dt);
      if (noAssento(m, p) && st !== "working") {
        a.espera -= dt;
        if (a.espera <= 0) {
          const l = LAZER[Math.floor(Math.random() * LAZER.length)];
          a.modo = "vagando"; a.noDestino = false; a.lazer = l.tipo;
          irPara(m, a, l.p);
        }
      }
    } else if (a.modo === "vagando") {
      mover(a, dt);
      if (a.path.length === 0) {
        if (!a.noDestino) { a.noDestino = true; a.espera = rnd(6, 10); }
        else { a.espera -= dt; if (a.espera <= 0) voltarParaMesa(m, p); }
      }
    } else {
      mover(a, dt);
      if (a.path.length === 0) {
        if (!a.noDestino) { a.noDestino = true; a.espera = 2.8; }
        else { a.espera -= dt; if (a.espera <= 0) voltarParaMesa(m, p); }
      }
    }
  }

  // gestor (avatar do jogador)
  const g = m.atores.gestor;
  if (m.reduzido) {
    const s = ASSENTOS.gestor; g.x = s.x + 0.5; g.y = s.y + 0.5; g.path = []; g.modo = "mesa";
    return;
  }
  mover(g, dt);
  if (g.modo === "mesa") {
    if (!noAssento(m, "gestor") && g.path.length === 0) irPara(m, g, ASSENTOS.gestor);
  } else if (g.path.length === 0) {
    if (!g.noDestino) { g.noDestino = true; g.espera = g.modo === "visita" ? 3.2 : 14; }
    else { g.espera -= dt; if (g.espera <= 0) voltarParaMesa(m, "gestor"); }
  }
}

// ── Projeção ───────────────────────────────────────────────────────────────────

export function isoC(px: number, py: number): Pt {
  return { x: OX + (px - py) * 16, y: OY + (px + py) * 8 };
}

/** Converte um ponto da tela lógica para o tile do chão (ou null se fora). */
export function tileDoPonto(x: number, y: number): Pt | null {
  const u = (x - OX) / 16;
  const v = (y - OY) / 8;
  const tx = Math.floor((u + v) / 2);
  const ty = Math.floor((v - u) / 2);
  if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return null;
  return { x: tx, y: ty };
}

/** Ator sob o ponto da tela lógica, se houver. */
export function atorNoPonto(m: Mundo, x: number, y: number): Papel | null {
  let melhor: Papel | null = null;
  let melhorD = -1;
  (Object.keys(m.atores) as Papel[]).forEach((p) => {
    const a = m.atores[p];
    const c = isoC(a.x, a.y);
    if (x >= c.x - 8 && x <= c.x + 8 && y >= c.y - 24 && y <= c.y + 3) {
      const d = a.x + a.y;
      if (d > melhorD) { melhorD = d; melhor = p; }
    }
  });
  return melhor;
}

// ── Desenho ────────────────────────────────────────────────────────────────────

function ret(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cor: string) {
  c.fillStyle = cor;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Losango 32x16 nítido (linha a linha), com o vértice superior em (x, y). */
function losango(c: CanvasRenderingContext2D, x: number, y: number, cor: string) {
  c.fillStyle = cor;
  for (let i = 0; i < 16; i++) {
    const w = i < 8 ? 4 * (i + 1) : 4 * (16 - i);
    c.fillRect(Math.round(x - w / 2), Math.round(y + i), w, 1);
  }
}

function contorno(c: CanvasRenderingContext2D, x: number, y: number, cor: string) {
  c.fillStyle = cor;
  for (let i = 0; i < 16; i++) {
    const w = i < 8 ? 4 * (i + 1) : 4 * (16 - i);
    c.fillRect(Math.round(x - w / 2), Math.round(y + i), 2, 1);
    c.fillRect(Math.round(x + w / 2 - 2), Math.round(y + i), 2, 1);
  }
  c.fillRect(Math.round(x - 2), Math.round(y), 4, 1);
  c.fillRect(Math.round(x - 2), Math.round(y + 15), 4, 1);
}

/** Cubo de um tile com altura h; (x, y) é o vértice superior do losango no chão. */
function caixa(c: CanvasRenderingContext2D, x: number, y: number, h: number, topo: string, esq: string, dir: string) {
  for (let i = 0; i < 16; i++) {
    c.fillStyle = esq;
    c.fillRect(Math.round(x - 16 + i), Math.round(y - h + 8 + Math.floor(i / 2)), 1, h);
    c.fillStyle = dir;
    c.fillRect(Math.round(x + i), Math.round(y - h + 16 - Math.floor(i / 2)), 1, h);
  }
  losango(c, x, y - h, topo);
}

function mistura(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

function sombreia(cor: string, f: number): string {
  return mistura(cor, f < 0 ? "#000000" : "#ffffff", Math.abs(f));
}

function luzDoDia(hora: number): number {
  // 0 = noite fechada, 1 = dia pleno
  if (hora >= 7 && hora <= 17) return 1;
  if (hora > 17 && hora < 19.5) return 1 - (hora - 17) / 2.5;
  if (hora >= 5 && hora < 7) return (hora - 5) / 2;
  return 0;
}

function ceu(hora: number): { topo: string; base: string } {
  const l = luzDoDia(hora);
  const dia = { topo: "#7dd3fc", base: "#bae6fd" };
  const noite = { topo: "#0f172a", base: "#1e293b" };
  const poente = { topo: "#fb923c", base: "#fde68a" };
  const amanhecer = hora < 12;
  if (l >= 1) return dia;
  if (l <= 0) return noite;
  const meio = amanhecer ? { topo: "#f9a8d4", base: "#fde68a" } : poente;
  return l > 0.5
    ? { topo: mistura(meio.topo, dia.topo, (l - 0.5) * 2), base: mistura(meio.base, dia.base, (l - 0.5) * 2) }
    : { topo: mistura(noite.topo, meio.topo, l * 2), base: mistura(noite.base, meio.base, l * 2) };
}

function desenharParedes(c: CanvasRenderingContext2D, tema: Tema, hora: number) {
  const sky = ceu(hora);
  const noite = luzDoDia(hora) < 0.4;
  // parede direita (ao longo de gx, em gy=0)
  for (let x = OX; x < OX + GW * 16; x++) {
    const base = OY + Math.floor((x - OX) / 2);
    ret(c, x, base - WALL_H, 1, WALL_H, tema.paredeD);
    ret(c, x, base - 4, 1, 4, tema.rodape);
    ret(c, x, base - WALL_H, 1, 2, sombreia(tema.paredeD, 0.25));
  }
  // parede esquerda (ao longo de gy, em gx=0)
  for (let x = OX - GH * 16; x < OX; x++) {
    const base = OY + Math.floor((OX - x) / 2);
    ret(c, x, base - WALL_H, 1, WALL_H, tema.paredeE);
    ret(c, x, base - 4, 1, 4, tema.rodape);
    ret(c, x, base - WALL_H, 1, 2, sombreia(tema.paredeE, 0.2));
  }
  // janelas: trechos em tiles ao longo de cada parede
  const janelas: { lado: "D" | "E"; a: number; b: number }[] = [
    { lado: "D", a: 8.4, b: 10.6 }, { lado: "E", a: 1.2, b: 2.8 }, { lado: "E", a: 6.2, b: 8.2 },
  ];
  for (const j of janelas) {
    for (let t = 0; t < (j.b - j.a) * 16; t++) {
      const x = j.lado === "D" ? OX + Math.floor(j.a * 16) + t : OX - Math.floor(j.b * 16) + t;
      const base = j.lado === "D" ? OY + Math.floor((x - OX) / 2) : OY + Math.floor((OX - x) / 2);
      const top = base - WALL_H + 9;
      const alto = 22;
      const borda = t < 2 || t >= (j.b - j.a) * 16 - 2;
      ret(c, x, top - 2, 1, alto + 4, "#e2e8f0");
      if (!borda) {
        ret(c, x, top, 1, Math.floor(alto / 2), sky.topo);
        ret(c, x, top + Math.floor(alto / 2), 1, Math.ceil(alto / 2), sky.base);
        if (t === Math.floor(((j.b - j.a) * 16) / 2)) ret(c, x, top, 1, alto, "#e2e8f0");
        if (noite && (t * 7 + (j.a * 13 | 0)) % 17 === 0) ret(c, x, top + 3 + (t % 5), 1, 1, "#f8fafc");
      }
    }
    // peitoril
  }
  // sol/lua
  const l = luzDoDia(hora);
  if (l > 0.05 && l < 1) {
    // luz do poente/amanhecer na janela direita
  }
}

function desenharPiso(c: CanvasRenderingContext2D, tema: Tema) {
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const p = isoC(x, y);
      const tapete = x >= 4 && x <= 9 && y >= 3 && y <= 8;
      losango(c, p.x, p.y, tapete ? tema.tapete[(x + y) % 2] : tema.piso[(x + y) % 2]);
    }
  }
  // espessura do piso nas duas bordas da frente
  const x0 = OX - GH * 16;
  for (let i = 0; i < GW * 16; i++) ret(c, x0 + i, OY + GH * 8 + Math.floor(i / 2), 1, 5, "#475569");
  const x1 = OX + (GW - GH) * 16;
  for (let i = 0; i < GH * 16; i++) ret(c, x1 + i, OY + (GW + GH) * 8 - Math.floor(i / 2), 1, 5, "#334155");
}

type Item = { d: number; f: () => void };

function monitor(c: CanvasRenderingContext2D, cx: number, cy: number, st: Estado | "off", f: number) {
  ret(c, cx - 7, cy - 11, 14, 11, "#0f172a");
  ret(c, cx - 1, cy, 2, 2, "#475569");
  const base = st === "error" ? "#7f1d1d" : st === "done" ? "#14532d" : st === "working" ? "#0c4a6e" : "#111827";
  ret(c, cx - 6, cy - 10, 12, 8, base);
  if (st === "working") {
    [8, 6, 9, 5].forEach((w, i) => ret(c, cx - 5, cy - 9 + i * 2, Math.min(10, Math.max(2, ((w + f + i * 2) % 9) + 2)), 1, i % 2 ? "#7dd3fc" : "#38bdf8"));
  } else if (st === "done") {
    ret(c, cx - 3, cy - 6, 2, 2, "#86efac"); ret(c, cx - 1, cy - 5, 2, 2, "#86efac"); ret(c, cx + 1, cy - 8, 2, 4, "#86efac");
  } else if (st === "error") {
    ret(c, cx - 1, cy - 9, 2, 4, "#fca5a5"); ret(c, cx - 1, cy - 4, 2, 1, "#fca5a5");
  }
}

function balao(c: CanvasRenderingContext2D, cx: number, y: number, tipo: "pontos" | "ok" | "erro" | "ask" | "cafe", f: number) {
  const w = 18;
  const x = Math.round(cx - w / 2);
  ret(c, x, y, w, 11, "#0f172a");
  ret(c, x + 1, y + 1, w - 2, 9, "#ffffff");
  ret(c, cx - 1, y + 11, 3, 2, "#0f172a");
  ret(c, cx, y + 10, 1, 2, "#ffffff");
  if (tipo === "pontos") {
    const n = (f % 3) + 1;
    for (let i = 0; i < 3; i++) ret(c, x + 4 + i * 4, y + 5, 2, 2, i < n ? "#0f172a" : "#cbd5e1");
  } else if (tipo === "ok") {
    ret(c, x + 5, y + 5, 2, 2, "#16a34a"); ret(c, x + 7, y + 6, 2, 2, "#16a34a"); ret(c, x + 9, y + 3, 2, 4, "#16a34a"); ret(c, x + 11, y + 2, 2, 2, "#16a34a");
  } else if (tipo === "erro") {
    ret(c, x + 8, y + 2, 2, 5, "#dc2626"); ret(c, x + 8, y + 8, 2, 1, "#dc2626");
  } else if (tipo === "cafe") {
    ret(c, x + 6, y + 4, 5, 4, "#92400e"); ret(c, x + 11, y + 5, 1, 2, "#92400e"); ret(c, x + 7, y + 2 - (f % 2), 1, 1, "#94a3b8");
  } else {
    ret(c, x + 7, y + 2, 4, 2, "#d97706"); ret(c, x + 9, y + 4, 2, 2, "#d97706"); ret(c, x + 8, y + 6, 2, 1, "#d97706"); ret(c, x + 8, y + 8, 2, 1, "#d97706");
  }
}

export interface OpcoesDesenho {
  tema: Tema;
  hora: number;
  estados: Record<Agente, Estado>;
  aguardandoGestor: boolean;
  humor: Record<Agente, Humor>;
}

function desenharAtor(c: CanvasRenderingContext2D, m: Mundo, p: Papel, op: OpcoesDesenho, quadro: number) {
  const a = m.atores[p];
  const cor = CORES[p];
  const pos = isoC(a.x, a.y);
  const cx = Math.round(pos.x);
  const cy = Math.round(pos.y);
  const sent = sentado(m, p);
  const andando = a.path.length > 0 && !m.reduzido;
  const trabalhando = p !== "gestor" && op.estados[p as Agente] === "working" && sent;
  const frente = a.dx + a.dy >= 0;
  const direita = a.dx - a.dy > 0;
  const subida = sent ? 6 : 0;
  const passoPerna = andando ? Math.round(Math.sin(a.fase)) : 0;

  ret(c, cx - 5, cy - 1, 10, 2, "rgba(0,0,0,0.22)");
  if (!sent) {
    ret(c, cx - 3, cy - 5 + (passoPerna > 0 ? 1 : 0), 2, 5 - (passoPerna > 0 ? 1 : 0), "#1e293b");
    ret(c, cx + 1, cy - 5 + (passoPerna < 0 ? 1 : 0), 2, 5 - (passoPerna < 0 ? 1 : 0), "#1e293b");
  }
  const yc = cy - 12 + subida;
  // braços
  const braco = trabalhando ? (quadro % 2 ? 0 : 1) : andando ? passoPerna : 0;
  ret(c, cx - 6, yc + 1 + (trabalhando ? 2 : 0) + (braco > 0 ? 1 : 0), 2, 6, cor.corpo);
  ret(c, cx + 4, yc + 1 + (trabalhando ? 2 : 0) + (braco < 0 ? 1 : 0), 2, 6, cor.corpo);
  ret(c, cx - 6, yc + 7 + (trabalhando ? 2 : 0), 2, 1, PELE);
  ret(c, cx + 4, yc + 7 + (trabalhando ? 2 : 0), 2, 1, PELE);
  // tronco
  ret(c, cx - 4, yc, 8, 7, cor.corpo);
  if (frente) ret(c, cx - 1, yc, 2, 2, "#ffffff");
  // cabeça
  ret(c, cx - 3, yc - 7, 6, 7, PELE);
  ret(c, cx - 4, yc - 8, 8, 3, cor.cabelo);
  if (!frente) ret(c, cx - 3, yc - 5, 6, 3, cor.cabelo);
  else {
    ret(c, cx - 4, yc - 6, 1, 3, cor.cabelo);
    const ox = direita ? 1 : -1;
    ret(c, cx - 2 + (sent ? 0 : Math.max(0, ox)), yc - 4, 1, 2, "#0f172a");
    ret(c, cx + 1 + (sent ? 0 : Math.min(0, ox)), yc - 4, 1, 2, "#0f172a");
  }
}

/** Desenha a cena toda. `quadro` é um contador inteiro para animações curtas. */
export function desenhar(c: CanvasRenderingContext2D, m: Mundo, op: OpcoesDesenho, quadro: number) {
  const luz = luzDoDia(op.hora);
  c.clearRect(0, 0, W, H);
  ret(c, 0, 0, W, H, "#0b1220");
  desenharParedes(c, op.tema, op.hora);
  desenharPiso(c, op.tema);

  const itens: Item[] = [];
  const add = (d: number, f: () => void) => itens.push({ d, f });

  // mesas
  for (const mesa of MESAS) {
    const dono = mesa.papel;
    const st: Estado | "off" = dono === "gestor" ? "off" : op.estados[dono as Agente];
    for (let i = 0; i < 2; i++) {
      add(mesa.x + i + mesa.y, () => {
        const p = isoC(mesa.x + i, mesa.y);
        caixa(c, p.x, p.y, 10, "#b98450", "#8a5a2e", "#a06c3c");
        if (i === 0) ret(c, p.x - 4, p.y - 4, 8, 2, "#94a3b8");
        if (i === 1) monitor(c, p.x + 1, p.y - 2, st, quadro);
        if (i === 0 && dono === "gestor") { ret(c, p.x - 7, p.y - 6, 6, 3, "#f8fafc"); ret(c, p.x - 6, p.y - 5, 4, 1, "#94a3b8"); }
      });
    }
    // cadeira
    const s = ASSENTOS[dono];
    add(s.x + s.y - 0.1, () => {
      const p = isoC(s.x + 0.5, s.y + 0.5);
      ret(c, p.x - 5, p.y - 8, 10, 8, "#334155");
      ret(c, p.x - 5, p.y - 14, 10, 6, "#475569");
    });
  }

  // lazer: café, bebedouro, sofá, mesinha, impressora, estante, plantas
  add(0 + 3 + 0.2, () => {
    const p = isoC(0.5, 3.5);
    ret(c, p.x - 5, p.y - 18, 10, 18, "#1f2937"); ret(c, p.x - 4, p.y - 16, 8, 5, "#374151");
    ret(c, p.x - 2, p.y - 9, 4, 3, "#e5e7eb"); ret(c, p.x + 2, p.y - 15, 1, 1, quadro % 8 < 4 ? "#ef4444" : "#7f1d1d");
  });
  add(0 + 5 + 0.2, () => {
    const p = isoC(0.5, 5.5);
    ret(c, p.x - 5, p.y - 10, 10, 10, "#e5e7eb"); ret(c, p.x - 4, p.y - 20, 8, 10, "#7dd3fc"); ret(c, p.x - 4, p.y - 21, 8, 1, "#bae6fd");
  });
  for (let k = 0; k < 3; k++) {
    add(1 + 8 + k, () => {
      const p = isoC(1, 8 + k);
      caixa(c, p.x, p.y, 7, "#c0553f", "#8f3c2b", "#a84631");
      if (k === 0) caixa(c, p.x, p.y - 7, 8, "#c0553f", "#8f3c2b", "#a84631");
    });
  }
  add(3 + 9, () => { const p = isoC(3, 9); caixa(c, p.x, p.y, 5, "#d9c4a0", "#a89377", "#bfa987"); ret(c, p.x - 3, p.y - 8, 5, 3, "#92400e"); });
  add(9 + 1, () => {
    const p = isoC(9, 1);
    caixa(c, p.x, p.y, 8, "#e5e7eb", "#9ca3af", "#b6bcc6"); ret(c, p.x - 4, p.y - 9, 8, 1, "#f8fafc");
  });
  for (let i = 0; i < 3; i++) {
    add(5 + i + 0, () => {
      const p = isoC(5 + i, 0);
      caixa(c, p.x, p.y, 30, "#a06c3c", "#7a4e26", "#8f5f31");
      for (let b = 0; b < 16; b += 2) {
        const cores = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7", "#f97316"];
        const topo = p.y - 30 + 16 - Math.floor(b / 2);
        ret(c, p.x + b, topo + 3, 1, 7, cores[(b + i) % cores.length]);
        ret(c, p.x + b, topo + 16, 1, 7, cores[(b + i + 2) % cores.length]);
      }
    });
  }
  for (const [px, py] of [[11, 0], [0, 0], [0, 10], [11, 10]] as const) {
    add(px + py, () => {
      const p = isoC(px + 0.5, py + 0.5);
      ret(c, p.x - 5, p.y - 8, 10, 8, "#92400e"); ret(c, p.x - 5, p.y - 8, 10, 2, "#b45309");
      ret(c, p.x - 5, p.y - 20, 4, 12, "#16a34a"); ret(c, p.x - 1, p.y - 25, 4, 17, "#22c55e"); ret(c, p.x + 3, p.y - 18, 4, 10, "#15803d");
    });
  }

  // personagens
  (Object.keys(m.atores) as Papel[]).forEach((p) => {
    const a = m.atores[p];
    add(a.x + a.y + 0.05, () => desenharAtor(c, m, p, op, quadro));
  });

  itens.sort((x, y) => x.d - y.d);
  for (const it of itens) it.f();

  // seleção, plumbob, balões, nomes
  (Object.keys(m.atores) as Papel[]).forEach((p) => {
    const a = m.atores[p];
    const pos = isoC(a.x, a.y);
    const cx = Math.round(pos.x);
    const cy = Math.round(pos.y);
    const topo = cy - (sentado(m, p) ? 18 : 24);
    if (m.selecionado === p) {
      contorno(c, cx, cy - 8, "#fbbf24");
      const h = p === "gestor" ? "ok" : op.humor[p as Agente];
      const corPlumb = h === "critico" ? "#ef4444" : h === "atencao" ? "#facc15" : "#4ade80";
      const bob = m.reduzido ? 0 : Math.round(Math.sin(m.t * 3) * 2);
      const py = topo - 13 + bob;
      ret(c, cx - 1, py, 2, 1, corPlumb);
      ret(c, cx - 2, py + 1, 4, 2, corPlumb);
      ret(c, cx - 3, py + 3, 6, 2, corPlumb);
      ret(c, cx - 2, py + 5, 4, 2, sombreia(corPlumb, -0.25));
      ret(c, cx - 1, py + 7, 2, 1, sombreia(corPlumb, -0.25));
    }
    let tipo: "pontos" | "ok" | "erro" | "ask" | "cafe" | null = null;
    if (p === "gestor") { if (op.aguardandoGestor) tipo = "ask"; }
    else {
      const st = op.estados[p as Agente];
      const em = m.atores[p];
      if (st === "working" && sentado(m, p)) tipo = "pontos";
      else if (st === "error") tipo = "erro";
      else if (st === "done" && sentado(m, p)) tipo = "ok";
      else if (em.modo === "vagando" && em.noDestino && em.lazer && em.lazer !== "sofa") tipo = "cafe";
    }
    if (tipo && m.selecionado !== p) balao(c, cx, topo - 14, tipo, quadro);
    if (tipo && m.selecionado === p) balao(c, cx + 12, topo - 22, tipo, quadro);
    if (m.hover === p || m.selecionado === p) {
      const nome = CORES[p].nome.toUpperCase();
      const w = nome.length * 4 + 6;
      ret(c, cx - w / 2, cy + 3, w, 9, "#0f172a");
      c.fillStyle = "#f8fafc"; c.font = "bold 6px monospace"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(nome, cx, cy + 8);
    }
  });

  // iluminação: noite escurece, telas acesas brilham
  const escuro = 1 - luz;
  if (escuro > 0.02) {
    c.fillStyle = `rgba(8,14,40,${(0.5 * escuro).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
    for (const mesa of MESAS) {
      if (mesa.papel === "gestor") continue;
      const st = op.estados[mesa.papel as Agente];
      const p = isoC(mesa.x + 1, mesa.y);
      const forca = (st === "working" ? 0.32 : 0.1) * escuro;
      for (let r = 26; r > 6; r -= 5) {
        c.fillStyle = `rgba(255,214,140,${(forca * (1 - r / 30)).toFixed(3)})`;
        c.beginPath(); c.arc(p.x, p.y - 4, r, 0, Math.PI * 2); c.fill();
      }
    }
  }
}

/** Humor (a "bolinha verde" do Sims) a partir das métricas reais do agente. */
export function humorDe(alta: number, media: number, execs: number, formato: number | null): Humor {
  if (alta > 0) return "critico";
  if (media > 0 || (formato !== null && formato < 0.7)) return "atencao";
  void execs;
  return "ok";
}
