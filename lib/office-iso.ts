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

/** Produtividade real de um agente, calculada das execuções registradas. */
export interface Atividade {
  /** Entregas concluídas hoje (sem contar cenários de estresse). */
  entregasHoje: number;
  /** Momento (epoch ms) da última entrega, ou null. */
  ultimaTs: number | null;
  /** Há algo esperando decisão ou revisão deste agente. */
  pendente: boolean;
  /** A última entrega teve alerta alto e precisa de retrabalho. */
  retrabalho: boolean;
  /** Carga recente, de 0 (nenhuma) a 1 (alta). */
  carga: number;
}

export interface Efeito { x: number; y: number; t0: number; texto: string }

export interface Mundo {
  atores: Record<Papel, Ator>;
  entregasVistas: Record<Agente, number>;
  pausaTirada: Record<Agente, number>;
  base: boolean;
  efeitos: Efeito[];
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
    entregasVistas: { cs: 0, ref: 0, criativo: 0, midia: 0 },
    pausaTirada: { cs: 0, ref: 0, criativo: 0, midia: 0 },
    base: false,
    efeitos: [],
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

export function passo(m: Mundo, dt: number, estados: Record<Agente, Estado>, atividade?: Record<Agente, Atividade>) {
  m.t += dt;
  m.efeitos = m.efeitos.filter((e) => m.t - e.t0 < 2.4);
  const agentes: Agente[] = ["cs", "ref", "criativo", "midia"];

  for (const p of agentes) {
    const st = estados[p];
    const a = m.atores[p];
    const at = atividade?.[p];
    if (at) {
      if (m.base && at.entregasHoje > m.entregasVistas[p]) {
        const pos = isoC(a.x, a.y);
        m.efeitos.push({ x: pos.x, y: pos.y - 30, t0: m.t, texto: "+1 entrega" });
      }
      m.entregasVistas[p] = at.entregasHoje;
    }
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
      // Pausa só para quem entregou, sem pendência nem retrabalho e sem sobrecarga: uma por entrega.
      if (noAssento(m, p) && st !== "working" && at && at.ultimaTs !== null) {
        const idade = Date.now() - at.ultimaTs;
        const merece = at.ultimaTs !== m.pausaTirada[p] && idade > 6000 && idade < 6 * 60000
          && !at.pendente && !at.retrabalho && at.carga < 0.6 && st !== "error";
        if (merece) {
          m.pausaTirada[p] = at.ultimaTs;
          const l = LAZER[at.entregasHoje % LAZER.length];
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

  if (atividade) m.base = true;

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
//
// O canvas tem W*ESCALA x H*ESCALA pixels e as coordenadas lógicas aceitam meio
// pixel (múltiplos de 0.5), o que dá traços e arestas muito mais finos. O cenário
// fixo (paredes, piso, janelas, quadros) é pré-renderizado e guardado em cache por
// tema e por faixa de 15 minutos do dia; só móveis, personagens e luz são
// redesenhados a cada quadro.

export const ESCALA = 2;

const r5 = (v: number) => Math.round(v * 2) / 2;

export function ret(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cor: string) {
  c.fillStyle = cor;
  c.fillRect(r5(x), r5(y), w, h);
}

export function aleat(a: number, b: number, k = 0): number {
  let h = Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x7f4a, 0xc2b2ae35) ^ Math.imul(k + 1, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

export function mistura(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

export function sombreia(cor: string, f: number): string {
  return mistura(cor, f < 0 ? "#000000" : "#ffffff", Math.abs(f));
}

export function luzDoDia(hora: number): number {
  if (hora >= 7 && hora <= 17) return 1;
  if (hora > 17 && hora < 19.5) return 1 - (hora - 17) / 2.5;
  if (hora >= 5 && hora < 7) return (hora - 5) / 2;
  return 0;
}

export function ceu(hora: number): { topo: string; base: string } {
  const l = luzDoDia(hora);
  const dia = { topo: "#5cc0f5", base: "#c4e8fb" };
  const noite = { topo: "#0a1226", base: "#1b2a4a" };
  if (l >= 1) return dia;
  if (l <= 0) return noite;
  const meio = hora < 12 ? { topo: "#f4a6d0", base: "#fde2a8" } : { topo: "#f9843c", base: "#fde6a0" };
  return l > 0.5
    ? { topo: mistura(meio.topo, dia.topo, (l - 0.5) * 2), base: mistura(meio.base, dia.base, (l - 0.5) * 2) }
    : { topo: mistura(noite.topo, meio.topo, l * 2), base: mistura(noite.base, meio.base, l * 2) };
}

/** Losango 32x16 com arestas em degraus de meio pixel (inclinação 2:1 exata). */
export function losango(c: CanvasRenderingContext2D, x: number, y: number, cor: string) {
  c.fillStyle = cor;
  for (let i = 0; i < 32; i++) {
    const w = (i < 16 ? i + 1 : 32 - i) * 2;
    c.fillRect(r5(x - w / 2), r5(y + i * 0.5), w, 0.5);
  }
}

/** Losango escalado (s = 1 é o tile inteiro), centrado em (cx, cy). */
export function losangoEsc(c: CanvasRenderingContext2D, cx: number, cy: number, s: number, cor: string) {
  const n = Math.round(32 * s);
  const meio = n / 2;
  const k = (32 * s) / meio;
  c.fillStyle = cor;
  for (let i = 0; i < n; i++) {
    const w = (i < meio ? i + 1 : n - i) * k;
    c.fillRect(r5(cx - w / 2), r5(cy - 8 * s + i * 0.5), w, 0.5);
  }
}

function arestaInf(c: CanvasRenderingContext2D, x: number, y: number, cor: string) {
  c.fillStyle = cor;
  for (let i = 0; i < 32; i++) {
    c.fillRect(r5(x - 16 + i * 0.5), r5(y + 8 + i * 0.25), 0.5, 0.5);
    c.fillRect(r5(x + i * 0.5), r5(y + 16 - i * 0.25), 0.5, 0.5);
  }
}

export function arestaSup(c: CanvasRenderingContext2D, x: number, y: number, cor: string) {
  c.fillStyle = cor;
  for (let i = 0; i < 32; i++) {
    c.fillRect(r5(x - 16 + i * 0.5), r5(y + 8 - i * 0.25), 0.5, 0.5);
    c.fillRect(r5(x + i * 0.5), r5(y + i * 0.25), 0.5, 0.5);
  }
}

/** Cubo de um tile; (x, y) é o vértice superior do losango no chão. */
export function caixa(c: CanvasRenderingContext2D, x: number, y: number, h: number, topo: string, esq: string, dir: string) {
  const baixo = Math.round(h * 0.3 * 2) / 2;
  for (let i = 0; i < 32; i++) {
    const xe = x - 16 + i * 0.5;
    const te = y - h + 8 + i * 0.25;
    ret(c, xe, te, 0.5, h, esq);
    ret(c, xe, te + h - baixo, 0.5, baixo, sombreia(esq, -0.16));
    const xd = x + i * 0.5;
    const td = y - h + 16 - i * 0.25;
    ret(c, xd, td, 0.5, h, dir);
    ret(c, xd, td + h - baixo, 0.5, baixo, sombreia(dir, -0.13));
  }
  losango(c, x, y - h, topo);
  arestaSup(c, x, y - h, sombreia(topo, 0.3));
  ret(c, x - 16, y - h + 8, 0.5, h, sombreia(esq, -0.28));
  ret(c, x - 0.5, y - h + 16, 1, h, sombreia(esq, -0.34));
  ret(c, x + 15.5, y - h + 8, 0.5, h, sombreia(dir, -0.28));
}

// ── Cenário fixo (em cache) ────────────────────────────────────────────────────

function colParede(lado: "D" | "E", u: number): { x: number; base: number } {
  return { x: lado === "D" ? OX + u * 16 : OX - u * 16 - 0.5, base: OY + u * 8 };
}

function pintarParede(c: CanvasRenderingContext2D, lado: "D" | "E", tema: Tema) {
  const n = lado === "D" ? GW : GH;
  const cor = lado === "D" ? tema.paredeD : tema.paredeE;
  for (let k = 0; k < n * 32; k++) {
    const u = k / 32;
    const { x, base } = colParede(lado, u);
    const ao = Math.max(0, 1 - (u * 16) / 34) * 0.22;
    const principal = sombreia(cor, -ao);
    ret(c, x, base - WALL_H, 0.5, WALL_H, principal);
    ret(c, x, base - WALL_H, 0.5, 1.5, sombreia(cor, 0.26));
    ret(c, x, base - WALL_H + 1.5, 0.5, 0.5, sombreia(cor, -0.22));
    ret(c, x, base - 17, 0.5, 12, sombreia(principal, -0.07));
    ret(c, x, base - 17.5, 0.5, 0.5, sombreia(cor, 0.14));
    ret(c, x, base - 17, 0.5, 0.5, sombreia(cor, -0.22));
    ret(c, x, base - 5, 0.5, 5, tema.rodape);
    ret(c, x, base - 5, 0.5, 0.5, sombreia(tema.rodape, 0.38));
  }
}

export function disco(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, cor: string) {
  c.fillStyle = cor;
  for (let dy = -r; dy < r; dy += 0.5) {
    const w = 2 * Math.sqrt(Math.max(0, r * r - (dy + 0.25) * (dy + 0.25)));
    c.fillRect(r5(cx - w / 2), r5(cy + dy), Math.round(w * 2) / 2, 0.5);
  }
}

function pintarJanela(c: CanvasRenderingContext2D, lado: "D" | "E", a: number, b: number, hora: number, tema: Tema) {
  const sky = ceu(hora);
  const l = luzDoDia(hora);
  const noite = l < 0.35;
  const larg = (b - a) * 16;
  const alto = 24;
  const cortina = mistura(lado === "D" ? tema.paredeD : tema.paredeE, "#ffffff", 0.62);
  for (let k = Math.round(a * 32); k < Math.round(b * 32); k++) {
    const u = k / 32;
    const { x, base } = colParede(lado, u);
    const off = (u - a) * 16;
    const top = base - WALL_H + 8;
    const borda = off < 1 || off > larg - 1;
    const meio = Math.abs(off - larg / 2) < 0.5;
    if (borda || meio) {
      ret(c, x, top - 1, 0.5, alto + 2, "#e8edf4");
      ret(c, x, top - 1, 0.5, 0.5, "#ffffff");
      continue;
    }
    ret(c, x, top - 1, 0.5, 2, "#e8edf4");
    ret(c, x, top + alto - 1, 0.5, 2, "#cbd5e1");
    const linhas = (alto - 2) * 2;
    for (let r = 0; r < linhas; r++) ret(c, x, top + 1 + r * 0.5, 0.5, 0.5, mistura(sky.topo, sky.base, r / linhas));
    const hb = 3 + aleat(Math.floor(off / 2.5), lado === "D" ? 1 : 2, 7) * 7;
    ret(c, x, top + alto - 1 - hb, 0.5, hb, noite ? "#070d1c" : mistura(sky.base, "#51647f", 0.5));
    if (noite && aleat(k, Math.floor(hb), 3) > 0.82) ret(c, x, top + alto - 1 - hb + 1 + Math.floor(aleat(k, 1, 1) * (hb - 2)), 0.5, 0.5, "#fde68a");
    if (noite && aleat(k, 3, 5) > 0.97) ret(c, x, top + 2 + aleat(k, 2, 2) * 7, 0.5, 0.5, "#f8fafc");
  }
  // sol ou lua
  const cu = a + (b - a) * 0.66;
  const cp = colParede(lado, cu);
  if (l > 0.12) {
    disco(c, cp.x, cp.base - WALL_H + 8 + 6, 3.4, "rgba(255,244,170,0.35)");
    disco(c, cp.x, cp.base - WALL_H + 8 + 6, 2.2, "#fff3a8");
  } else {
    disco(c, cp.x, cp.base - WALL_H + 8 + 6, 2.4, "#f1f5f9");
    disco(c, cp.x + 1, cp.base - WALL_H + 8 + 5.5, 2.1, "#0e1a33");
  }
  // cortinas
  for (let k = Math.round(a * 32); k < Math.round(b * 32); k++) {
    const u = k / 32;
    const off = (u - a) * 16;
    if (off > 2.6 && off < larg - 2.6) continue;
    const { x, base } = colParede(lado, u);
    const dobra = Math.floor(off * 2) % 3 === 0;
    ret(c, x, base - WALL_H + 6, 0.5, alto + 3, dobra ? sombreia(cortina, -0.14) : cortina);
  }
  // peitoril
  for (let k = Math.round(a * 32) - 1; k < Math.round(b * 32) + 1; k++) {
    const { x, base } = colParede(lado, k / 32);
    ret(c, x, base - WALL_H + 8 + alto + 1, 0.5, 1.5, "#dfe6ee");
    ret(c, x, base - WALL_H + 8 + alto + 2.5, 0.5, 0.5, "#94a3b8");
  }
}

function painel(
  c: CanvasRenderingContext2D, lado: "D" | "E", u0: number, u1: number, yTopo: number, alto: number,
  cor: (off: number, y: number, larg: number) => string | null
) {
  const larg = (u1 - u0) * 16;
  for (let k = Math.round(u0 * 32); k < Math.round(u1 * 32); k++) {
    const u = k / 32;
    const { x, base } = colParede(lado, u);
    const off = (u - u0) * 16;
    for (let r = 0; r < alto * 2; r++) {
      const col = cor(off, r * 0.5, larg);
      if (col) ret(c, x, base - WALL_H + yTopo + r * 0.5, 0.5, 0.5, col);
    }
  }
}

function pintarDecoracao(c: CanvasRenderingContext2D, tema: Tema) {
  const destaque = sombreia(tema.paredeD, 0.5);
  // quadro de paisagem na parede direita
  painel(c, "D", 1.1, 2.9, 8, 17, (off, y, larg) => {
    if (off < 1 || off > larg - 1 || y < 1 || y > 16) return "#3b2a1b";
    if (off < 1.5 || off > larg - 1.5 || y < 1.5 || y > 15.5) return "#c8a46a";
    if (y < 9) return mistura("#7fd1ff", "#ffe9b0", y / 9);
    const colina = 9 + Math.sin(off * 0.35) * 1.4 + 1.2;
    if (y > colina) return mistura("#3f8f5b", "#2d6b44", (y - colina) / 6);
    if (Math.hypot(off - larg * 0.7, y - 6) < 2.4) return "#fff3a8";
    return mistura("#7fd1ff", "#ffe9b0", y / 9);
  });
  // quadro geométrico menor
  painel(c, "D", 10.85, 11.85, 10, 12, (off, y, larg) => {
    if (off < 1 || off > larg - 1 || y < 1 || y > 11) return "#27272a";
    const faixa = Math.floor((off - 1) / ((larg - 2) / 3));
    return [tema.rodape, destaque, sombreia(tema.paredeD, -0.1)][Math.min(2, faixa)];
  });
  // lousa na parede esquerda, com post-its
  painel(c, "E", 3.0, 5.85, 9, 19, (off, y, larg) => {
    if (off < 1 || off > larg - 1 || y < 1 || y > 18) return "#cbd5e1";
    if (off < 1.5 || off > larg - 1.5 || y < 1.5 || y > 17.5) return "#94a3b8";
    const notas = [
      { x: 4, y: 3, cor: "#fde047" }, { x: 12, y: 3.5, cor: "#f9a8d4" }, { x: 21, y: 3, cor: "#86efac" },
      { x: 29, y: 3.5, cor: "#93c5fd" }, { x: 8, y: 10, cor: "#fdba74" }, { x: 17, y: 10.5, cor: "#c4b5fd" },
    ];
    for (const n of notas) if (off >= n.x && off < n.x + 6 && y >= n.y && y < n.y + 5.5) return y < n.y + 1 ? sombreia(n.cor, -0.12) : n.cor;
    if (y > 14.5 && y < 15 && off > 3 && off < larg - 8) return "#60a5fa";
    if (y > 16 && y < 16.5 && off > 3 && off < larg - 16) return "#f87171";
    return "#f8fafc";
  });
}

function desenharPiso(c: CanvasRenderingContext2D, tema: Tema) {
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const p = isoC(x, y);
      const tapete = x >= 4 && x <= 9 && y >= 3 && y <= 8;
      const borda = tapete && (x === 4 || x === 9 || y === 3 || y === 8);
      let cor = tapete ? tema.tapete[(x + y) % 2] : tema.piso[(x + y) % 2];
      if (borda) cor = sombreia(cor, -0.12);
      losango(c, p.x, p.y, cor);
      if (tapete && !borda) losangoEsc(c, p.x, p.y + 8, 0.5, sombreia(cor, 0.1));
      if (tapete && !borda) losangoEsc(c, p.x, p.y + 8, 0.22, sombreia(cor, -0.08));
      // textura sutil
      for (let k = 0; k < 3; k++) {
        const hx = (aleat(x, y, k) - 0.5) * 18;
        const hy = 8 + (aleat(y, x, k + 4) - 0.5) * 6;
        ret(c, p.x + hx, p.y + hy, 0.5, 0.5, sombreia(cor, aleat(x, y, k + 9) > 0.5 ? 0.07 : -0.07));
      }
      arestaInf(c, p.x, p.y, "rgba(0,0,0,0.075)");
      arestaSup(c, p.x, p.y, "rgba(255,255,255,0.13)");
      if (y === 0 || x === 0) losango(c, p.x, p.y, "rgba(0,0,0,0.11)");
      if (y === 1 || x === 1) losango(c, p.x, p.y, "rgba(0,0,0,0.04)");
    }
  }
  // espessura do piso nas duas bordas da frente
  const x0 = OX - GH * 16;
  for (let i = 0; i < GW * 32; i++) {
    const yy = OY + GH * 8 + i * 0.25;
    ret(c, x0 + i * 0.5, yy, 0.5, 2.5, "#64748b");
    ret(c, x0 + i * 0.5, yy + 2.5, 0.5, 3, "#475569");
  }
  const x1 = OX + (GW - GH) * 16;
  for (let i = 0; i < GH * 32; i++) {
    const yy = OY + (GW + GH) * 8 - i * 0.25;
    ret(c, x1 + i * 0.5, yy, 0.5, 2.5, "#475569");
    ret(c, x1 + i * 0.5, yy + 2.5, 0.5, 3, "#334155");
  }
}

function sombrasDosMoveis(c: CanvasRenderingContext2D) {
  const bloq = montarBloqueios();
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      if (!bloq[y][x]) continue;
      const p = isoC(x, y);
      losango(c, p.x + 4, p.y + 2, "rgba(10,15,30,0.14)");
    }
  }
}

function feixesDeLuz(c: CanvasRenderingContext2D, hora: number) {
  const l = luzDoDia(hora);
  const dia = l > 0.1;
  c.save();
  c.beginPath();
  const t = isoC(0, 0), r = isoC(GW, 0), b = isoC(GW, GH), e = isoC(0, GH);
  c.moveTo(t.x, t.y); c.lineTo(r.x, r.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.closePath();
  c.clip();
  const cor = dia ? `rgba(255,243,190,${(0.2 * l).toFixed(3)})` : "rgba(140,170,255,0.07)";
  const faixa = (a: { x: number; y: number }, b2: { x: number; y: number }, c2: { x: number; y: number }, d: { x: number; y: number }) => {
    c.fillStyle = cor;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b2.x, b2.y); c.lineTo(c2.x, c2.y); c.lineTo(d.x, d.y); c.closePath(); c.fill();
  };
  // janela da parede direita (gy = 0, gx 8.4 a 10.6): luz entra pela direita
  const p = (gx: number, gy: number) => isoC(gx, gy);
  faixa(p(8.5, 0), p(9.4, 0), p(6.9, 4.2), p(6.0, 4.2));
  faixa(p(9.6, 0), p(10.5, 0), p(8.0, 4.2), p(7.1, 4.2));
  // janelas da parede esquerda (gx = 0)
  faixa(p(0, 1.3), p(0, 2.7), p(4.3, 4.0), p(4.3, 2.6));
  faixa(p(0, 6.3), p(0, 8.1), p(4.3, 9.2), p(4.3, 7.6));
  c.restore();
}

function cenarioEstatico(c: CanvasRenderingContext2D, tema: Tema, hora: number) {
  pintarParede(c, "D", tema);
  pintarParede(c, "E", tema);
  pintarJanela(c, "D", 8.4, 10.6, hora, tema);
  pintarJanela(c, "E", 1.2, 2.8, hora, tema);
  pintarJanela(c, "E", 6.2, 8.2, hora, tema);
  pintarDecoracao(c, tema);
  desenharPiso(c, tema);
  sombrasDosMoveis(c);
  feixesDeLuz(c, hora);
}

const cacheFundo = new Map<string, HTMLCanvasElement>();

function fundo(op: OpcoesDesenho): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const chave = `${TEMAS.indexOf(op.tema)}|${Math.floor(op.hora * 4)}`;
  let cv = cacheFundo.get(chave);
  if (!cv) {
    cv = document.createElement("canvas");
    cv.width = W * ESCALA;
    cv.height = H * ESCALA;
    const g = cv.getContext("2d");
    if (!g) return null;
    g.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
    g.imageSmoothingEnabled = false;
    cenarioEstatico(g, op.tema, op.hora);
    if (cacheFundo.size > 24) cacheFundo.delete(cacheFundo.keys().next().value as string);
    cacheFundo.set(chave, cv);
  }
  return cv;
}

// ── Itens dinâmicos ────────────────────────────────────────────────────────────

type Item = { d: number; f: () => void };

export const OUT = "rgba(11,17,32,0.92)";

export function parte(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cor: string) {
  ret(c, x - 0.5, y - 0.5, w + 1, h + 1, OUT);
  ret(c, x, y, w, h, cor);
}

export function monitor(c: CanvasRenderingContext2D, cx: number, cy: number, st: Estado | "off", f: number, papel: Papel) {
  ret(c, cx - 3, cy - 0.5, 6, 1, "#52525b");
  ret(c, cx - 3, cy - 1, 6, 0.5, "#a1a1aa");
  ret(c, cx - 0.75, cy - 3, 1.5, 2.5, "#71717a");
  ret(c, cx - 7.5, cy - 14.5, 15, 11.5, "#0b0b10");
  ret(c, cx - 7, cy - 14, 14, 10.5, "#27272a");
  const x0 = cx - 6.5, y0 = cy - 13.5, w = 13, h = 9.5;
  const base = st === "error" ? "#3b0d0d" : st === "done" ? "#0f3a22" : st === "working" ? "#0b2a4a" : "#0c1424";
  ret(c, x0, y0, w, h, base);
  if (st === "working") {
    if (papel === "cs") {
      ret(c, x0 + 1, y0 + 1, 6, 2, "#e2e8f0"); ret(c, x0 + 6, y0 + 3.5, 6, 2, "#38bdf8"); ret(c, x0 + 1, y0 + 6, 4, 2, "#e2e8f0");
      if (f % 4 < 2) ret(c, x0 + 6, y0 + 6.5, 3, 1.5, "#38bdf8");
    } else if (papel === "ref") {
      ret(c, x0 + 1, y0 + 1, 5, 4.5, "#475569"); ret(c, x0 + 1.5, y0 + 1.5, 2, 2, "#94a3b8");
      for (let i = 0; i < 4; i++) ret(c, x0 + 7, y0 + 1 + i * 2, 2 + ((f + i * 3) % 4), 1, i % 2 ? "#7dd3fc" : "#bae6fd");
      ret(c, x0 + 1, y0 + 6.5, 11, 0.5, "#38bdf8");
    } else if (papel === "criativo") {
      ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6"].forEach((cor, i) => ret(c, x0 + 1 + i * 2.5, y0 + 1, 2, 2, cor));
      ret(c, x0 + 1, y0 + 3.5, 11, 5, "#f8fafc");
      ret(c, x0 + 2 + (f % 8), y0 + 5 + (f % 3) * 0.5, 2, 1, "#8b5cf6");
    } else {
      for (let i = 0; i < 5; i++) {
        const alt = 2 + ((i * 3 + f) % 5);
        ret(c, x0 + 1.5 + i * 2.2, y0 + 8 - alt, 1.5, alt, i % 2 ? "#34d399" : "#10b981");
      }
      ret(c, x0 + 1, y0 + 8, 11, 0.5, "#94a3b8");
    }
  } else if (st === "done") {
    ret(c, x0 + 4, y0 + 4.5, 1, 1, "#86efac"); ret(c, x0 + 5, y0 + 5.5, 1, 1, "#86efac");
    ret(c, x0 + 6, y0 + 4.5, 1, 1, "#86efac"); ret(c, x0 + 7, y0 + 3.5, 1, 1, "#86efac"); ret(c, x0 + 8, y0 + 2.5, 1, 1, "#86efac");
  } else if (st === "error") {
    ret(c, x0 + 5.5, y0 + 2, 2, 4, "#fca5a5"); ret(c, x0 + 5.5, y0 + 6.5, 2, 1, "#fca5a5");
  } else {
    ret(c, x0, y0 + h - 2, w, 2, "#16233f");
    if (f % 8 < 4) ret(c, x0 + 1.5, y0 + 1.5, 0.5, 1.5, "#64748b");
  }
  for (let k = 0; k < 5; k++) ret(c, x0 + 0.5 + k * 0.5, y0 + 0.5 + k * 0.5, 2.5 - k * 0.5, 0.5, "rgba(255,255,255,0.18)");
  ret(c, cx + 5.5, cy - 4.5, 0.5, 0.5, st === "working" ? "#22c55e" : "#ef4444");
}

function acessoriosDaMesa(c: CanvasRenderingContext2D, p: { x: number; y: number }, papel: Papel, f: number, at?: Atividade) {
  // teclado e mouse
  ret(c, p.x - 4.5, p.y - 3.5, 9, 2.5, "#52525b");
  ret(c, p.x - 4, p.y - 3.5, 8, 2, "#a1a1aa");
  for (let k = 0; k < 7; k++) { ret(c, p.x - 3.5 + k * 1.1, p.y - 3, 0.5, 0.5, "#e4e4e7"); ret(c, p.x - 3.5 + k * 1.1, p.y - 2, 0.5, 0.5, "#e4e4e7"); }
  ret(c, p.x + 6, p.y - 3, 1.5, 2, "#d4d4d8");
  // pilha de entregas do dia (uma folha por entrega, até 8) e etiqueta de pendência
  if (at && at.entregasHoje > 0) {
    const n = Math.min(8, at.entregasHoje);
    for (let k = 0; k < n; k++) {
      ret(c, p.x - 14 + (k % 2) * 0.5, p.y - 3.5 - k * 0.5, 4.5, 0.5, k % 2 ? "#e2e8f0" : "#f8fafc");
    }
    ret(c, p.x - 14, p.y - 3.5 - n * 0.5, 4.5, 0.5, "#cbd5e1");
    if (at.pendente) ret(c, p.x - 11.5, p.y - 4.5 - n * 0.5, 1.5, 1, "#f59e0b");
    if (at.retrabalho) ret(c, p.x - 14, p.y - 4.5 - n * 0.5, 1.5, 1, "#ef4444");
  }
  // caneca
  ret(c, p.x - 10.5, p.y - 5, 2.5, 2.5, "#f8fafc"); ret(c, p.x - 8, p.y - 4.5, 0.5, 1.5, "#f8fafc");
  ret(c, p.x - 10.5, p.y - 5, 2.5, 0.5, "#92400e");
  if (papel === "gestor" || papel === "ref") {
    ret(c, p.x - 14, p.y - 3.5, 3.5, 0.5, "#52525b");
    ret(c, p.x - 12.5, p.y - 9, 0.5, 5.5, "#71717a");
    ret(c, p.x - 12.5, p.y - 9.5, 3.5, 0.5, "#71717a");
    ret(c, p.x - 10, p.y - 9.5, 3, 1.5, "#fbbf24");
  }
  if (papel === "gestor") {
    ret(c, p.x + 9, p.y - 4.5, 5.5, 3.5, "#f8fafc"); ret(c, p.x + 9.5, p.y - 3.5, 4, 0.5, "#94a3b8"); ret(c, p.x + 9.5, p.y - 2.5, 3, 0.5, "#94a3b8");
    ret(c, p.x + 4, p.y - 6.5, 3, 1.5, "#fbbf24"); ret(c, p.x + 4.5, p.y - 6, 2, 0.5, "#92400e");
  } else if (papel === "criativo") {
    ret(c, p.x + 9, p.y - 5, 6, 3.5, "#18181b"); ret(c, p.x + 9.5, p.y - 4.5, 5, 2.5, f % 6 < 3 ? "#a78bfa" : "#f0abfc");
    ["#f43f5e", "#f59e0b", "#22c55e"].forEach((cor, i) => ret(c, p.x + 9 + i * 1.6, p.y - 7, 1.2, 1.5, cor));
  } else if (papel === "midia") {
    ret(c, p.x + 9, p.y - 5, 2, 3.5, "#18181b"); ret(c, p.x + 9.5, p.y - 4.5, 1, 2, "#38bdf8");
    ret(c, p.x + 12, p.y - 6.5, 4, 5, "#f8fafc"); ret(c, p.x + 12, p.y - 6.5, 4, 1, "#ef4444");
  } else if (papel === "ref") {
    ret(c, p.x + 9, p.y - 5, 5, 1.5, "#3b82f6"); ret(c, p.x + 9, p.y - 6.5, 5, 1.5, "#f59e0b"); ret(c, p.x + 9.5, p.y - 8, 4, 1.5, "#10b981");
  } else {
    ret(c, p.x + 9, p.y - 4, 4, 2.5, "#fef3c7"); ret(c, p.x + 9.5, p.y - 3.5, 3, 0.5, "#a16207");
  }
}

export function cadeira(c: CanvasRenderingContext2D, p: { x: number; y: number }) {
  ret(c, p.x - 4.5, p.y - 0.5, 9, 0.5, "#27272a");
  ret(c, p.x - 4.5, p.y - 1, 1, 1, "#18181b"); ret(c, p.x + 3.5, p.y - 1, 1, 1, "#18181b"); ret(c, p.x - 0.5, p.y - 1, 1, 1, "#18181b");
  ret(c, p.x - 0.5, p.y - 4.5, 1, 4, "#3f3f46");
  ret(c, p.x - 5.5, p.y - 7.5, 11, 3, "#3f3f46");
  ret(c, p.x - 5.5, p.y - 7.5, 11, 0.5, "#71717a");
  ret(c, p.x - 5.5, p.y - 16, 11, 9, "#3f3f46");
  ret(c, p.x - 5, p.y - 15.5, 10, 8, "#52525b");
  ret(c, p.x - 5, p.y - 15.5, 10, 0.5, "#a1a1aa");
  ret(c, p.x - 7, p.y - 10.5, 1.5, 3.5, "#27272a"); ret(c, p.x + 5.5, p.y - 10.5, 1.5, 3.5, "#27272a");
}

export function planta(c: CanvasRenderingContext2D, cx: number, cy: number, f: number) {
  ret(c, cx - 5.5, cy - 9, 11, 9, "#7c2d12");
  ret(c, cx - 5.5, cy - 9, 11, 1.5, "#c2410c");
  ret(c, cx - 5, cy - 7.5, 10, 0.5, "#451a03");
  ret(c, cx - 4, cy - 1.5, 8, 1.5, "#431407");
  ret(c, cx - 5.5, cy - 9, 0.5, 9, "#9a3412");
  const balanco = Math.sin(f * 0.25) * 0.8;
  const folhas: [number, number][] = [[-66, 9], [-42, 13], [-18, 17], [4, 19], [26, 16], [48, 13], [68, 9], [-4, 12]];
  for (let passe = 0; passe < 2; passe++) {
    folhas.forEach(([ang, len], i) => {
      const a = (ang * Math.PI) / 180;
      const cor = i % 2 ? "#15803d" : "#22c55e";
      for (let s = 1; s <= len; s += 0.5) {
        const t = s / len;
        const x = cx + Math.sin(a) * s + t * t * balanco;
        const y = cy - 9 - Math.cos(a) * s;
        const w = t < 0.25 ? 1.5 : t > 0.82 ? 1 : 2.5;
        if (passe === 0) ret(c, x - w / 2 - 0.5, y - 0.5, w + 1, 2, OUT);
        else ret(c, x - w / 2, y, w, 1, t > 0.5 && i % 2 === 0 ? "#4ade80" : cor);
      }
    });
  }
}

export function cafeteira(c: CanvasRenderingContext2D, cx: number, cy: number, f: number) {
  parte(c, cx - 5.5, cy - 20, 11, 20, "#27272a");
  ret(c, cx - 5, cy - 19.5, 10, 6, "#3f3f46");
  ret(c, cx - 4, cy - 18.5, 4, 3, "#18181b"); ret(c, cx + 1, cy - 18.5, 3, 1, "#ef4444"); ret(c, cx + 1, cy - 16.5, 3, 1, f % 8 < 4 ? "#22c55e" : "#14532d");
  ret(c, cx - 3, cy - 12, 6, 1.5, "#71717a");
  ret(c, cx - 2.5, cy - 8.5, 5, 4, "#f8fafc"); ret(c, cx + 2.5, cy - 7.5, 1, 2, "#f8fafc"); ret(c, cx - 2, cy - 8, 4, 1, "#7c2d12");
  ret(c, cx - 5, cy - 4, 10, 4, "#18181b");
  const v = f % 6;
  ret(c, cx - 1 + (v % 2) * 0.5, cy - 10.5 - v * 0.5, 0.5, 1, "rgba(255,255,255,0.55)");
  ret(c, cx + 1 - (v % 2) * 0.5, cy - 11.5 - v * 0.5, 0.5, 1, "rgba(255,255,255,0.4)");
}

export function bebedouro(c: CanvasRenderingContext2D, cx: number, cy: number, f: number) {
  parte(c, cx - 5, cy - 11, 10, 11, "#e5e7eb");
  ret(c, cx - 4.5, cy - 10.5, 9, 0.5, "#ffffff");
  ret(c, cx - 3, cy - 8, 6, 1, "#94a3b8"); ret(c, cx - 3.5, cy - 8, 1, 1, "#3b82f6"); ret(c, cx + 2.5, cy - 8, 1, 1, "#ef4444");
  parte(c, cx - 4, cy - 23, 8, 12, "#93d3fb");
  ret(c, cx - 3.5, cy - 22.5, 1, 11, "rgba(255,255,255,0.45)");
  ret(c, cx - 4, cy - 14 - (f % 8) * 0.5, 0.5, 0.5, "#ffffff"); ret(c, cx + 2, cy - 17 - ((f + 3) % 8) * 0.5, 0.5, 0.5, "#ffffff");
  ret(c, cx - 4, cy - 23, 8, 0.5, "#dbeafe");
  ret(c, cx - 2, cy - 3, 4, 0.5, "#64748b");
}

// ── Personagens ────────────────────────────────────────────────────────────────

export const LOOK: Record<Papel, { pele: string; cabelo: string; corpo: string; calca: string }> = {
  gestor: { pele: "#e0b08a", cabelo: "#1f2937", corpo: "#334155", calca: "#1f2937" },
  cs: { pele: "#f1c9a5", cabelo: "#6b4423", corpo: "#0487D9", calca: "#1e293b" },
  ref: { pele: "#c98f5f", cabelo: "#111827", corpo: "#0e7490", calca: "#334155" },
  criativo: { pele: "#f7d6b8", cabelo: "#c2410c", corpo: "#7c3aed", calca: "#1e3a8a" },
  midia: { pele: "#8d5524", cabelo: "#292524", corpo: "#059669", calca: "#78716c" },
};

function desenharAtor(c: CanvasRenderingContext2D, m: Mundo, p: Papel, op: OpcoesDesenho, quadro: number) {
  const a = m.atores[p];
  const L = LOOK[p];
  const pos = isoC(a.x, a.y);
  const cx = r5(pos.x);
  const cy = r5(pos.y);
  const sent = sentado(m, p);
  const andando = a.path.length > 0 && !m.reduzido;
  const st: Estado = p === "gestor" ? "idle" : op.estados[p as Agente];
  const trabalhando = st === "working" && sent;
  const frente = a.dx + a.dy >= 0;
  const gz = a.dx - a.dy > 0.01 ? 0.5 : a.dx - a.dy < -0.01 ? -0.5 : 0;
  const Y = cy + (sent ? 3.5 : 0);
  const resp = !andando && !trabalhando && !m.reduzido && Math.floor(m.t * 1.3) % 2 === 0 ? 0.5 : 0;
  const sw = andando ? Math.sin(a.fase) : 0;
  const par = quadro % 2 === 0;

  // sombra no chão
  ret(c, cx - 5.5, cy - 1, 11, 1.5, "rgba(0,0,0,0.16)");
  ret(c, cx - 4, cy - 1.5, 8, 2.5, "rgba(0,0,0,0.13)");

  // pernas e sapatos
  if (!sent) {
    const eL = sw > 0.35 ? 1 : 0;
    const eR = sw < -0.35 ? 1 : 0;
    parte(c, cx - 3, Y - 8, 2.5, 6.5 - eL, L.calca);
    parte(c, cx + 0.5, Y - 8, 2.5, 6.5 - eR, L.calca);
    ret(c, cx - 3.5, Y - 1.5 - eL, 3, 1.5, "#0b1220"); ret(c, cx - 3.5, Y - 1.5 - eL, 3, 0.5, "#475569");
    ret(c, cx + 0.5, Y - 1.5 - eR, 3, 1.5, "#0b1220"); ret(c, cx + 0.5, Y - 1.5 - eR, 3, 0.5, "#475569");
  }

  // elementos atrás da cabeça
  if (p === "criativo") parte(c, cx - 4.5, Y - 18.5, 9, 3.5, sombreia(L.corpo, -0.15));
  if (p === "cs" && frente) parte(c, cx + 3.5, Y - 22.5, 2.5, 6, L.cabelo);
  if (p === "ref") { parte(c, cx - 4.5, Y - 23.5, 2, 7.5, L.cabelo); parte(c, cx + 2.5, Y - 23.5, 2, 7.5, L.cabelo); }

  // tronco
  parte(c, cx - 4.5, Y - 15.5 + resp, 9, 7.5 - resp, L.corpo);
  ret(c, cx + 3, Y - 15 + resp, 1.5, 6.5 - resp, sombreia(L.corpo, -0.2));
  ret(c, cx - 4.5, Y - 15 + resp, 0.5, 6.5 - resp, sombreia(L.corpo, 0.2));
  ret(c, cx - 4.5, Y - 8.5, 9, 0.5, sombreia(L.corpo, -0.25));
  if (frente) {
    if (p === "gestor") {
      ret(c, cx - 1.5, Y - 15.5 + resp, 3, 5, "#f8fafc");
      ret(c, cx - 3, Y - 15.5 + resp, 1.5, 4.5, sombreia(L.corpo, -0.28)); ret(c, cx + 1.5, Y - 15.5 + resp, 1.5, 4.5, sombreia(L.corpo, -0.28));
      ret(c, cx - 0.5, Y - 14.5 + resp, 1, 5, "#dc2626"); ret(c, cx - 0.5, Y - 15.5 + resp, 1, 1, "#991b1b");
      ret(c, cx + 2.5, Y - 12.5, 1, 0.5, "#f8fafc");
    } else if (p === "cs") {
      ret(c, cx - 2.5, Y - 15.5 + resp, 2, 1, "#e0f2fe"); ret(c, cx + 0.5, Y - 15.5 + resp, 2, 1, "#e0f2fe");
      ret(c, cx - 0.25, Y - 14.5 + resp, 0.5, 3, sombreia(L.corpo, -0.3));
    } else if (p === "ref") {
      ret(c, cx - 1.5, Y - 15.5 + resp, 3, 6.5, "#f1f5f9");
      ret(c, cx - 0.25, Y - 14 + resp, 0.5, 0.5, "#94a3b8"); ret(c, cx - 0.25, Y - 12 + resp, 0.5, 0.5, "#94a3b8");
    } else if (p === "criativo") {
      ret(c, cx - 3, Y - 11, 6, 2.5, sombreia(L.corpo, -0.22));
      ret(c, cx - 1.5, Y - 15, 0.5, 2.5, "#f8fafc"); ret(c, cx + 1, Y - 15, 0.5, 2.5, "#f8fafc");
    } else {
      ret(c, cx - 1, Y - 13.5 + resp, 2, 1, "#ecfdf5");
    }
  }

  // braços
  const balanco = sw;
  if (trabalhando) {
    parte(c, cx - 6.5, Y - 14.5, 2, 4.5, L.corpo); parte(c, cx + 4.5, Y - 14.5, 2, 4.5, L.corpo);
    parte(c, cx - 5.5 + (par ? 0.5 : 0), Y - 10.5, 2, 1.5, L.pele); parte(c, cx + 3.5 - (par ? 0 : 0.5), Y - 10.5, 2, 1.5, L.pele);
  } else {
    parte(c, cx - 6.5, Y - 14.5 + balanco, 2, 6, L.corpo); parte(c, cx + 4.5, Y - 14.5 - balanco, 2, 6, L.corpo);
    parte(c, cx - 6.5, Y - 9 + balanco, 2, 1.5, L.pele); parte(c, cx + 4.5, Y - 9 - balanco, 2, 1.5, L.pele);
    if (p === "midia") { ret(c, cx - 6.5, Y - 9.5 + balanco, 2, 0.5, "#0f172a"); ret(c, cx - 6, Y - 9.5 + balanco, 1, 0.5, "#38bdf8"); }
  }

  // pescoço e cabeça
  ret(c, cx - 1, Y - 17.5 + resp, 2, 2, sombreia(L.pele, -0.12));
  parte(c, cx - 3.5, Y - 25 + resp, 7, 7.5, L.pele);
  ret(c, cx - 4, Y - 22 + resp, 0.5, 1.5, L.pele); ret(c, cx + 3.5, Y - 22 + resp, 0.5, 1.5, L.pele);
  const ya = Y + resp;

  if (frente) {
    // cabelo e acessórios da cabeça
    if (p === "gestor") {
      parte(c, cx - 4, ya - 27, 8, 3.5, L.cabelo); ret(c, cx - 4, ya - 24, 1, 2.5, L.cabelo); ret(c, cx + 3, ya - 24, 1, 2.5, L.cabelo);
      ret(c, cx - 1.5, ya - 27, 0.5, 1.5, sombreia(L.cabelo, 0.35));
    } else if (p === "cs") {
      parte(c, cx - 4, ya - 27, 8, 3.5, L.cabelo); ret(c, cx - 4, ya - 24, 1.5, 3, L.cabelo);
      ret(c, cx - 4.5, ya - 27.5, 9, 0.5, "#0f172a");
      parte(c, cx - 5.5, ya - 23.5, 2, 3.5, "#0f172a");
      ret(c, cx - 5, ya - 20.5, 0.5, 2, "#0f172a"); ret(c, cx - 5, ya - 18.5, 3, 0.5, "#0f172a"); ret(c, cx - 2.5, ya - 19, 1, 1, "#52525b");
    } else if (p === "ref") {
      parte(c, cx - 4.5, ya - 27.5, 9, 4, L.cabelo); ret(c, cx - 3.5, ya - 24, 7, 1.5, L.cabelo);
    } else if (p === "criativo") {
      parte(c, cx - 4, ya - 27, 8, 3.5, L.cabelo);
      parte(c, cx - 4.5, ya - 28, 2.5, 2.5, L.cabelo); parte(c, cx - 1.25, ya - 28.5, 2.5, 2.5, L.cabelo); parte(c, cx + 2, ya - 28, 2.5, 2.5, L.cabelo);
      ret(c, cx - 4, ya - 24, 1, 2, L.cabelo); ret(c, cx + 3, ya - 24, 1, 2, L.cabelo);
      ret(c, cx - 4.5, ya - 18, 9, 1, "#3f3f46");
      parte(c, cx - 5.5, ya - 19.5, 2, 3, "#18181b"); parte(c, cx + 3.5, ya - 19.5, 2, 3, "#18181b");
    } else {
      parte(c, cx - 4, ya - 27.5, 8, 3.5, "#14532d");
      parte(c, cx - 4.5, ya - 24.5, 9, 1.5, "#166534"); ret(c, cx - 4.5, ya - 24.5, 9, 0.5, "#22c55e");
      ret(c, cx - 0.5, ya - 26, 1, 1, "#f0fdf4");
      ret(c, cx - 4, ya - 23, 1, 2.5, L.cabelo); ret(c, cx + 3, ya - 23, 1, 2.5, L.cabelo);
    }
    // rosto
    const dy = trabalhando ? 0.5 : 0;
    ret(c, cx - 3, ya - 22 + dy, 2, 1.5, "#ffffff"); ret(c, cx + 1, ya - 22 + dy, 2, 1.5, "#ffffff");
    ret(c, cx - 2.5 + gz, ya - 21.75 + dy, 1, 1, "#0f172a"); ret(c, cx + 1.5 + gz, ya - 21.75 + dy, 1, 1, "#0f172a");
    if (p === "ref") {
      for (const ox of [-3.5, 0.5]) {
        ret(c, cx + ox, ya - 22.5, 3, 0.5, "#111827"); ret(c, cx + ox, ya - 20, 3, 0.5, "#111827");
        ret(c, cx + ox, ya - 22.5, 0.5, 2.5, "#111827"); ret(c, cx + ox + 2.5, ya - 22.5, 0.5, 2.5, "#111827");
      }
      ret(c, cx - 0.5, ya - 21.5, 1, 0.5, "#111827");
    }
    const cb = sombreia(L.cabelo, 0.05);
    if (st === "error") { ret(c, cx - 3, ya - 23, 1, 0.5, cb); ret(c, cx - 2, ya - 23.5, 1, 0.5, cb); ret(c, cx + 1, ya - 23.5, 1, 0.5, cb); ret(c, cx + 2, ya - 23, 1, 0.5, cb); }
    else if (trabalhando) { ret(c, cx - 3, ya - 22.5, 2, 0.5, cb); ret(c, cx + 1, ya - 22.5, 2, 0.5, cb); }
    else { ret(c, cx - 3, ya - 23, 2, 0.5, cb); ret(c, cx + 1, ya - 23, 2, 0.5, cb); }
    if (st === "done") {
      ret(c, cx - 1.5, ya - 19.5, 3, 0.5, "#9a3412"); ret(c, cx - 2, ya - 20, 0.5, 0.5, "#9a3412"); ret(c, cx + 1.5, ya - 20, 0.5, 0.5, "#9a3412");
      ret(c, cx - 3, ya - 20.5, 1, 0.5, "#fca5a5"); ret(c, cx + 2, ya - 20.5, 1, 0.5, "#fca5a5");
    } else if (st === "error") {
      ret(c, cx - 1, ya - 19.5, 2, 0.5, "#9a3412"); ret(c, cx - 1.5, ya - 19, 0.5, 0.5, "#9a3412"); ret(c, cx + 1, ya - 19, 0.5, 0.5, "#9a3412");
      ret(c, cx + 3.5, ya - 23, 1, 1.5, "#7dd3fc");
    } else if (trabalhando) {
      ret(c, cx - 0.5, ya - 19.5, 1, 0.5, "#9a3412");
    } else {
      ret(c, cx - 1, ya - 19.5, 2, 0.5, "#9a3412");
    }
  } else {
    parte(c, cx - 4, ya - 27, 8, 8, p === "midia" ? "#14532d" : L.cabelo);
    if (p === "midia") { ret(c, cx - 4, ya - 22, 8, 2.5, L.cabelo); ret(c, cx - 1.5, ya - 24.5, 3, 1, "#166534"); }
    if (p === "cs") ret(c, cx - 4.5, ya - 27.5, 9, 0.5, "#0f172a");
    if (p === "criativo") { parte(c, cx - 4.5, ya - 28, 2.5, 2.5, L.cabelo); parte(c, cx + 2, ya - 28, 2.5, 2.5, L.cabelo); }
  }

  // cochilando no sofá
  if (a.lazer === "sofa" && sent && !m.reduzido) {
    c.fillStyle = "#e2e8f0";
    c.font = "bold 5px sans-serif";
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    c.fillText("z", cx + 5, cy - 24 - (quadro % 6) * 0.5);
    c.fillText("Z", cx + 8, cy - 28 - ((quadro + 3) % 6) * 0.5);
  }
}

function balao(c: CanvasRenderingContext2D, cx: number, y: number, tipo: "pontos" | "ok" | "erro" | "ask" | "cafe", f: number) {
  const w = 20;
  const x = Math.round(cx - w / 2);
  ret(c, x + 1, y - 0.5, w - 2, 13, OUT); ret(c, x - 0.5, y + 1, w + 1, 10, OUT);
  ret(c, x + 1, y, w - 2, 12, "#ffffff"); ret(c, x, y + 1, w, 10, "#ffffff");
  ret(c, cx - 2, y + 12, 4, 1.5, OUT); ret(c, cx - 1.5, y + 11.5, 3, 1.5, "#ffffff"); ret(c, cx - 0.5, y + 13, 1, 1, OUT);
  if (tipo === "pontos") {
    const n = (f % 3) + 1;
    for (let i = 0; i < 3; i++) ret(c, x + 5 + i * 4, y + 5, 2, 2, i < n ? "#0f172a" : "#cbd5e1");
  } else if (tipo === "ok") {
    const g = "#16a34a";
    ret(c, x + 6, y + 6, 1.5, 1.5, g); ret(c, x + 7.5, y + 7, 1.5, 1.5, g); ret(c, x + 9, y + 6, 1.5, 1.5, g);
    ret(c, x + 10.5, y + 4.5, 1.5, 1.5, g); ret(c, x + 12, y + 3, 1.5, 1.5, g);
  } else if (tipo === "erro") {
    ret(c, x + 9, y + 2.5, 2, 5, "#dc2626"); ret(c, x + 9, y + 8.5, 2, 1.5, "#dc2626");
  } else if (tipo === "cafe") {
    ret(c, x + 6, y + 4, 6, 5, "#7c2d12"); ret(c, x + 12, y + 5, 1.5, 2.5, "#7c2d12"); ret(c, x + 7, y + 4, 4, 1, "#fbbf24");
    ret(c, x + 8 + (f % 2) * 0.5, y + 2 - (f % 2) * 0.5, 0.5, 1.5, "#94a3b8");
  } else {
    ret(c, x + 8, y + 2, 4, 2, "#d97706"); ret(c, x + 10, y + 4, 2, 2, "#d97706"); ret(c, x + 9, y + 6, 2, 1.5, "#d97706"); ret(c, x + 9, y + 8.5, 2, 1.5, "#d97706");
  }
}

/** Relógio de parede com a hora real de Brasília. */
function relogio(c: CanvasRenderingContext2D, hora: number, tema: Tema) {
  const { x, base } = colParede("D", 4.15);
  const cx = x;
  const cy = base - WALL_H + 14;
  disco(c, cx, cy, 6, OUT);
  disco(c, cx, cy, 5.5, sombreia(tema.rodape, 0.2));
  disco(c, cx, cy, 4.8, "#f8fafc");
  for (let k = 0; k < 12; k++) {
    const ang = (k / 12) * Math.PI * 2;
    ret(c, cx + Math.sin(ang) * 4 - 0.25, cy - Math.cos(ang) * 4 - 0.25, 0.5, 0.5, "#64748b");
  }
  const mm = (hora % 1) * 60;
  const reta = (ang: number, len: number, cor: string) => {
    for (let s = 0; s <= len; s += 0.5) ret(c, cx + Math.sin(ang) * s - 0.25, cy - Math.cos(ang) * s - 0.25, 0.5, 0.5, cor);
  };
  reta(((hora % 12) / 12) * Math.PI * 2, 2.6, "#0f172a");
  reta((mm / 60) * Math.PI * 2, 3.8, "#334155");
  ret(c, cx - 0.5, cy - 0.5, 1, 1, "#dc2626");
}

export interface OpcoesDesenho {
  tema: Tema;
  hora: number;
  estados: Record<Agente, Estado>;
  aguardandoGestor: boolean;
  humor: Record<Agente, Humor>;
  /** Nomes próprios a exibir no lugar do papel (ex.: o CS da sala). */
  nomes?: Partial<Record<Papel, string>>;
  atividade?: Record<Agente, Atividade>;
}

function luzRadial(c: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  const g = c.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

/** Desenha a cena toda. `quadro` é um contador inteiro para animações curtas. */
export function desenhar(c: CanvasRenderingContext2D, m: Mundo, op: OpcoesDesenho, quadro: number) {
  const luz = luzDoDia(op.hora);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W * ESCALA, H * ESCALA);
  c.imageSmoothingEnabled = false;
  const bg = fundo(op);
  if (bg) c.drawImage(bg, 0, 0);
  c.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
  if (!bg) cenarioEstatico(c, op.tema, op.hora);
  relogio(c, op.hora, op.tema);

  const itens: Item[] = [];
  const add = (d: number, f: () => void) => itens.push({ d, f });

  for (const mesa of MESAS) {
    const dono = mesa.papel;
    const st: Estado | "off" = dono === "gestor" ? "off" : op.estados[dono as Agente];
    for (let i = 0; i < 2; i++) {
      add(mesa.x + i + mesa.y, () => {
        const p = isoC(mesa.x + i, mesa.y);
        caixa(c, p.x, p.y, 10, "#c28f58", "#8a5a2e", "#a06c3c");
        for (let g = 0; g < 4; g++) ret(c, p.x - 12 + g * 7 + (i ? 3 : 0), p.y - 9.5 + g * 0.75, 0.5, 0.5, "rgba(120,70,20,0.35)");
        if (i === 0) acessoriosDaMesa(c, { x: p.x, y: p.y }, dono, quadro, dono === "gestor" ? undefined : op.atividade?.[dono as Agente]);
        if (i === 1) monitor(c, p.x + 9, p.y - 1, st, quadro, dono);
      });
    }
    const s = ASSENTOS[dono];
    add(s.x + s.y - 0.1, () => cadeira(c, isoC(s.x + 0.5, s.y + 0.5)));
  }

  add(0 + 3 + 0.2, () => { const p = isoC(0.5, 3.5); cafeteira(c, p.x, p.y, quadro); });
  add(0 + 5 + 0.2, () => { const p = isoC(0.5, 5.5); bebedouro(c, p.x, p.y, quadro); });
  for (let k = 0; k < 3; k++) {
    add(1 + 8 + k, () => {
      const p = isoC(1, 8 + k);
      caixa(c, p.x, p.y, 6, "#d1624a", "#923d2b", "#ab4a35");
      caixa(c, p.x, p.y - 6, 3, "#e0745c", "#a24732", "#bd523c");
      arestaSup(c, p.x, p.y - 9, "#f0a08c");
      if (k === 0) { ret(c, p.x - 4, p.y - 14, 5, 4, "#fbbf24"); ret(c, p.x - 4, p.y - 14, 5, 0.5, "#fde68a"); }
      if (k === 2) { ret(c, p.x - 1, p.y - 14, 5, 4, "#60a5fa"); ret(c, p.x - 1, p.y - 14, 5, 0.5, "#bfdbfe"); }
    });
  }
  add(3 + 9, () => {
    const p = isoC(3, 9);
    caixa(c, p.x, p.y, 5, "#e0cba6", "#a89377", "#bfa987");
    ret(c, p.x - 4, p.y - 8, 3, 3, "#f8fafc"); ret(c, p.x - 4, p.y - 8, 3, 0.5, "#92400e"); ret(c, p.x + 1, p.y - 7, 4, 2.5, "#f59e0b");
  });
  add(9 + 1, () => {
    const p = isoC(9, 1);
    caixa(c, p.x, p.y, 9, "#eef0f3", "#9ca3af", "#b6bcc6");
    ret(c, p.x - 5, p.y - 9.5, 9, 0.5, "#ffffff"); ret(c, p.x - 4, p.y - 11, 7, 1.5, "#f8fafc"); ret(c, p.x + 3, p.y - 7.5, 1, 1, quadro % 8 < 4 ? "#22c55e" : "#14532d");
    ret(c, p.x - 4, p.y - 5.5, 6, 1.5, "#1f2937");
  });
  for (let i = 0; i < 3; i++) {
    add(5 + i + 0, () => {
      const p = isoC(5 + i, 0);
      caixa(c, p.x, p.y, 30, "#a8723f", "#7a4e26", "#8f5f31");
      const cores = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7", "#f97316", "#14b8a6"];
      for (let b = 0; b < 32; b += 2) {
        const topo = p.y - 30 + 16 - Math.floor(b / 4);
        const h1 = 4 + aleat(b, i, 1) * 2.5;
        ret(c, p.x + b * 0.5, topo + 2 + (6 - h1), 1, h1, cores[(b + i) % cores.length]);
        const h2 = 4 + aleat(b, i, 2) * 2.5;
        ret(c, p.x + b * 0.5, topo + 13 + (6 - h2), 1, h2, cores[(b + i + 3) % cores.length]);
      }
      for (let b = 0; b < 32; b++) { ret(c, p.x + b * 0.5, p.y - 30 + 16 - Math.floor(b / 2) + 8.5, 0.5, 0.5, "#5a3a1c"); ret(c, p.x + b * 0.5, p.y - 30 + 16 - Math.floor(b / 2) + 19.5, 0.5, 0.5, "#5a3a1c"); }
    });
  }
  for (const [px, py] of [[11, 0], [0, 0], [0, 10], [11, 10]] as const) {
    add(px + py, () => { const p = isoC(px + 0.5, py + 0.5); planta(c, p.x, p.y, quadro + px * 3 + py); });
  }

  (Object.keys(m.atores) as Papel[]).forEach((p) => {
    const a = m.atores[p];
    add(a.x + a.y + 0.05, () => desenharAtor(c, m, p, op, quadro));
  });

  itens.sort((x, y) => x.d - y.d);
  for (const it of itens) it.f();

  // iluminação: noite escurece, lâmpadas e telas acesas brilham
  const escuro = 1 - luz;
  if (escuro > 0.02) {
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = `rgba(6,12,38,${(0.52 * escuro).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
    c.restore();
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const mesa of MESAS) {
      const p = isoC(mesa.x + 0.5, mesa.y + 0.5);
      luzRadial(c, p.x - 11, p.y - 10, 22, "255,205,120", 0.34 * escuro);
      if (mesa.papel !== "gestor") {
        const st = op.estados[mesa.papel as Agente];
        const q = isoC(mesa.x + 1.5, mesa.y + 0.5);
        luzRadial(c, q.x + 1, q.y - 12, st === "working" ? 24 : 12, "120,190,255", (st === "working" ? 0.3 : 0.1) * escuro);
      }
    }
    luzRadial(c, isoC(0.5, 3.5).x, isoC(0.5, 3.5).y - 12, 16, "255,190,110", 0.18 * escuro);
    c.restore();
  } else if (luz < 0.85) {
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = `rgba(255,150,70,${(0.07 * (1 - luz)).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
    c.restore();
  }

  // "+1 entrega" quando uma execução real termina
  for (const e of m.efeitos) {
    const idade = m.t - e.t0;
    const alpha = Math.max(0, 1 - idade / 2.4);
    const y = e.y - idade * 7;
    c.font = "bold 6px sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    const w = Math.ceil(c.measureText(e.texto).width) + 6;
    c.globalAlpha = alpha;
    ret(c, e.x - w / 2 - 0.5, y - 4.5, w + 1, 9, OUT);
    ret(c, e.x - w / 2, y - 4, w, 8, "#14532d");
    c.fillStyle = "#bbf7d0";
    c.fillText(e.texto, e.x, y + 0.3);
    c.globalAlpha = 1;
  }

  // seleção, losango de humor, balões e nomes
  (Object.keys(m.atores) as Papel[]).forEach((p) => {
    const a = m.atores[p];
    const pos = isoC(a.x, a.y);
    const cx = r5(pos.x);
    const cy = r5(pos.y);
    const topo = cy - (sentado(m, p) ? 22 : 28);
    if (m.selecionado === p) {
      const pulso = m.reduzido ? 1 : 0.65 + 0.35 * Math.sin(m.t * 4);
      losangoEsc(c, cx, cy - 0.5, 0.78, `rgba(251,191,36,${(0.22 * pulso).toFixed(3)})`);
      c.fillStyle = `rgba(251,191,36,${pulso.toFixed(3)})`;
      for (let i = 0; i < 25; i++) {
        const w = (i < 12.5 ? i + 1 : 25 - i) * 2 * 0.78;
        c.fillRect(r5(cx - w / 2), r5(cy - 6.3 + i * 0.5), 0.5, 0.5);
        c.fillRect(r5(cx + w / 2 - 0.5), r5(cy - 6.3 + i * 0.5), 0.5, 0.5);
      }
      const h = p === "gestor" ? "ok" : op.humor[p as Agente];
      const corP = h === "critico" ? "#ef4444" : h === "atencao" ? "#facc15" : "#4ade80";
      const bob = m.reduzido ? 0 : Math.round(Math.sin(m.t * 3) * 2) / 2 * 2;
      const py = topo - 13 + bob;
      for (let i = 0; i < 20; i++) {
        const w = Math.round((1 - Math.abs(i - 9.5) / 10) * 5 * 2) / 2 * 2;
        const t = i / 20;
        c.fillStyle = OUT; c.fillRect(r5(cx - w / 2 - 0.5), r5(py + i * 0.5), w + 1, 0.5);
        c.fillStyle = mistura(sombreia(corP, 0.35), sombreia(corP, -0.3), t); c.fillRect(r5(cx - w / 2), r5(py + i * 0.5), w, 0.5);
      }
    }
    let tipo: "pontos" | "ok" | "erro" | "ask" | "cafe" | null = null;
    if (p === "gestor") { if (op.aguardandoGestor) tipo = "ask"; }
    else {
      const st = op.estados[p as Agente];
      const em = m.atores[p];
      const at = op.atividade?.[p as Agente];
      if (st === "working" && sentado(m, p)) tipo = "pontos";
      else if (st === "error") tipo = "erro";
      else if (at?.retrabalho && sentado(m, p)) tipo = "erro";
      else if (at?.pendente && sentado(m, p)) tipo = "ask";
      else if (st === "done" && sentado(m, p)) tipo = "ok";
      else if (em.modo === "vagando" && em.noDestino && em.lazer && em.lazer !== "sofa") tipo = "cafe";
    }
    if (tipo && m.selecionado !== p) balao(c, cx, topo - 15, tipo, quadro);
    if (tipo && m.selecionado === p) balao(c, cx + 14, topo - 20, tipo, quadro);
    if (m.hover === p || m.selecionado === p) {
      const nome = (op.nomes?.[p] ? `${op.nomes[p]} · ${CORES[p].nome}` : CORES[p].nome).toUpperCase();
      c.font = "bold 5px sans-serif";
      const w = Math.ceil(c.measureText(nome).width) + 9;
      const x0 = r5(cx - w / 2);
      ret(c, x0 - 0.5, cy + 3.5, w + 1, 9, OUT);
      ret(c, x0, cy + 4, w, 8, "#0f172a");
      ret(c, x0 + 2, cy + 7, 2, 2, CORES[p].corpo);
      c.fillStyle = "#f8fafc"; c.textAlign = "left"; c.textBaseline = "middle";
      c.fillText(nome, x0 + 5.5, cy + 8.5);
    }
  });
}

/** Humor (a "bolinha verde" do Sims) a partir das métricas reais do agente. */
export function humorDe(alta: number, media: number, execs: number, formato: number | null): Humor {
  if (alta > 0) return "critico";
  if (media > 0 || (formato !== null && formato < 0.7)) return "atencao";
  void execs;
  return "ok";
}
