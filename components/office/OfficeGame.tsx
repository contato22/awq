"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft, Search, BarChart3, Clapperboard, Crown, Target, ChevronRight, ListChecks, ClipboardList, Crosshair, Eye, FastForward, FileText, Globe, MessageSquare,
  Moon, Pause, Play, ScrollText, ShieldCheck, Sun, Sunrise, Sunset, Users, X, ZoomIn, ZoomOut,
} from "lucide-react";
import {
  atorNoPonto, criarMundo, desenhar, ESCALA, H, humorDe, isoC, moverGestor, passo, TEMAS, tileDoPonto, W,
  type Agente, type Atividade, type Estado, type Humor, type Mundo,
} from "@/lib/office-iso";
import { ANDARES, andarDaEmpresa, casaNoPonto, centroDaDiretoria, centroDaReuniao, centroDoEstudio, centroDoPredio, desenharMundo, layoutPredios, predioNoPonto, WH, WW, type AndarId, type Empresa, type EstadoReuniao } from "@/lib/office-world";

/**
 * O Office como mundo jogável: um mapa do grupo com um prédio por cliente, e dentro de
 * cada prédio a sala da squad. A simulação ocupa a tela; menus e painéis são camadas.
 * Zoom, arrastar, minimapa, controle de tempo e transições entre os níveis.
 */

export interface ItemBusca {
  id: string;
  tipo: "empresa" | "agente" | "sala" | "andar";
  rotulo: string;
  sub: string;
  bu?: string;
  role?: Agente;
  sala?: "reunioes" | "diretoria" | "estudio";
  andar?: AndarId;
}

export type PainelTab = "ciclo" | "conversa" | "reuniao" | "eventos" | "head" | "missoes" | "relatorio" | "analise" | "cenarios" | "registros" | "storyboard";

export interface MetricaAgente {
  execs: number;
  formato: number | null;
  alta: number;
  media: number;
  ms: number;
}

interface Props {
  empresas: Empresa[];
  buAtual: string;
  onEscolherEmpresa: (bu: string) => void;
  estados: Record<Agente, Estado>;
  aguardandoGestor: boolean;
  selecionado: Agente;
  onSelecionar: (a: Agente) => void;
  metricas: Record<Agente, MetricaAgente>;
  /** Produtividade real de cada agente (execuções de hoje, pendências, retrabalho, carga). */
  atividade: Record<Agente, Atividade>;
  tema: number;
  /** Nome próprio do CS da sala atual. */
  nomeCS: string;
  descricao: string;
  tab: PainelTab;
  painelAberto: boolean;
  /** Volta ao painel (o mundo ocupa a janela inteira). */
  onSair?: () => void;
  /** Itens encontráveis na busca global. */
  busca?: ItemBusca[];
  /** CSs sentados na sala de reuniões. */
  reuniao?: EstadoReuniao[];
  onPainel: (aberto: boolean, tab?: PainelTab) => void;
  temRelatorio: boolean;
  pendencias: number;
  children: ReactNode;
}

interface Cam { cx: number; cy: number; z: number }

const ROTULO: Record<Agente, { nome: string; curto: string }> = {
  cs: { nome: "Headcount/CS", curto: "CS" }, // nome e curto do CS vêm de nomeCS
  ref: { nome: "Referências e Inteligência", curto: "Referências" },
  criativo: { nome: "Criativo e Editor", curto: "Criativo" },
  midia: { nome: "Mídia e Publicação", curto: "Mídia" },
};

const ESTADO_TXT: Record<Estado, string> = { idle: "Ocioso", working: "Trabalhando", done: "Entregou", error: "Com problema" };

const RAIL: { tab: PainelTab; rotulo: string; Icone: React.ElementType }[] = [
  { tab: "ciclo", rotulo: "Ciclo editorial", Icone: ClipboardList },
  { tab: "conversa", rotulo: "Mensagens", Icone: MessageSquare },
  { tab: "reuniao", rotulo: "Reunião dos CSs", Icone: Users },
  { tab: "eventos", rotulo: "Eventos e por quês", Icone: ListChecks },
  { tab: "head", rotulo: "Head de CS", Icone: Crown },
  { tab: "missoes", rotulo: "Missões", Icone: Target },
  { tab: "relatorio", rotulo: "Relatório da manhã", Icone: FileText },
  { tab: "analise", rotulo: "Análise", Icone: BarChart3 },
  { tab: "cenarios", rotulo: "Cenários de estresse", Icone: ShieldCheck },
  { tab: "registros", rotulo: "Registros", Icone: ScrollText },
  { tab: "storyboard", rotulo: "Storyboard", Icone: Clapperboard },
];

function temaDe(i: number) { return TEMAS[((i % TEMAS.length) + TEMAS.length) % TEMAS.length]; }

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

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

export default function OfficeGame(props: Props) {
  const {
    empresas, buAtual, onEscolherEmpresa, estados, aguardandoGestor, selecionado, onSelecionar, metricas, atividade, tema,
    nomeCS, descricao, tab, painelAberto, reuniao, busca, onSair, onPainel, temRelatorio, pendencias, children,
  } = props;

  const contRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const dados = useRef(props);
  dados.current = props;

  const [vista, setVistaState] = useState<"mundo" | "sala">("mundo");
  const vistaRef = useRef<"mundo" | "sala">("mundo");
  const [vel, setVelState] = useState(1);
  const velRef = useRef(1);
  const [seguir, setSeguirState] = useState(false);
  const seguirRef = useRef(false);
  const [reduzido, setReduzido] = useState(false);
  const [hora, setHora] = useState(12);
  const horaRef = useRef(12);
  const [cursor, setCursor] = useState("default");
  const [zoomRot, setZoomRot] = useState(1);

  const mundoRef = useRef<Mundo | null>(null);
  const camMundo = useRef<Cam>({ cx: WW / 2, cy: WH / 2, z: 1 });
  const camSala = useRef<Cam>({ cx: W / 2, cy: H / 2, z: 1 });
  const tamanho = useRef({ cw: 800, ch: 500, dpr: 1 });
  const hoverPredio = useRef<string | null>(null);
  const animacao = useRef<{ cam: Cam; de: Cam; para: Cam; t0: number; dur: number; fim?: () => void } | null>(null);
  const fade = useRef(0);
  // instante (tSim) em que a reunião atual começou a ser mostrada; anima a chegada escalonada dos CSs
  const reuniaoDesde = useRef<number | null>(null);
  // andar visível no mundo e atalho para as squads dele
  const [andar, setAndar] = useState<AndarId>("jacqes");
  const andarRef = useRef<AndarId>("jacqes");
  const prediosDoAndar = useCallback(() => layoutPredios(dados.current.empresas.filter((e) => andarDaEmpresa(e) === andarRef.current)), []);
  const offSala = useRef<HTMLCanvasElement | null>(null);
  const offMundo = useRef<HTMLCanvasElement | null>(null);
  const arraste = useRef<{ x: number; y: number; cx: number; cy: number; mexeu: boolean } | null>(null);
  const reduzidoRef = useRef(false);

  const setVista = (v: "mundo" | "sala") => { vistaRef.current = v; setVistaState(v); };
  const setVel = (v: number) => { velRef.current = v; setVelState(v); };
  const setSeguir = (v: boolean) => { seguirRef.current = v; setSeguirState(v); };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => { setReduzido(mq.matches); reduzidoRef.current = mq.matches; };
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  useEffect(() => {
    const atualizar = () => { const h = horaBrasilia(); horaRef.current = h; setHora(h); };
    atualizar();
    const id = window.setInterval(atualizar, 30000);
    return () => window.clearInterval(id);
  }, []);

  // um mundo (sala) novo para cada empresa
  useEffect(() => { mundoRef.current = criarMundo(reduzido); }, [buAtual, reduzido]);

  const escalaDe = useCallback((Wv: number, Hv: number, z: number) => {
    const { cw, ch } = tamanho.current;
    return Math.min(cw / Wv, ch / Hv) * 0.96 * z;
  }, []);

  const animar = useCallback((cam: Cam, para: Cam, dur: number, fim?: () => void) => {
    if (reduzidoRef.current || dur <= 0) { cam.cx = para.cx; cam.cy = para.cy; cam.z = para.z; fim?.(); return; }
    animacao.current = { cam, de: { ...cam }, para, t0: performance.now(), dur, fim };
  }, []);

  const entrar = useCallback((bu: string) => {
    if (animacao.current) return;
    const emp = dados.current.empresas.find((e) => e.bu === bu);
    if (emp && andarDaEmpresa(emp) !== andarRef.current) { andarRef.current = andarDaEmpresa(emp); setAndar(andarRef.current); }
    const predios = prediosDoAndar();
    const p = predios.find((x) => x.empresa.bu === bu);
    const alvo = p ? centroDoPredio(p) : { x: WW / 2, y: WH / 2 };
    setSeguir(false);
    animar(camMundo.current, { cx: alvo.x, cy: alvo.y, z: 3.2 }, 520, () => {
      dados.current.onEscolherEmpresa(bu);
      fade.current = 1;
      camSala.current = { cx: W / 2, cy: H / 2, z: 0.55 };
      setVista("sala");
      animar(camSala.current, { cx: W / 2, cy: H / 2, z: 1 }, 520);
    });
  }, [animar, prediosDoAndar]);

  const sair = useCallback(() => {
    if (animacao.current || vistaRef.current === "mundo") return;
    const predios = prediosDoAndar();
    const p = predios.find((x) => x.empresa.bu === dados.current.buAtual);
    const alvo = p ? centroDoPredio(p) : { x: WW / 2, y: WH / 2 };
    setSeguir(false);
    animar(camSala.current, { cx: W / 2, cy: H / 2, z: 0.45 }, 360, () => {
      fade.current = 1;
      camMundo.current = { cx: alvo.x, cy: alvo.y, z: 3 };
      setVista("mundo");
      animar(camMundo.current, { cx: WW / 2, cy: WH / 2, z: 1 }, 650);
    });
  }, [animar, prediosDoAndar]);

  /** Troca o andar visível; dentro de uma sala, primeiro volta ao mundo. */
  const trocarAndar = useCallback((id: AndarId) => {
    if (id === andarRef.current) return;
    const fazer = () => {
      andarRef.current = id;
      setAndar(id);
      fade.current = 1;
      camMundo.current = { cx: WW / 2, cy: WH / 2, z: 1 };
      setZoomRot(1);
      setSeguir(false);
    };
    // dentro de uma sala: sai direto para o mundo (o fade cobre a transição) e já mostra o outro andar
    if (vistaRef.current === "sala") { animacao.current = null; setVista("mundo"); }
    fazer();
  }, []);

  const recentrar = useCallback(() => {
    if (vistaRef.current === "sala") animar(camSala.current, { cx: W / 2, cy: H / 2, z: 1 }, 380);
    else animar(camMundo.current, { cx: WW / 2, cy: WH / 2, z: 1 }, 380);
    setSeguir(false);
  }, [animar]);

  // ── busca global ────────────────────────────────────────────────────────────
  const [termo, setTermo] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const resultados = (busca ?? []).filter((i) => !termo.trim() || norm(`${i.rotulo} ${i.sub}`).includes(norm(termo.trim()))).slice(0, 8);

  /**
   * Clique e busca do Estúdio: vai ao 3º andar, aproxima a sala e fecha a gaveta.
   * A gaveta (ciclo, mensagens, reunião) não tem conteúdo do estúdio — abri-la
   * deixava a metade direita da planta em branco. O set em si chega no modo 3D
   * dos PRs seguintes; aqui o clique só enquadra o Estúdio.
   */
  const focarEstudio = () => {
    onPainel(false);
    if (andarRef.current !== "caza") trocarAndar("caza");
    const c = centroDoEstudio();
    setSeguir(false);
    animar(camMundo.current, { cx: c.x, cy: c.y - 14, z: 2 }, 650);
  };

  const irParaItem = (i: ItemBusca) => {
    setTermo("");
    setBuscaAberta(false);
    const noMundo = (fn: () => void) => {
      if (vistaRef.current === "sala") { sair(); setTimeout(fn, 1400); } else fn();
    };
    if (i.tipo === "andar" && i.andar) { trocarAndar(i.andar); return; }
    if (i.tipo === "sala" && i.sala === "reunioes") { if (andarRef.current !== "jacqes") trocarAndar("jacqes"); onPainel(true, "reuniao"); return; }
    if (i.tipo === "sala" && i.sala === "estudio") {
      noMundo(focarEstudio);
      return;
    }
    if (i.tipo === "sala" && i.sala === "diretoria") {
      noMundo(() => { const c = centroDaDiretoria(); setSeguir(false); animar(camMundo.current, { cx: c.x + 20, cy: c.y - 8, z: 2.2 }, 650); });
      return;
    }
    if (i.bu) {
      const bu = i.bu;
      noMundo(() => {
        if (bu === dados.current.buAtual && vistaRef.current === "sala") return;
        entrar(bu);
        if (i.role) setTimeout(() => dados.current.onSelecionar(i.role as Agente), 1300);
      });
    }
  };

  const naReuniao = painelAberto && tab === "reuniao";
  useEffect(() => {
    if (!naReuniao) return;
    const ir = () => {
      const c = centroDaReuniao();
      setSeguir(false);
      animar(camMundo.current, { cx: c.x + 50, cy: c.y - 8, z: 1.9 }, 650);
    };
    if (vistaRef.current === "mundo") { ir(); return; }
    sair();
    const t = setTimeout(ir, 1400);
    return () => clearTimeout(t);
  }, [naReuniao, animar, sair]);

  const zoomPor = useCallback((fator: number) => {
    const sala = vistaRef.current === "sala";
    const cam = sala ? camSala.current : camMundo.current;
    cam.z = clamp(cam.z * fator, sala ? 0.6 : 0.8, sala ? 4 : 5);
  }, []);

  // ── laço principal ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const cont = contRef.current;
    if (!canvas || !cont) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    offSala.current = document.createElement("canvas");
    offSala.current.width = W * ESCALA; offSala.current.height = H * ESCALA;
    offMundo.current = document.createElement("canvas");
    offMundo.current.width = WW * ESCALA; offMundo.current.height = WH * ESCALA;
    const gSala = offSala.current.getContext("2d");
    const gMundo = offMundo.current.getContext("2d");
    if (!gSala || !gMundo) return;

    const medir = () => {
      const r = cont.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      tamanho.current = { cw: r.width, ch: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cont);

    let ultimo = performance.now();
    let tSim = 0;
    let acum = 0;
    let quadro = 0;
    let raf = 0;

    const loop = (agora: number) => {
      const dtReal = Math.min(0.1, (agora - ultimo) / 1000);
      ultimo = agora;
      const d = dados.current;
      const v = vistaRef.current;
      const dt = dtReal * velRef.current;
      tSim += dt;
      acum += dt;
      if (acum >= 0.14) { acum = 0; quadro += 1; }

      // animação de câmera
      const an = animacao.current;
      if (an) {
        const t = clamp((agora - an.t0) / an.dur, 0, 1);
        const e = ease(t);
        an.cam.cx = an.de.cx + (an.para.cx - an.de.cx) * e;
        an.cam.cy = an.de.cy + (an.para.cy - an.de.cy) * e;
        an.cam.z = an.de.z + (an.para.z - an.de.z) * e;
        if (t >= 1) { animacao.current = null; an.fim?.(); }
      }
      if (fade.current > 0) fade.current = Math.max(0, fade.current - dtReal * 3);

      const { cw, ch, dpr } = tamanho.current;

      // cena
      let off: HTMLCanvasElement;
      let Wv: number;
      let Hv: number;
      let cam: Cam;
      if (v === "sala") {
        const m = mundoRef.current;
        if (m) {
          if (velRef.current > 0) passo(m, dt, d.estados, d.atividade);
          m.selecionado = d.selecionado;
          const humor = {} as Record<Agente, Humor>;
          (Object.keys(d.metricas) as Agente[]).forEach((a) => {
            const k = d.metricas[a];
            humor[a] = humorDe(k.alta, k.media, k.execs, k.formato);
          });
          desenhar(gSala, m, {
            tema: temaDe(d.tema), hora: horaRef.current, estados: d.estados, aguardandoGestor: d.aguardandoGestor, humor,
            nomes: { cs: d.nomeCS }, atividade: d.atividade,
          }, quadro);
          if (seguirRef.current && !animacao.current) {
            const a = m.atores[d.selecionado];
            const pos = isoC(a.x, a.y);
            const c = camSala.current;
            const k = Math.min(1, dtReal * 4);
            c.cx += (pos.x - c.cx) * k; c.cy += (pos.y - 10 - c.cy) * k; c.z += (2.4 - c.z) * k;
          }
        }
        off = offSala.current!; Wv = W; Hv = H; cam = camSala.current;
      } else {
        const reuniaoAtiva = andarRef.current === "jacqes" && d.reuniao && d.reuniao.length > 0 ? d.reuniao : undefined;
        if (reuniaoAtiva && reuniaoDesde.current === null) reuniaoDesde.current = tSim;
        else if (!reuniaoAtiva) reuniaoDesde.current = null;
        desenharMundo(gMundo, layoutPredios(d.empresas.filter((e) => andarDaEmpresa(e) === andarRef.current)), {
          andar: andarRef.current, reuniao: reuniaoAtiva, reuniaoDesde: reuniaoDesde.current, hora: horaRef.current, hover: hoverPredio.current, selecionado: d.buAtual, quadro, t: tSim, reduzido: reduzidoRef.current,
        });
        off = offMundo.current!; Wv = WW; Hv = WH; cam = camMundo.current;
      }

      // composição na tela
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, "#0a101f"); g.addColorStop(1, "#16223f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = false;
      const s = Math.min(cw / Wv, ch / Hv) * 0.96 * cam.z;
      ctx.drawImage(off, 0, 0, off.width, off.height, cw / 2 - cam.cx * s, ch / 2 - cam.cy * s, Wv * s, Hv * s);
      if (fade.current > 0) { ctx.fillStyle = `rgba(10,16,31,${fade.current.toFixed(3)})`; ctx.fillRect(0, 0, cw, ch); }

      // minimapa
      const mini = miniRef.current;
      const mg = mini?.getContext("2d");
      if (mini && mg) {
        const mw = mini.width, mh = mini.height;
        mg.setTransform(1, 0, 0, 1, 0, 0);
        mg.fillStyle = "#0a101f"; mg.fillRect(0, 0, mw, mh);
        const ms = Math.min(mw / Wv, mh / Hv);
        const ox = (mw - Wv * ms) / 2, oy = (mh - Hv * ms) / 2;
        mg.imageSmoothingEnabled = true;
        mg.drawImage(off, 0, 0, off.width, off.height, ox, oy, Wv * ms, Hv * ms);
        const vw = cw / s, vh = ch / s;
        const rx = ox + (cam.cx - vw / 2) * ms, ry = oy + (cam.cy - vh / 2) * ms;
        mg.strokeStyle = "#fbbf24"; mg.lineWidth = 1.5;
        mg.strokeRect(rx, ry, vw * ms, vh * ms);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // roda do mouse: zoom no ponto sob o cursor; ultrapassar os limites troca o nível
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (animacao.current) return;
      const sala = vistaRef.current === "sala";
      const cam = sala ? camSala.current : camMundo.current;
      const Wv = sala ? W : WW, Hv = sala ? H : WH;
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const { cw, ch } = tamanho.current;
      const s0 = Math.min(cw / Wv, ch / Hv) * 0.96 * cam.z;
      const lx = (px - cw / 2) / s0 + cam.cx, ly = (py - ch / 2) / s0 + cam.cy;
      const z1 = cam.z * Math.exp(-e.deltaY * 0.0016);
      if (sala && z1 < 0.55 && e.deltaY > 0) { sair(); return; }
      if (!sala && z1 > 3.1 && e.deltaY < 0) {
        const predios = prediosDoAndar();
        const alvo = predioNoPonto(predios, lx, ly) ?? predios.find((p) => p.empresa.bu === dados.current.buAtual) ?? predios[0];
        if (alvo) { entrar(alvo.empresa.bu); return; }
      }
      cam.z = clamp(z1, sala ? 0.55 : 0.8, sala ? 4 : 5);
      const s1 = Math.min(cw / Wv, ch / Hv) * 0.96 * cam.z;
      cam.cx = clamp(lx - (px - cw / 2) / s1, 0, Wv);
      cam.cy = clamp(ly - (py - ch / 2) / s1, 0, Hv);
      setSeguir(false);
      setZoomRot(cam.z);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [entrar, sair, prediosDoAndar]);

  // ── entrada: arrastar, clicar, passar o mouse ───────────────────────────────

  const paraLogico = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const sala = vistaRef.current === "sala";
    const cam = sala ? camSala.current : camMundo.current;
    const s = escalaDe(sala ? W : WW, sala ? H : WH, cam.z);
    const { cw, ch } = tamanho.current;
    return { lx: (e.clientX - r.left - cw / 2) / s + cam.cx, ly: (e.clientY - r.top - ch / 2) / s + cam.cy, s, cam };
  };

  const aoPressionar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (animacao.current) return;
    const { cam } = paraLogico(e);
    arraste.current = { x: e.clientX, y: e.clientY, cx: cam.cx, cy: cam.cy, mexeu: false };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const aoMover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = arraste.current;
    const { lx, ly, s, cam } = paraLogico(e);
    if (a) {
      const dx = e.clientX - a.x, dy = e.clientY - a.y;
      if (!a.mexeu && Math.hypot(dx, dy) > 4) { a.mexeu = true; setSeguir(false); setCursor("grabbing"); }
      if (a.mexeu) {
        const sala = vistaRef.current === "sala";
        cam.cx = clamp(a.cx - dx / s, 0, sala ? W : WW);
        cam.cy = clamp(a.cy - dy / s, 0, sala ? H : WH);
      }
      return;
    }
    if (vistaRef.current === "mundo") {
      const p = predioNoPonto(prediosDoAndar(), lx, ly);
      hoverPredio.current = p?.empresa.bu ?? null;
      const casa = casaNoPonto(lx, ly, andarRef.current);
      setCursor(p || casa === "reunioes" || casa === "estudio" ? "pointer" : "grab");
    } else {
      const m = mundoRef.current;
      if (!m) return;
      const at = atorNoPonto(m, lx, ly);
      m.hover = at;
      setCursor(at || tileDoPonto(lx, ly) ? "pointer" : "grab");
    }
  };

  const aoSoltar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = arraste.current;
    arraste.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    setCursor("grab");
    if (!a || a.mexeu) return;
    const { lx, ly } = paraLogico(e);
    if (vistaRef.current === "mundo") {
      const p = predioNoPonto(prediosDoAndar(), lx, ly);
      if (p) entrar(p.empresa.bu);
      else {
        const casa = casaNoPonto(lx, ly, andarRef.current);
        if (casa === "reunioes") dados.current.onPainel(true, "reuniao");
        else if (casa === "estudio") focarEstudio();
      }
      return;
    }
    const m = mundoRef.current;
    if (!m) return;
    const at = atorNoPonto(m, lx, ly);
    if (at && at !== "gestor") { onSelecionar(at as Agente); return; }
    if (at === "gestor") return;
    const t = tileDoPonto(lx, ly);
    if (t) moverGestor(m, t);
  };

  const aoMiniMapa = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1 && e.type === "pointermove") return;
    const mini = miniRef.current!;
    const r = mini.getBoundingClientRect();
    const sala = vistaRef.current === "sala";
    const Wv = sala ? W : WW, Hv = sala ? H : WH;
    const ms = Math.min(mini.width / Wv, mini.height / Hv);
    const ox = (mini.width - Wv * ms) / 2, oy = (mini.height - Hv * ms) / 2;
    const px = ((e.clientX - r.left) / r.width) * mini.width, py = ((e.clientY - r.top) / r.height) * mini.height;
    const cam = sala ? camSala.current : camMundo.current;
    cam.cx = clamp((px - ox) / ms, 0, Wv);
    cam.cy = clamp((py - oy) / ms, 0, Hv);
    setSeguir(false);
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setBuscaAberta(true);
      buscaRef.current?.focus();
      return;
    }
    const alvo = e.target as HTMLElement;
    // digitando em campo de texto: atalhos do jogo (espaço, +, -) não podem engolir as teclas
    if (alvo.closest("input, textarea, select, [contenteditable='true']")) {
      if (e.key === "Escape") (alvo as HTMLElement).blur();
      return;
    }
    if (e.key === "Escape") { if (painelAberto) onPainel(false); else if (vistaRef.current === "sala") sair(); }
    else if (e.key === "+" || e.key === "=") zoomPor(1.2);
    else if (e.key === "-") zoomPor(1 / 1.2);
    else if (e.key === " ") { e.preventDefault(); setVel(velRef.current === 0 ? 1 : 0); }
  };

  // ── camadas de interface ────────────────────────────────────────────────────

  const empresaAtual = empresas.find((e) => e.bu === buAtual);
  const alertas = empresas.reduce((a, e) => a + e.alta, 0);
  const per = periodo(hora);
  const hh = String(Math.floor(hora)).padStart(2, "0");
  const mm = String(Math.floor((hora % 1) * 60)).padStart(2, "0");
  const k = metricas[selecionado];
  const humor = humorDe(k.alta, k.media, k.execs, k.formato);
  const nomeEmpresa = empresaAtual?.nome ?? buAtual;

  const alternarPainel = (t: PainelTab) => onPainel(!(painelAberto && tab === t), t);

  return (
    <div
      ref={contRef}
      tabIndex={0}
      onKeyDown={aoTeclar}
      className="relative w-full h-full overflow-hidden bg-[#0a101f] outline-none"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerLeave={() => { hoverPredio.current = null; if (mundoRef.current) mundoRef.current.hover = null; }}
        role="img"
        aria-label={descricao}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ imageRendering: "pixelated", cursor }}
      />

      {/* Barra superior: onde você está */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 py-2 pointer-events-none">
        {onSair && (
          <button onClick={onSair} title="Voltar ao painel" aria-label="Voltar ao painel" className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/60 text-white text-xs px-2.5 py-1.5 hover:bg-black/80">
            <ArrowLeft size={13} /> Painel
          </button>
        )}
        <div role="group" aria-label="Andares" className="pointer-events-auto flex items-center gap-0.5 rounded-lg bg-black/60 p-0.5 text-xs text-white">
          {[...ANDARES].reverse().map((a) => (
            <button
              key={a.id}
              onClick={() => trocarAndar(a.id)}
              title={`Andar ${a.numero}: ${a.descricao}`}
              aria-pressed={andar === a.id}
              className={`rounded-md px-2 py-1 ${andar === a.id ? "bg-white text-gray-900 font-semibold" : "hover:bg-white/10"}`}
            >
              {a.numero}º · {a.nome}
            </button>
          ))}
        </div>
        <nav aria-label="Localização" className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/60 text-white text-xs px-2.5 py-1.5">
          <button className={`hover:underline ${vista === "mundo" ? "font-semibold" : ""}`} onClick={() => vista === "sala" && sair()}>Escritório AWQ</button>
          {vista === "sala" && (
            <>
              <ChevronRight size={12} className="text-white/50" />
              <span className="font-semibold">{nomeEmpresa}</span>
              <ChevronRight size={12} className="text-white/50" />
              <span className="text-white/80">{selecionado === "cs" ? nomeCS : ROTULO[selecionado].curto}</span>
            </>
          )}
        </nav>
        {busca && busca.length > 0 && (
          <div className="pointer-events-auto relative">
            <div className="flex items-center gap-1.5 rounded-lg bg-black/60 text-white text-xs px-2.5 py-1.5">
              <Search size={13} className="text-white/60" />
              <input
                ref={buscaRef}
                value={termo}
                onChange={(e) => { setTermo(e.target.value); setBuscaAberta(true); }}
                onFocus={() => setBuscaAberta(true)}
                onBlur={() => setTimeout(() => setBuscaAberta(false), 150)}
                onKeyDown={(e) => { if (e.key === "Enter" && resultados[0]) { e.preventDefault(); irParaItem(resultados[0]); } }}
                placeholder="Buscar empresa, agente ou sala (Ctrl/Cmd + K)"
                aria-label="Busca global"
                className="bg-transparent outline-none placeholder:text-white/40 w-56 sm:w-72"
              />
            </div>
            {buscaAberta && resultados.length > 0 && (
              <ul className="absolute left-0 top-full mt-1 w-72 rounded-lg bg-gray-900/95 text-white text-xs shadow-xl border border-white/10 overflow-hidden z-10">
                {resultados.map((i) => (
                  <li key={i.id}>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => irParaItem(i)} className="w-full text-left px-3 py-2 hover:bg-white/10 flex flex-col">
                      <span className="font-medium">{i.rotulo}</span>
                      <span className="text-[10px] text-white/50">{i.tipo === "empresa" ? "Empresa" : i.tipo === "sala" ? "Sala" : "Agente"} · {i.sub}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          {pendencias > 0 && (
            <button onClick={() => alternarPainel("ciclo")} className="rounded-lg bg-amber-400 text-amber-950 text-xs font-semibold px-2.5 py-1.5">
              {pendencias} decisão pendente
            </button>
          )}
          {alertas > 0 && <span className="rounded-lg bg-red-500/90 text-white text-xs font-semibold px-2.5 py-1.5">{alertas} alerta{alertas > 1 ? "s" : ""}</span>}
          <span className="rounded-lg bg-black/60 text-white text-xs px-2.5 py-1.5 flex items-center gap-1.5">
            <per.Icone size={13} /> {per.rotulo} · {hh}:{mm} BRT
          </span>
        </div>
      </div>

      {/* Trilho de modos */}
      <div className="absolute left-3 top-14 flex flex-col gap-1.5">
        <button
          title="Escritório AWQ"
          aria-label="Escritório AWQ"
          onClick={() => (vista === "sala" ? sair() : recentrar())}
          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${vista === "mundo" ? "bg-brand-600 text-white border-brand-500" : "bg-black/60 text-white border-white/10 hover:bg-black/80"}`}
        >
          <Globe size={18} />
        </button>
        {RAIL.filter((r) => r.tab !== "relatorio" || temRelatorio).map(({ tab: t, rotulo, Icone }) => (
          <button
            key={t}
            title={rotulo}
            aria-label={rotulo}
            onClick={() => alternarPainel(t)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${painelAberto && tab === t ? "bg-brand-600 text-white border-brand-500" : "bg-black/60 text-white border-white/10 hover:bg-black/80"}`}
          >
            <Icone size={18} />
          </button>
        ))}
      </div>

      {/* Barra inferior */}
      <div className="absolute bottom-3 left-16 flex justify-center pointer-events-none transition-all" style={{ right: painelAberto ? 672 : 192 }}>
      <div className="pointer-events-auto max-w-full rounded-2xl bg-black/70 backdrop-blur text-white px-3 py-2 flex flex-wrap items-center justify-center gap-3">
        {vista === "sala" ? (
          <>
            <div className="flex gap-1.5">
              {(Object.keys(ROTULO) as Agente[]).map((a) => (
                <button
                  key={a}
                  onClick={() => onSelecionar(a)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${selecionado === a ? "bg-white text-gray-900 border-white" : "border-white/15 hover:bg-white/10"}`}
                >
                  <span className={`w-2 h-2 rounded-full ${estados[a] === "working" ? "bg-sky-400 animate-pulse" : estados[a] === "done" ? "bg-emerald-400" : estados[a] === "error" ? "bg-red-500" : "bg-gray-400"}`} />
                  {a === "cs" ? nomeCS : ROTULO[a].curto}
                </button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3 border-l border-white/15 pl-3">
              <span className={`w-2.5 h-4 rotate-45 rounded-sm ${humor === "critico" ? "bg-red-500" : humor === "atencao" ? "bg-yellow-400" : "bg-emerald-400"}`} aria-hidden />
              <div className="text-[11px] leading-tight">
                <div className="font-semibold">{selecionado === "cs" ? `${nomeCS} · Headcount/CS` : ROTULO[selecionado].nome}</div>
                <div className="text-white/60">{ESTADO_TXT[estados[selecionado]]}</div>
                <div className="text-white/80">
                  {atividade[selecionado].entregasHoje} entrega{atividade[selecionado].entregasHoje === 1 ? "" : "s"} hoje
                  {atividade[selecionado].ultimaTs ? ` · última há ${Math.max(1, Math.round((Date.now() - atividade[selecionado].ultimaTs!) / 60000))} min` : ""}
                </div>
                {(atividade[selecionado].pendente || atividade[selecionado].retrabalho) && (
                  <div className={atividade[selecionado].retrabalho ? "text-red-300" : "text-amber-300"}>
                    {atividade[selecionado].retrabalho ? "retrabalho necessário" : "aguardando decisão"}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {necessidades(k).map((n) => (
                  <div key={n.chave} title={`${n.chave}: ${n.dica}`} className="w-20">
                    <div className="flex justify-between text-[9px] text-white/60"><span>{n.chave}</span><span>{n.valor === null ? "-" : `${Math.round(n.valor * 100)}%`}</span></div>
                    <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div className={`h-full ${n.valor === null ? "bg-white/20" : corBarra(n.valor)}`} style={{ width: `${Math.round((n.valor ?? 0) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {empresas.filter((e) => andarDaEmpresa(e) === andar).length === 0 && <span className="text-xs text-white/60 px-1">Nenhuma squad neste andar ainda</span>}
            {empresas.filter((e) => andarDaEmpresa(e) === andar).map((e) => (
              <button key={e.bu} onClick={() => entrar(e.bu)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-white/15 hover:bg-white/10 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${e.trabalhando > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
                {e.nome}
                {e.alta > 0 && <span className="text-red-300">!{e.alta}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 border-l border-white/15 pl-3">
          <button title="Pausar (espaço)" aria-label="Pausar" onClick={() => setVel(0)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${vel === 0 ? "bg-white text-gray-900" : "hover:bg-white/10"}`}><Pause size={14} /></button>
          <button title="Velocidade 1x" aria-label="Velocidade 1x" onClick={() => setVel(1)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${vel === 1 ? "bg-white text-gray-900" : "hover:bg-white/10"}`}><Play size={14} /></button>
          <button title="Velocidade 2x" aria-label="Velocidade 2x" onClick={() => setVel(2)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${vel === 2 ? "bg-white text-gray-900" : "hover:bg-white/10"}`}><FastForward size={14} /></button>
          <button title="Velocidade 4x" aria-label="Velocidade 4x" onClick={() => setVel(4)} className={`h-7 px-1.5 rounded-lg text-[11px] font-bold ${vel === 4 ? "bg-white text-gray-900" : "hover:bg-white/10"}`}>4x</button>
        </div>
        <div className="flex items-center gap-1 border-l border-white/15 pl-3">
          <button title="Menos zoom" aria-label="Menos zoom" onClick={() => zoomPor(1 / 1.25)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"><ZoomOut size={14} /></button>
          <span className="text-[10px] w-8 text-center text-white/60">{Math.round(zoomRot * 100)}%</span>
          <button title="Mais zoom" aria-label="Mais zoom" onClick={() => zoomPor(1.25)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"><ZoomIn size={14} /></button>
          <button title="Recentralizar" aria-label="Recentralizar" onClick={recentrar} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"><Crosshair size={14} /></button>
          {vista === "sala" && (
            <button title="Seguir o agente selecionado" aria-label="Seguir o agente selecionado" aria-pressed={seguir} onClick={() => setSeguir(!seguir)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${seguir ? "bg-white text-gray-900" : "hover:bg-white/10"}`}><Eye size={14} /></button>
          )}
        </div>
      </div>
      </div>

      {/* Minimapa */}
      <canvas
        ref={miniRef}
        width={220}
        height={120}
        onPointerDown={aoMiniMapa}
        onPointerMove={aoMiniMapa}
        aria-label="Minimapa"
        className="absolute bottom-3 rounded-lg border border-white/20 bg-black/40 cursor-crosshair transition-all"
        style={{ right: painelAberto ? 492 : 12, width: 168, height: 92 }}
      />

      <p className={`absolute left-16 bottom-3 text-[10px] text-white/45 max-w-[150px] pointer-events-none hidden 2xl:block ${painelAberto ? "2xl:hidden" : ""}`}>
        {vista === "mundo"
          ? "Clique numa sala de cliente (ou dê zoom nela) para entrar. Arraste para mover a planta."
          : "Clique num agente para selecioná-lo, no chão para mover o gestor. Afaste o zoom para voltar à planta do escritório. Esc também volta."}
      </p>

      {/* Gaveta de painéis */}
      <aside
        className={`absolute top-0 bottom-0 right-0 w-[480px] max-w-[94%] bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 ${painelAberto ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!painelAberto}
      >
        <button
          onClick={() => onPainel(false)}
          aria-label="Fechar painel"
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
        >
          <X size={14} />
        </button>
        <div className="h-full">{painelAberto ? children : null}</div>
      </aside>
    </div>
  );
}

