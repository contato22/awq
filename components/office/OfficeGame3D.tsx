"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  ArrowLeft, BarChart3, ChevronRight, Clapperboard, ClipboardList, Crosshair, Crown, FastForward, FileText, Globe, ListChecks,
  MessageSquare, Moon, Pause, Play, ScrollText, Search, ShieldCheck, Sun, Sunrise, Sunset, Target, Users, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { ceu, luzDoDia, TEMAS, type Agente, type Atividade, type Estado } from "@/lib/office-iso";
import { andarDaEmpresa, ANDARES, layoutPredios, SALA_ESTUDIO, SALAS_CASA, type AndarId, type Empresa, type EstadoReuniao, type PredioW } from "@/lib/office-world";
import { EstudioViewport } from "./studio/StudioSet";
import { aparenciaDe } from "@/lib/office-aparencia";
import { texturaMadeira, texturaRotulo, texturaSombraContato, texturaTapete, texturaTijolo } from "@/lib/office-3d-texturas";
import type { ItemBusca, MetricaAgente, PainelTab } from "./OfficeGame";

/**
 * Camada de renderização 3D do Office, alternativa ao mundo isométrico em canvas 2D
 * (`OfficeGame`). Usa EXATAMENTE a mesma interface de props — é um substituto plugável,
 * acionado por um alerta ("Modo 3D (beta)") em `OfficeSimulator`. Consome o mesmo estado
 * operacional (empresas, estados, métricas, atividade); nenhuma lógica de negócio mora aqui.
 *
 * Estado desta entrega: cena 3D integrada, câmera (zoom/pan/rotação/recentralizar), seleção
 * de empresa/agente, troca de andar, ciclo dia/noite, minimapa e indicadores de estado.
 * Personagens estilizados (diversidade por semente, pose sentada, caminhada com BFS na grade
 * da sala de squad). A planta inclui a sala do Miguel e a sala de reuniões, nos mesmos slots
 * do mundo 2D. Modelos humanos esculpidos/rigged (GLTF) ficam para quando houver asset.
 */

interface Props {
  empresas: Empresa[];
  buAtual: string;
  onEscolherEmpresa: (bu: string) => void;
  estados: Record<Agente, Estado>;
  aguardandoGestor: boolean;
  selecionado: Agente;
  onSelecionar: (a: Agente) => void;
  metricas: Record<Agente, MetricaAgente>;
  atividade: Record<Agente, Atividade>;
  tema: number;
  nomeCS: string;
  descricao: string;
  tab: PainelTab;
  painelAberto: boolean;
  onSair?: () => void;
  busca?: ItemBusca[];
  /** CSs sentados na sala de reuniões (vazio fora da reunião), o mesmo dado do mundo 2D. */
  reuniao?: EstadoReuniao[];
  onPainel: (aberto: boolean, tab?: PainelTab) => void;
  temRelatorio: boolean;
  pendencias: number;
  children: ReactNode;
}

const UNIT = 2.2; // 1 célula de grade (2D) = 2.2 unidades no mundo 3D
const PAPEIS: Agente[] = ["cs", "ref", "criativo", "midia"];
const MESAS: Record<Agente, [number, number]> = { cs: [0.8, 1], ref: [3.6, 1], criativo: [0.8, 3.6], midia: [3.6, 3.6] };
const ROTULO_CURTO: Record<Agente, string> = { cs: "CS", ref: "Referências", criativo: "Criativo", midia: "Mídia" };
const ESTADO_TXT: Record<Estado, string> = { idle: "Ocioso", working: "Trabalhando", done: "Entregou", error: "Com problema" };

const normBusca = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Aparência (pele, cabelo, roupa terrosa, calça e jaqueta) vive em lib/office-aparencia.ts
// e é estável por semente. Aqui só se desenha.

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

function periodo(h: number): { rotulo: string; Icone: React.ElementType } {
  if (h >= 5 && h < 8) return { rotulo: "Amanhecer", Icone: Sunrise };
  if (h >= 8 && h < 17) return { rotulo: "Dia", Icone: Sun };
  if (h >= 17 && h < 19.5) return { rotulo: "Fim de tarde", Icone: Sunset };
  return { rotulo: "Noite", Icone: Moon };
}

function horaBrasilia(): number {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? 12) % 24;
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

/** A trava de QA só vale no dev ou com `?qa=1`. Em produção o relógio ignora o localStorage. */
function qaHoraLiberada(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development") return true;
  return new URLSearchParams(window.location.search).get("qa") === "1";
}

/** `localStorage.office-hora` (0–24) trava o relógio para a captura de QA. Sem a chave, vale Brasília. */
function horaInicial(): number {
  if (typeof window === "undefined") return 12;
  if (!qaHoraLiberada()) return horaBrasilia();
  const fixa = window.localStorage.getItem("office-hora");
  if (fixa == null || fixa === "") return horaBrasilia();
  const n = Number(fixa);
  return Number.isFinite(n) ? ((n % 24) + 24) % 24 : horaBrasilia();
}

function horaTravada(): boolean {
  return qaHoraLiberada() && !!window.localStorage.getItem("office-hora");
}

// ── Cabelo por papel: mesma ideia de silhueta reconhecível do mundo 2D (cabeloDoPapel em
// lib/office-world.ts), só que em geometria 3D em vez de pixels. ──────────────────────────

function Cabelo({ papel, cor }: { papel: Agente; cor: string }) {
  const mat = <meshStandardMaterial color={cor} roughness={0.85} />;
  switch (papel) {
    case "criativo": // topete desalinhado, mais alto de um lado
      return (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow><sphereGeometry args={[0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />{mat}</mesh>
          <mesh position={[0.08, 1.34, -0.02]} rotation-z={0.3} castShadow><coneGeometry args={[0.07, 0.16, 8]} />{mat}</mesh>
        </group>
      );
    case "midia": // preso atrás, volume alto
      return (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow><sphereGeometry args={[0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />{mat}</mesh>
          <mesh position={[0, 1.08, -0.18]} castShadow><sphereGeometry args={[0.09, 10, 10]} />{mat}</mesh>
        </group>
      );
    case "ref": // curto e discreto, repartido de lado
      return <mesh position={[0, 1.18, 0]} castShadow><sphereGeometry args={[0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.42]} />{mat}</mesh>;
    case "cs":
    default: // repartido ao meio, clássico
      return <mesh position={[0, 1.2, 0]} castShadow><sphereGeometry args={[0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />{mat}</mesh>;
  }
}

// ── Navegação: grade de células por sala (todas as salas têm o mesmo layout de mesas, então
// a grade de obstáculos é calculada uma única vez) e busca em largura (BFS) para desviar das
// mesas/cadeiras ao caminhar — não é mais um único ponto pré-validado fixo. ───────────────────

const CELULA = 0.5;
const SALA_LADO = 5 * UNIT; // 11 — mesmo tamanho de toda sala de squad (LADO em office-world.ts)
const GRADE_N = Math.round(SALA_LADO / CELULA); // 22×22 células

function celulaDe(x: number, z: number): [number, number] {
  return [THREE.MathUtils.clamp(Math.floor(x / CELULA), 0, GRADE_N - 1), THREE.MathUtils.clamp(Math.floor(z / CELULA), 0, GRADE_N - 1)];
}
function centroCelula(cx: number, cz: number): [number, number] {
  return [(cx + 0.5) * CELULA, (cz + 0.5) * CELULA];
}
const chaveCel = (c: [number, number]) => `${c[0]},${c[1]}`;

/** Célula ocupada por mesa+cadeira de cada papel — mesmo layout em toda sala (ver MESAS). */
// Decoração fixa da sala (mesmas posições em toda sala de squad, em coordenadas locais 0..11):
// pilar estrutural no canto interno, estante numa lateral aberta, duas plantas decorativas.
const PILAR_POS: [number, number] = [0.32, 0.32];
const ESTANTE_POS: [number, number] = [8.6, 0.3];
const PLANTAS_POS: [number, number][] = [[9.6, 2.1], [1.8, 9.5]];

const OBSTACULOS: Set<string> = (() => {
  const s = new Set<string>();
  for (const papel of PAPEIS) {
    const [dx, dy] = MESAS[papel];
    const cx = dx * UNIT * 0.5, cz = dy * UNIT * 0.5;
    const [i0, j0] = celulaDe(cx - 0.4, cz - 0.4);
    const [i1, j1] = celulaDe(cx + 0.4, cz + 0.85); // cobre a mesa e a cadeira atrás dela
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) s.add(`${i},${j}`);
  }
  const bloquear = (centro: [number, number], raio: number) => {
    const [i0, j0] = celulaDe(centro[0] - raio, centro[1] - raio);
    const [i1, j1] = celulaDe(centro[0] + raio, centro[1] + raio);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) s.add(`${i},${j}`);
  };
  bloquear(PILAR_POS, 0.22);
  bloquear(ESTANTE_POS, 0.45);
  for (const p of PLANTAS_POS) bloquear(p, 0.22);
  return s;
})();

/** Busca em largura na grade da sala: devolve o caminho (centros de célula) desviando das
 * mesas, ou [] se o destino estiver inacessível. */
function bfsCaminho(origemXZ: [number, number], destinoXZ: [number, number]): [number, number][] {
  const oc = celulaDe(...origemXZ);
  const dc = celulaDe(...destinoXZ);
  if (OBSTACULOS.has(chaveCel(dc))) return [];
  if (chaveCel(oc) === chaveCel(dc)) return [destinoXZ];
  const visitado = new Set<string>([chaveCel(oc)]);
  const pai = new Map<string, [number, number]>();
  const fila: [number, number][] = [oc];
  const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let cabeca = 0;
  while (cabeca < fila.length) {
    const atual = fila[cabeca++];
    if (chaveCel(atual) === chaveCel(dc)) break;
    for (const [di, dj] of dirs) {
      const prox: [number, number] = [atual[0] + di, atual[1] + dj];
      if (prox[0] < 0 || prox[0] >= GRADE_N || prox[1] < 0 || prox[1] >= GRADE_N) continue;
      const k = chaveCel(prox);
      if (visitado.has(k) || OBSTACULOS.has(k)) continue;
      visitado.add(k);
      pai.set(k, atual);
      fila.push(prox);
    }
  }
  if (!visitado.has(chaveCel(dc))) return [];
  const caminho: [number, number][] = [dc];
  let cur = dc;
  while (chaveCel(cur) !== chaveCel(oc)) {
    const p = pai.get(chaveCel(cur));
    if (!p) break;
    caminho.push(p);
    cur = p;
  }
  caminho.reverse();
  return caminho.map(([i, j]) => centroCelula(i, j));
}

/** Um ponto de descanso livre, sorteado dentro da sala (nunca em cima de mesa/cadeira, com
 * uma margem das paredes de fundo). */
function destinoAleatorio(): [number, number] {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const i = 2 + Math.floor(Math.random() * (GRADE_N - 3));
    const j = 2 + Math.floor(Math.random() * (GRADE_N - 3));
    if (!OBSTACULOS.has(`${i},${j}`)) return centroCelula(i, j);
  }
  return centroCelula(Math.floor(GRADE_N / 2), Math.floor(GRADE_N / 2));
}

// ── Personagem: figura humana de várias partes (pernas, tronco, braços, cabeça, cabelo por
// papel), com animação de respiração/digitação quando trabalhando e caminhada com desvio real
// de obstáculos (pathfinding por BFS na grade da sala) até um ponto de descanso quando
// ociosa. ─────────────────────────────────────────────────────────────────────────────────

type FaseAndar = "no-lugar" | "indo" | "fora" | "voltando";

function Personagem({
  papel, estado, selecionado, onClick, basePos, semente, ancorado = false, olhar = Math.PI,
}: {
  papel: Agente; estado: Estado; selecionado: boolean; onClick: () => void; basePos: [number, number]; semente: string;
  /** Sentado no lugar, sem passeio — sala do Miguel e reunião. A caminhada da squad não usa isto. */
  ancorado?: boolean;
  /** rotation.y enquanto ancorado. Na mesa da squad o personagem continua virado para o monitor. */
  olhar?: number;
}) {
  const L = useMemo(() => aparenciaDe(semente), [semente]);
  const sombraTex = useMemo(() => texturaSombraContato(), []);
  const rotuloTex = useMemo(
    () => texturaRotulo(ESTADO_TXT[estado], estado === "working" ? "#38bdf8" : estado === "done" ? "#22c55e" : estado === "error" ? "#ef4444" : "#e2e8f0"),
    [estado]
  );
  const grupo = useRef<THREE.Group>(null);
  const corpoRef = useRef<THREE.Group>(null);
  const bracoE = useRef<THREE.Mesh>(null);
  const bracoD = useRef<THREE.Mesh>(null);
  const pernaE = useRef<THREE.Mesh>(null);
  const pernaD = useRef<THREE.Mesh>(null);
  const t0 = useRef(Math.random() * 10);

  const posAtual = useRef(new THREE.Vector3(basePos[0], 0, basePos[1]));
  const fase = useRef<FaseAndar>("no-lugar");
  const temporizador = useRef(2 + Math.random() * 8); // tempo sentado antes do 1º passeio
  const caminho = useRef<[number, number][]>([]);
  const indiceCaminho = useRef(0);

  const pararPernas = () => {
    if (pernaE.current) pernaE.current.rotation.x = 0;
    if (pernaD.current) pernaD.current.rotation.x = 0;
  };
  // pose sentado (joelho dobrado) — usada sempre que o personagem está na própria mesa
  const sentarPernas = () => {
    if (pernaE.current) pernaE.current.rotation.x = -1.05;
    if (pernaD.current) pernaD.current.rotation.x = -1.05;
  };

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.05);
    t0.current += dt;
    if (!grupo.current || !corpoRef.current) return;

    if (ancorado) {
      fase.current = "no-lugar";
      caminho.current = [];
      posAtual.current.set(basePos[0], 0, basePos[1]);
      grupo.current.position.copy(posAtual.current);
      grupo.current.rotation.y = olhar;
      sentarPernas();
      if (estado === "working") {
        const osc = Math.sin(t0.current * 7);
        if (bracoE.current) bracoE.current.rotation.x = -0.9 + osc * 0.12;
        if (bracoD.current) bracoD.current.rotation.x = -0.9 - osc * 0.12;
        corpoRef.current.rotation.x = 0.06;
        corpoRef.current.position.y = 0.55;
      } else {
        if (bracoE.current) bracoE.current.rotation.x = 0;
        if (bracoD.current) bracoD.current.rotation.x = 0;
        corpoRef.current.rotation.x = 0;
        corpoRef.current.position.y = 0.55 + Math.sin(t0.current * 1.4) * 0.006;
      }
      return;
    }

    if (estado !== "idle") {
      // trabalhando/entregue/com erro: sentado no lugar, de frente pro monitor
      fase.current = "no-lugar";
      caminho.current = [];
      posAtual.current.set(basePos[0], 0, basePos[1]);
      grupo.current.position.copy(posAtual.current);
      grupo.current.rotation.y = OLHAR_CAMERA;
      sentarPernas();
      if (estado === "working") {
        const osc = Math.sin(t0.current * 7);
        if (bracoE.current) bracoE.current.rotation.x = -0.9 + osc * 0.12;
        if (bracoD.current) bracoD.current.rotation.x = -0.9 - osc * 0.12;
        corpoRef.current.rotation.x = 0.06;
        corpoRef.current.position.y = 0.55;
      } else {
        if (bracoE.current) bracoE.current.rotation.x = 0;
        if (bracoD.current) bracoD.current.rotation.x = 0;
        corpoRef.current.rotation.x = 0;
        corpoRef.current.position.y = 0.55 + Math.sin(t0.current * 1.4) * 0.006;
      }
      return;
    }

    // ocioso: no-lugar (respirando) → indo (passeio) → fora (pausa) → voltando → no-lugar...
    if (fase.current === "no-lugar" || fase.current === "fora") {
      corpoRef.current.position.y = 0.55 + Math.sin(t0.current * 1.4) * 0.006; // respiração
      if (fase.current === "no-lugar") { grupo.current.rotation.y = OLHAR_CAMERA; sentarPernas(); } else pararPernas();
      temporizador.current -= dt;
      if (temporizador.current <= 0) {
        const destino = fase.current === "no-lugar" ? destinoAleatorio() : basePos;
        const origemXZ: [number, number] = [posAtual.current.x, posAtual.current.z];
        const c = bfsCaminho(origemXZ, destino);
        if (c.length > 0) {
          caminho.current = c;
          indiceCaminho.current = 0;
          fase.current = fase.current === "no-lugar" ? "indo" : "voltando";
        } else {
          temporizador.current = 2 + Math.random() * 3; // sem rota agora: tenta de novo depois
        }
      }
    } else {
      // "indo" ou "voltando": segue o caminho (lista de centros de célula) calculado por BFS
      const alvoXZ = caminho.current[indiceCaminho.current];
      if (!alvoXZ) {
        const chegouEmCasa = fase.current === "voltando";
        fase.current = chegouEmCasa ? "no-lugar" : "fora";
        temporizador.current = chegouEmCasa ? 6 + Math.random() * 10 : 2.5 + Math.random() * 3;
        pararPernas();
        if (bracoE.current) bracoE.current.rotation.x = 0;
        if (bracoD.current) bracoD.current.rotation.x = 0;
        if (chegouEmCasa) grupo.current.rotation.y = OLHAR_CAMERA;
      } else {
        const alvo = new THREE.Vector3(alvoXZ[0], 0, alvoXZ[1]);
        const delta = alvo.clone().sub(posAtual.current);
        const dist = delta.length();
        const velocidade = 0.85;
        if (dist < 0.04) {
          indiceCaminho.current++;
        } else {
          delta.normalize();
          posAtual.current.addScaledVector(delta, Math.min(velocidade * dt, dist));
          grupo.current.rotation.y = Math.atan2(delta.x, delta.z);
          const osc = Math.sin(t0.current * 9);
          if (pernaE.current) pernaE.current.rotation.x = osc * 0.5;
          if (pernaD.current) pernaD.current.rotation.x = -osc * 0.5;
          if (bracoE.current) bracoE.current.rotation.x = -osc * 0.4;
          if (bracoD.current) bracoD.current.rotation.x = osc * 0.4;
          corpoRef.current.position.y = 0.55 + Math.abs(Math.sin(t0.current * 9)) * 0.015;
        }
        grupo.current.position.copy(posAtual.current);
      }
    }
  });

  const corIndicador = estado === "done" ? "#22c55e" : estado === "error" ? "#ef4444" : estado === "working" ? "#38bdf8" : null;

  return (
    <group
      ref={grupo}
      position={[basePos[0], 0, basePos[1]]}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "default"; }}
    >
      {/* sombra de contato (fake AO barato): mancha radial no chão, sempre sob o personagem */}
      <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.46, 0.46]} />
        <meshBasicMaterial map={sombraTex} transparent depthWrite={false} />
      </mesh>
      {selecionado && (
        <>
          <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.3, 0.4, 32]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
          <sprite position={[0, 1.32, 0]} scale={[0.42, 0.11, 1]}>
            <spriteMaterial map={rotuloTex} depthTest={false} transparent />
          </sprite>
        </>
      )}
      <group scale={[L.altura, L.altura, L.altura]}>
        {/* pernas */}
        <mesh ref={pernaE} position={[-0.1, 0.27, 0]} castShadow>
          <capsuleGeometry args={[0.065, 0.3, 4, 8]} />
          <meshStandardMaterial color={L.calca} roughness={0.8} />
        </mesh>
        <mesh ref={pernaD} position={[0.1, 0.27, 0]} castShadow>
          <capsuleGeometry args={[0.065, 0.3, 4, 8]} />
          <meshStandardMaterial color={L.calca} roughness={0.8} />
        </mesh>
        {/* sapatos */}
        <mesh position={[-0.1, 0.045, 0.045]} castShadow>
          <boxGeometry args={[0.09, 0.07, 0.17]} />
          <meshStandardMaterial color="#1c1917" roughness={0.5} />
        </mesh>
        <mesh position={[0.1, 0.045, 0.045]} castShadow>
          <boxGeometry args={[0.09, 0.07, 0.17]} />
          <meshStandardMaterial color="#1c1917" roughness={0.5} />
        </mesh>
        {/* tronco + cabeça (o grupo que "respira"/inclina) */}
        <group ref={corpoRef} position={[0, 0.55, 0]}>
          {selecionado && (
            <RoundedBox args={[0.34, 0.42, 0.23]} radius={0.06} position={[0, 0, 0]}>
              <meshBasicMaterial color="#fbbf24" side={THREE.BackSide} />
            </RoundedBox>
          )}
          <RoundedBox args={[0.3, 0.38, 0.19]} radius={0.05} position={[0, 0, 0]} castShadow>
            <meshStandardMaterial color={L.corpo} roughness={0.75} />
          </RoundedBox>
          {L.jaqueta && (
            <group>
              {/* paletó aberto: as costas e as laterais deixam a camisa aparecer no meio */}
              <mesh position={[0, 0.02, -0.07]} castShadow>
                <boxGeometry args={[0.32, 0.36, 0.05]} />
                <meshStandardMaterial color={L.jaqueta} roughness={0.8} />
              </mesh>
              <mesh position={[-0.125, 0.01, 0.02]} castShadow>
                <boxGeometry args={[0.07, 0.36, 0.16]} />
                <meshStandardMaterial color={L.jaqueta} roughness={0.8} />
              </mesh>
              <mesh position={[0.125, 0.01, 0.02]} castShadow>
                <boxGeometry args={[0.07, 0.36, 0.16]} />
                <meshStandardMaterial color={L.jaqueta} roughness={0.8} />
              </mesh>
            </group>
          )}
          {/* braços — a jaqueta, quando existe, cobre a manga */}
          <mesh ref={bracoE} position={[-0.19, 0.05, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.28, 4, 8]} />
            <meshStandardMaterial color={L.jaqueta ?? L.corpo} roughness={0.75} />
          </mesh>
          <mesh ref={bracoD} position={[0.19, 0.05, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.28, 4, 8]} />
            <meshStandardMaterial color={L.jaqueta ?? L.corpo} roughness={0.75} />
          </mesh>
          {/* pescoço + cabeça */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.06, 0.08, 10]} />
            <meshStandardMaterial color={L.pele} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.42, 0]} castShadow>
            <sphereGeometry args={[0.145, 16, 16]} />
            <meshStandardMaterial color={L.pele} roughness={0.6} />
          </mesh>
          <group position={[0, 0.42, 0]}><Cabelo papel={papel} cor={L.cabelo} /></group>
          {corIndicador && (
            <mesh position={[0, 0.72, 0]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color={corIndicador} emissive={corIndicador} emissiveIntensity={estado === "working" ? 1.4 : 0.8} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

// ── Arquitetura e mobiliário de ambiente: parede em camadas (rodapé + painel + vidro com
// travessas), pilar de concreto/tijolo, estante com livros e planta — tudo procedural, sem
// nenhum arquivo externo. ──────────────────────────────────────────────────────────────────

/** Parede construída ao longo do eixo local +x (de 0 a `comprimento`); quem usa decide a
 * orientação via rotação do grupo pai — mantém a sala em cutaway isométrico (sem teto). */
function ParedeDetalhada({ comprimento, corAccent, brilho = false }: { comprimento: number; corAccent: string; brilho?: boolean }) {
  return (
    <group>
      <mesh position={[comprimento / 2, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[comprimento, 0.14, 0.06]} />
        <meshStandardMaterial color="#b89a74" roughness={0.7} />
      </mesh>
      <mesh position={[comprimento / 2, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[comprimento, 0.72, 0.045]} />
        <meshStandardMaterial color={corAccent} roughness={0.55} />
      </mesh>
      <mesh position={[comprimento / 2, 1.66, 0]}>
        <boxGeometry args={[comprimento, 1.1, 0.025]} />
        <meshPhysicalMaterial
          color={brilho ? "#ffbf70" : "#bcdcff"}
          emissive={brilho ? "#ff9a3c" : "#000000"}
          emissiveIntensity={brilho ? 0.85 : 0}
          transparent
          opacity={brilho ? 0.55 : 0.2}
          roughness={0.15}
          transmission={brilho ? 0.12 : 0.3}
          toneMapped={!brilho}
        />
      </mesh>
      {[1.3, 2.05].map((y, i) => (
        <mesh key={i} position={[comprimento / 2, y, 0.012]} castShadow>
          <boxGeometry args={[comprimento, 0.035, 0.05]} />
          <meshStandardMaterial color="#c9a978" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Pilar({ posicao, altura = 2.3 }: { posicao: [number, number]; altura?: number }) {
  const tijolo = useMemo(() => texturaTijolo(), []);
  return (
    <group position={[posicao[0], 0, posicao[1]]}>
      <mesh position={[0, altura / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.17, altura, 16]} />
        <meshStandardMaterial map={tijolo} roughness={0.9} />
      </mesh>
      <mesh position={[0, altura, 0]} castShadow>
        <boxGeometry args={[0.38, 0.06, 0.38]} />
        <meshStandardMaterial color="#d8cdb6" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Estante({ posicao }: { posicao: [number, number] }) {
  const livros = useMemo(() => {
    const cores = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7", "#f97316", "#14b8a6", "#ec4899"];
    const itens: { x: number; h: number; cor: string }[] = [];
    let x = -0.32, i = 0;
    while (x < 0.3) {
      const w = 0.03 + ((i * 37) % 10) / 400;
      itens.push({ x: x + w / 2, h: 0.14 + ((i * 53) % 10) / 90, cor: cores[i % cores.length] });
      x += w + 0.005;
      i++;
    }
    return itens;
  }, []);
  return (
    <group position={[posicao[0], 0, posicao[1]]}>
      <RoundedBox args={[0.74, 1.5, 0.22]} radius={0.02} position={[0, 0.75, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#7a4e26" roughness={0.75} />
      </RoundedBox>
      {[0.35, 0.72, 1.09, 1.42].map((y, i) => (
        <mesh key={i} position={[0, y, 0.01]} castShadow>
          <boxGeometry args={[0.68, 0.025, 0.2]} />
          <meshStandardMaterial color="#5a3a1c" roughness={0.7} />
        </mesh>
      ))}
      {[0.44, 0.81].map((y, linha) => (
        <group key={linha} position={[0, y, 0.06]}>
          {livros.map((l, i) => (
            <mesh key={i} position={[l.x, l.h / 2, 0]} castShadow>
              <boxGeometry args={[0.025, l.h, 0.16]} />
              <meshStandardMaterial color={l.cor} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0.22, 1.56, 0.02]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.08, 10]} />
        <meshStandardMaterial color="#9a6a52" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Planta({ posicao, escala = 1 }: { posicao: [number, number]; escala?: number }) {
  const folhas = useMemo(() => {
    const itens: { pos: [number, number, number]; rot: number; tam: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const r = 0.07 + ((i * 29) % 10) / 160;
      itens.push({ pos: [Math.cos(a) * r, 0.3 + ((i * 41) % 10) / 45, Math.sin(a) * r], rot: a, tam: 0.16 + ((i * 17) % 10) / 120 });
    }
    return itens;
  }, []);
  return (
    <group position={[posicao[0], 0, posicao[1]]} scale={[escala, escala, escala]}>
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.26, 12]} />
        <meshStandardMaterial color="#8a5a42" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.03, 12]} />
        <meshStandardMaterial color="#3f2a1d" roughness={0.9} />
      </mesh>
      {folhas.map((f, i) => (
        <mesh key={i} position={f.pos} rotation-y={f.rot} rotation-z={0.5} castShadow>
          <coneGeometry args={[f.tam * 0.4, f.tam, 6]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#2f7a3f" : "#3f9450"} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

// ── Sala de uma squad (piso + 2 paredes de fundo + 4 mesas) ────────────────────────────

function Sala({
  predio, estados, atividade, selecionado, ativo, detalhado, onEntrar, onSelecionar,
}: {
  predio: PredioW;
  estados: Record<Agente, Estado>;
  atividade: Record<Agente, Atividade>;
  selecionado: Agente;
  ativo: boolean;
  /** LOD simples: salas fora da sala ativa (visão do andar com 4 salas na tela) poupam as
   * peças decorativas mais caras (estante, plantas, tapete) — continuam reconhecíveis (piso,
   * paredes, mesas, personagens), só sem o acabamento fino que só compensa de perto. */
  detalhado: boolean;
  onEntrar: () => void;
  onSelecionar: (a: Agente) => void;
}) {
  const tema = TEMAS[predio.empresa.tema % TEMAS.length];
  const ox = predio.x * UNIT, oz = predio.y * UNIT;
  const w = predio.w * UNIT, d = predio.h * UNIT;
  const madeira = useMemo(() => texturaMadeira(), []);
  const pisoMap = useMemo(() => {
    const t = madeira.clone();
    t.needsUpdate = true;
    t.repeat.set(w / 2.4, d / 2.4);
    return t;
  }, [madeira, w, d]);
  const tapeteMap = useMemo(() => texturaTapete(), []);
  return (
    <group position={[ox, 0, oz]}>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[w / 2, 0, d / 2]}
        receiveShadow
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onEntrar(); }}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={pisoMap} roughness={0.85} />
      </mesh>
      {detalhado && (
        <mesh rotation-x={-Math.PI / 2} position={[2.5, 0.006, 2.5]} receiveShadow>
          <planeGeometry args={[4.3, 4.3]} />
          <meshStandardMaterial map={tapeteMap} color={tema.tapete[0]} roughness={0.95} transparent opacity={0.92} />
        </mesh>
      )}
      {/* duas paredes de fundo, em camadas (rodapé + painel + vidro com travessas), cutaway —
          sem parede frontal nem teto, pra manter a leitura isométrica */}
      {ativo && (
        <pointLight position={[w / 2, 2.2, d / 2]} color="#ffc48a" intensity={6} distance={14} decay={2} />
      )}
      <group position={[0, 0, 0.02]}>
        <ParedeDetalhada comprimento={w} corAccent={tema.paredeE} brilho={!ativo} />
      </group>
      <group position={[0.02, 0, 0]} rotation-y={-Math.PI / 2}>
        <ParedeDetalhada comprimento={d} corAccent={tema.paredeD} brilho={!ativo} />
      </group>
      <Pilar posicao={PILAR_POS} />
      {detalhado && (
        <>
          <Estante posicao={ESTANTE_POS} />
          {PLANTAS_POS.map((p, i) => <Planta key={i} posicao={p} />)}
        </>
      )}
      {PAPEIS.map((a) => {
        const [dx, dy] = MESAS[a];
        return (
          <group key={a} position={[dx * UNIT * 0.5, 0, dy * UNIT * 0.5]}>
            {/* mesa */}
            <RoundedBox args={[0.6, 0.42, 0.6]} radius={0.03} position={[0, 0.21, 0]} castShadow receiveShadow>
              <meshStandardMaterial color="#8a5a2e" roughness={0.6} />
            </RoundedBox>
            {/* gaveteiro embaixo */}
            <RoundedBox args={[0.16, 0.3, 0.3]} radius={0.015} position={[-0.21, 0.15, 0.1]} castShadow>
              <meshStandardMaterial color="#6b4423" roughness={0.6} />
            </RoundedBox>
            {/* monitor, com base e tela que acende quando trabalhando */}
            <mesh position={[0.18, 0.42, -0.15]} castShadow>
              <boxGeometry args={[0.02, 0.03, 0.08]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
            <mesh position={[0.18, 0.55, -0.15]} castShadow>
              <boxGeometry args={[0.28, 0.2, 0.025]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
            <mesh position={[0.18, 0.55, -0.137]}>
              <planeGeometry args={[0.24, 0.16]} />
              <meshStandardMaterial
                color={estados[a] === "working" ? "#1d4ed8" : "#0f172a"}
                emissive={estados[a] === "working" ? "#3b82f6" : "#0f172a"}
                emissiveIntensity={estados[a] === "working" ? 1.1 : 0.05}
              />
            </mesh>
            {/* teclado */}
            <RoundedBox args={[0.18, 0.012, 0.07]} radius={0.004} position={[0.18, 0.425, 0.08]} castShadow>
              <meshStandardMaterial color="#1f2937" roughness={0.6} />
            </RoundedBox>
            {/* caneca */}
            <mesh position={[-0.12, 0.45, -0.1]} castShadow>
              <cylinderGeometry args={[0.028, 0.028, 0.06, 10]} />
              <meshStandardMaterial color={tema.paredeD} roughness={0.5} />
            </mesh>
            {/* cadeira atrás de quem olha para a câmera do close */}
            <group
              position={[-Math.sin(OLHAR_CAMERA) * 0.18, 0, 0.3 - Math.cos(OLHAR_CAMERA) * 0.18]}
              rotation-y={OLHAR_CAMERA}
            >
              <RoundedBox args={[0.34, 0.05, 0.32]} radius={0.02} position={[0, 0.26, 0]} castShadow>
                <meshStandardMaterial color="#374151" roughness={0.7} />
              </RoundedBox>
              <RoundedBox args={[0.32, 0.4, 0.05]} radius={0.03} position={[0, 0.48, 0.15]} rotation-x={-0.08} castShadow>
                <meshStandardMaterial color="#374151" roughness={0.7} />
              </RoundedBox>
              {[[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].map(([lx, lz]) => (
                <mesh key={`${lx}-${lz}`} position={[lx, 0.13, lz]} castShadow>
                  <cylinderGeometry args={[0.012, 0.012, 0.26, 6]} />
                  <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.5} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
      {/* personagens: fora do grupo fixo da mesa — cada um controla a própria posição absoluta
          na sala (pathfinding por BFS na grade de obstáculos), não só um offset local fixo */}
      {PAPEIS.map((a) => {
        const [dx, dy] = MESAS[a];
        const basePos: [number, number] = [dx * UNIT * 0.5, dy * UNIT * 0.5 + 0.3];
        return (
          <Personagem
            key={a}
            papel={a}
            estado={estados[a]}
            selecionado={ativo && selecionado === a}
            onClick={() => { if (!ativo) onEntrar(); onSelecionar(a); }}
            basePos={basePos}
            semente={`${predio.empresa.bu}:${a}`}
          />
        );
      })}
    </group>
  );
}

function Cadeira({ posicao, rotacao = 0 }: { posicao: [number, number]; rotacao?: number }) {
  return (
    <group position={[posicao[0], 0, posicao[1]]} rotation-y={rotacao}>
      <RoundedBox args={[0.34, 0.05, 0.32]} radius={0.02} position={[0, 0.26, 0]} castShadow>
        <meshStandardMaterial color="#374151" roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.32, 0.4, 0.05]} radius={0.03} position={[0, 0.48, 0.15]} rotation-x={-0.08} castShadow>
        <meshStandardMaterial color="#374151" roughness={0.7} />
      </RoundedBox>
      {([[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]] as const).map(([lx, lz]) => (
        <mesh key={`${lx}-${lz}`} position={[lx, 0.13, lz]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.26, 6]} />
          <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Encosto da cadeira fica atrás de quem está sentado (a squad usa a mesma orientação). */
function cadeiraAtras(pos: [number, number], olhar: number, dist = 0.12): [number, number] {
  return [pos[0] - Math.sin(olhar) * dist, pos[1] - Math.cos(olhar) * dist];
}

function estadoDaReuniao(st: EstadoReuniao): Estado {
  if (st === "pensando") return "working";
  if (st === "erro") return "error";
  if (st === "pronto") return "done";
  return "idle";
}

/** Assentos da mesa de reuniões, na mesma ordem do mundo 2D: fundo, depois a fileira da frente. */
const ASSENTOS_REUNIAO: { pos: [number, number]; olhar: number; papel: Agente }[] = [
  { pos: [4.2, 4.35], olhar: 0, papel: "ref" },
  { pos: [5.5, 4.35], olhar: 0, papel: "criativo" },
  { pos: [6.8, 4.35], olhar: 0, papel: "midia" },
  { pos: [4.2, 6.65], olhar: Math.PI, papel: "ref" },
  { pos: [5.5, 6.65], olhar: Math.PI, papel: "criativo" },
  { pos: [6.8, 6.65], olhar: Math.PI, papel: "midia" },
];
const CABECEIRA_REUNIAO: { pos: [number, number]; olhar: number } = { pos: [8.05, 5.5], olhar: -Math.PI / 2 };

type CasaId = "diretoria" | "reunioes" | "estudio";

/** Sala do Miguel ou sala de reuniões — o mesmo slot da planta 2D, com o acabamento do Modo 3D.
 * O passeio com pathfinding continua só nas salas de squad; aqui todo mundo fica sentado. */
function SalaDaCasa({
  tipo, detalhado, reuniao, onEntrar,
}: {
  tipo: "diretoria" | "reunioes";
  detalhado: boolean;
  reuniao?: EstadoReuniao[];
  onEntrar: () => void;
}) {
  const origem = tipo === "diretoria" ? SALAS_CASA.diretoria : SALAS_CASA.reunioes;
  const ox = origem.x * UNIT, oz = origem.y * UNIT;
  const w = SALAS_CASA.lado * UNIT, d = SALAS_CASA.lado * UNIT;
  const accent = tipo === "diretoria" ? "#7c5a1a" : "#334155";
  const madeira = useMemo(() => texturaMadeira(), []);
  const pisoMap = useMemo(() => {
    const t = madeira.clone();
    t.needsUpdate = true;
    t.repeat.set(w / 2.4, d / 2.4);
    return t;
  }, [madeira, w, d]);
  const tapeteMap = useMemo(() => texturaTapete(), []);
  const emReuniao = tipo === "reunioes" && !!reuniao && reuniao.length > 0;
  return (
    <group position={[ox, 0, oz]}>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[w / 2, 0.004, d / 2]}
        receiveShadow
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onEntrar(); }}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={pisoMap} roughness={0.85} />
      </mesh>
      {detalhado && (
        <mesh rotation-x={-Math.PI / 2} position={[w / 2, 0.01, d / 2]} receiveShadow>
          <planeGeometry args={[tipo === "diretoria" ? 4.2 : 5.2, tipo === "diretoria" ? 3.4 : 4.4]} />
          <meshStandardMaterial map={tapeteMap} color={accent} roughness={0.95} transparent opacity={0.9} />
        </mesh>
      )}
      {detalhado && (
        <pointLight position={[w / 2, 2.2, d / 2]} color="#ffc48a" intensity={6} distance={14} decay={2} />
      )}
      <group position={[0, 0, 0.02]}>
        <ParedeDetalhada comprimento={w} corAccent={accent} brilho={!detalhado} />
      </group>
      <group position={[0.02, 0, 0]} rotation-y={-Math.PI / 2}>
        <ParedeDetalhada comprimento={d} corAccent={accent} brilho={!detalhado} />
      </group>
      <Pilar posicao={PILAR_POS} />
      {tipo === "diretoria" ? (
        <>
          <RoundedBox args={[1.5, 0.42, 0.72]} radius={0.03} position={[5.5, 0.21, 3.15]} castShadow receiveShadow>
            <meshStandardMaterial color="#6b4423" roughness={0.55} />
          </RoundedBox>
          <mesh position={[5.5, 0.55, 2.9]} castShadow>
            <boxGeometry args={[0.42, 0.26, 0.03]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[5.5, 0.55, 2.915]}>
            <planeGeometry args={[0.36, 0.2]} />
            <meshStandardMaterial color="#1d4ed8" emissive="#3b82f6" emissiveIntensity={0.7} />
          </mesh>
          <Cadeira posicao={cadeiraAtras([5.5, 3.85], Math.PI)} rotacao={0} />
          <Personagem
            papel="cs"
            estado="working"
            selecionado={false}
            onClick={onEntrar}
            basePos={[5.5, 3.85]}
            semente="miguel"
            ancorado
            olhar={Math.PI}
          />
          {detalhado && (
            <>
              <Estante posicao={[1.3, 0.35]} />
              <Planta posicao={[9.4, 1.4]} />
              <RoundedBox args={[0.46, 0.28, 0.32]} radius={0.02} position={[2.1, 0.14, 8.3]} castShadow>
                <meshStandardMaterial color="#e0cba6" roughness={0.75} />
              </RoundedBox>
              <group position={[8.7, 0, 8.1]}>
                <mesh position={[0, 0.7, 0]} castShadow>
                  <cylinderGeometry args={[0.015, 0.015, 1.4, 8]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.4} roughness={0.4} />
                </mesh>
                <mesh position={[0.22, 1.22, 0]} castShadow>
                  <boxGeometry args={[0.42, 0.24, 0.015]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.6} />
                </mesh>
              </group>
            </>
          )}
        </>
      ) : (
        <>
          <RoundedBox args={[3.6, 0.08, 1.45]} radius={0.02} position={[5.5, 0.42, 5.5]} castShadow receiveShadow>
            <meshStandardMaterial color="#e5e7eb" roughness={0.45} />
          </RoundedBox>
          {[[4.1, 5.0], [6.9, 5.0], [4.1, 6.0], [6.9, 6.0]].map(([lx, lz]) => (
            <mesh key={`${lx}-${lz}`} position={[lx, 0.21, lz]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.42, 8]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.35} roughness={0.4} />
            </mesh>
          ))}
          {ASSENTOS_REUNIAO.map((a) => (
            <Cadeira key={`${a.pos[0]}-${a.pos[1]}`} posicao={cadeiraAtras(a.pos, a.olhar)} rotacao={a.olhar + Math.PI} />
          ))}
          {emReuniao && reuniao && (
            <>
              <Cadeira posicao={cadeiraAtras(CABECEIRA_REUNIAO.pos, CABECEIRA_REUNIAO.olhar)} rotacao={CABECEIRA_REUNIAO.olhar + Math.PI} />
              <Personagem
                papel="cs"
                estado="idle"
                selecionado={false}
                onClick={onEntrar}
                basePos={CABECEIRA_REUNIAO.pos}
                semente="gestor-reuniao"
                ancorado
                olhar={CABECEIRA_REUNIAO.olhar}
              />
              {reuniao.slice(0, ASSENTOS_REUNIAO.length).map((st, i) => {
                const a = ASSENTOS_REUNIAO[i];
                return (
                  <Personagem
                    key={i}
                    papel={a.papel}
                    estado={estadoDaReuniao(st)}
                    selecionado={false}
                    onClick={onEntrar}
                    basePos={a.pos}
                    semente={`reuniao:${i}:${a.papel}`}
                    ancorado
                    olhar={a.olhar}
                  />
                );
              })}
            </>
          )}
          {detalhado && (
            <>
              <Planta posicao={[9.4, 1.3]} />
              <group position={[5.5, 1.35, 0.14]}>
                <mesh castShadow>
                  <boxGeometry args={[1.7, 0.95, 0.05]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
                <mesh position={[0, 0, 0.03]}>
                  <planeGeometry args={[1.5, 0.78]} />
                  <meshStandardMaterial
                    color={emReuniao ? "#38bdf8" : "#1e293b"}
                    emissive={emReuniao ? "#0ea5e9" : "#0f172a"}
                    emissiveIntensity={emReuniao ? 0.55 : 0.05}
                  />
                </mesh>
              </group>
            </>
          )}
        </>
      )}
    </group>
  );
}

// ── Câmera: aproxima a sala selecionada, recua para a visão do andar ──────────────────

export interface CameraApi { zoomBy: (fator: number) => void }

// Ângulo de visão fixo (um "olhar isométrico" clássico, como o mundo 2D): só a distância e
// o ponto mirado mudam. Reposicionar direto (sem mexer com o estado esférico interno do
// OrbitControls a cada frame) evita a câmera degenerar para um ângulo raso/errático.
// O close da sala usa um pitch mais baixo e uma distância maior: o alvo antigo (y=0.6, dist 9.5)
// cortava a cabeça no topo e deixava o piso com ~80% do quadro.
const DIRECAO_CAM = new THREE.Vector3(0.9, 0.48, 0.82).normalize();
/** Yaw de quem está sentado na squad, de frente para a câmera do close. */
const OLHAR_CAMERA = Math.atan2(DIRECAO_CAM.x, DIRECAO_CAM.z);
const DIST_PERTO = 20;
const Y_ALVO_PERTO = 1.3;

function CameraRig({
  vista, alvo, apiRef,
}: { vista: "mundo" | "sala" | "casa"; alvo: [number, number, number]; apiRef: React.MutableRefObject<CameraApi | null> }) {
  const controlsRef = useRef<any>(null);

  const aplicar = (dist: number) => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const alvoVec = new THREE.Vector3(...alvo);
    ctrl.target.copy(alvoVec);
    ctrl.object.position.copy(alvoVec).addScaledVector(DIRECAO_CAM, dist);
    ctrl.update();
  };

  const alvoKey = alvo.join(",");
  useEffect(() => { aplicar(vista === "mundo" ? 50 : DIST_PERTO); }, [vista, alvoKey]);

  useEffect(() => {
    apiRef.current = {
      zoomBy: (fator: number) => {
        const ctrl = controlsRef.current;
        if (!ctrl) return;
        const atual = ctrl.object.position.distanceTo(ctrl.target);
        aplicar(THREE.MathUtils.clamp(atual / fator, 3, 90));
      },
    };
  }, [apiRef]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={3}
      maxDistance={90}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={0.2}
    />
  );
}

function Iluminacao({ hora }: { hora: number }) {
  const l = luzDoDia(hora);
  const ceuAtual = ceu(hora);
  const sol = useRef<THREE.DirectionalLight>(null);
  const alvoSol = useRef<THREE.Object3D>(null);
  useEffect(() => {
    if (sol.current && alvoSol.current) sol.current.target = alvoSol.current;
  }, []);
  return (
    <>
      <color attach="background" args={[ceuAtual.base]} />
      <hemisphereLight args={[ceuAtual.topo, "#c4a882", 0.08 + l * 0.18]} />
      {/* De dia (luzDoDia = 1) fica em 0.38, acima de 0.35. À noite volta para 0.08. */}
      <ambientLight intensity={0.08 + l * 0.30} />
      {/* Preenchimento frio do céu: de noite fica no piso, de dia sobe com a luz. */}
      <directionalLight position={[-16, 9, 14]} color="#9fc0ff" intensity={0.15 + l * 0.2} />
      {/* Sol baixo, cor #ffcf8a, entrando pela fachada. Intensidade segue luzDoDia (0 à noite). */}
      <directionalLight
        ref={sol}
        position={[20, 5.4, -16]}
        intensity={l * 1.3}
        color="#ffcf8a"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-camera-near={2}
        shadow-camera-far={80}
        shadow-camera-left={-(20 * UNIT) / 2}
        shadow-camera-right={(20 * UNIT) / 2}
        shadow-camera-top={(14 * UNIT) / 2}
        shadow-camera-bottom={-(14 * UNIT) / 2}
      />
      <object3D ref={alvoSol} position={[20, 1.1, 14]} />
    </>
  );
}

/** Tone mapping cinematográfico (ACES) + exposição um pouco mais quente — sem isso, luz e
 * sombra ficam "chapadas"; com isso, os realces estouram suavemente e as sombras respiram. */
function ConfigRenderer() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

/** Fachada do prédio: faixa de tijolo + vidraça alta com travessas, ao longo de uma borda do
 * andar — dá a luz quente entrando pela janela pedida, visível na visão geral do mundo. */
function Fachada({ largura, hora }: { largura: number; hora: number }) {
  const tijolo = useMemo(() => texturaTijolo(), []);
  const l = luzDoDia(hora);
  const colunas = Math.max(1, Math.floor(largura / 2.6));
  return (
    <group>
      <mesh position={[largura / 2, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[largura, 1, 0.12]} />
        <meshStandardMaterial map={tijolo} roughness={0.9} />
      </mesh>
      <mesh position={[largura / 2, 2.3, 0]}>
        <boxGeometry args={[largura, 2.6, 0.04]} />
        <meshPhysicalMaterial color="#fff3d6" transparent opacity={0.12 + l * 0.12} roughness={0.05} transmission={0.55} />
      </mesh>
      {Array.from({ length: colunas + 1 }, (_, i) => (i * largura) / colunas).map((x, i) => (
        <mesh key={i} position={[x, 2.3, 0.02]} castShadow>
          <boxGeometry args={[0.05, 2.6, 0.06]} />
          <meshStandardMaterial color="#2d2015" roughness={0.6} />
        </mesh>
      ))}
      {l > 0.1 && (
        <mesh position={[largura / 2, 1.9, 0.06]}>
          <planeGeometry args={[largura * 0.92, 1.6]} />
          <meshBasicMaterial color="#ffd9a0" transparent opacity={0.1 * l} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** Mede o FPS real do frame loop do R3F e avisa o HUD (fora do Canvas) uma vez por segundo. */
function FpsProbe({ onUpdate }: { onUpdate: (fps: number) => void }) {
  const quadros = useRef(0);
  const ultimo = useRef(0);
  useFrame((state) => {
    quadros.current++;
    const t = state.clock.elapsedTime;
    if (t - ultimo.current >= 1) {
      onUpdate(Math.round(quadros.current / (t - ultimo.current)));
      quadros.current = 0;
      ultimo.current = t;
    }
  });
  return null;
}

/** Placa do slot do Estúdio no 3º andar. O clique abre o set. */
function texturaPlacaEstudio(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 220;
  const g = c.getContext("2d")!;
  g.fillStyle = "#6b2d3c";
  g.fillRect(0, 0, 640, 220);
  g.fillStyle = "#fbbf24";
  g.fillRect(28, 36, 14, 148);
  g.fillStyle = "#f7f4ee";
  g.font = "bold 64px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("Estúdio", 340, 110);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/** No andar da Caza o slot da sala de reuniões fica vazio, com a placa do Estúdio. */
function SlotDoEstudio({ detalhado, onEntrar }: { detalhado: boolean; onEntrar: () => void }) {
  const { slot, lado } = SALA_ESTUDIO;
  const ox = slot.x * UNIT, oz = slot.y * UNIT;
  const w = lado * UNIT, d = lado * UNIT;
  const placa = useMemo(() => texturaPlacaEstudio(), []);
  useEffect(() => () => placa.dispose(), [placa]);
  return (
    <group position={[ox, 0, oz]}>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[w / 2, 0.004, d / 2]}
        receiveShadow
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onEntrar(); }}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={detalhado ? "#efe8dc" : "#e4ddd2"} roughness={0.92} />
      </mesh>
      <group position={[0, 0, 0.02]}>
        <ParedeDetalhada comprimento={w} corAccent="#6b2d3c" />
      </group>
      <group position={[0.02, 0, 0]} rotation-y={-Math.PI / 2}>
        <ParedeDetalhada comprimento={d} corAccent="#6b2d3c" />
      </group>
      <group position={[w / 2, 0, d / 2]} rotation-y={Math.atan2(DIRECAO_CAM.x, DIRECAO_CAM.z)}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.08, 0.56, 0.08]} />
          <meshStandardMaterial color="#3a1520" />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <planeGeometry args={[2.8, 0.96]} />
          <meshBasicMaterial map={placa} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function Cena({
  predios, estados, atividade, selecionado, buAtual, andar, vista, focoCasa, reuniao, onEntrar, onSelecionar, onFocarCasa, hora, alvo, apiRef, onFps,
}: {
  predios: PredioW[];
  estados: Record<Agente, Estado>;
  atividade: Record<Agente, Atividade>;
  selecionado: Agente;
  buAtual: string;
  andar: AndarId;
  vista: "mundo" | "sala" | "casa";
  focoCasa: CasaId;
  reuniao?: EstadoReuniao[];
  onEntrar: (bu: string) => void;
  onSelecionar: (a: Agente) => void;
  onFocarCasa: (sala: CasaId) => void;
  hora: number;
  alvo: [number, number, number];
  apiRef: React.MutableRefObject<CameraApi | null>;
  onFps: (fps: number) => void;
}) {
  const chaoW = 20 * UNIT, chaoD = 14 * UNIT;
  const pisoGeralMap = useMemo(() => {
    const t = texturaMadeira().clone();
    t.needsUpdate = true;
    t.repeat.set(chaoW / 2.4, chaoD / 2.4);
    return t;
  }, [chaoW, chaoD]);
  return (
    <>
      <ConfigRenderer />
      <Iluminacao hora={hora} />
      <mesh rotation-x={-Math.PI / 2} position={[chaoW / 2 - UNIT, 0, chaoD / 2 - UNIT]} receiveShadow>
        <planeGeometry args={[chaoW, chaoD]} />
        <meshStandardMaterial map={pisoGeralMap} roughness={0.95} />
      </mesh>
      <group position={[-UNIT, 0, -UNIT]}>
        <Fachada largura={chaoW} hora={hora} />
      </group>
      {predios.map((p) => (
        <Sala
          key={p.empresa.bu}
          predio={p}
          estados={p.empresa.bu === buAtual ? estados : (p.empresa.estados ?? { cs: "idle", ref: "idle", criativo: "idle", midia: "idle" })}
          atividade={atividade}
          selecionado={selecionado}
          ativo={vista === "sala" && p.empresa.bu === buAtual}
          detalhado={vista === "sala" && p.empresa.bu === buAtual}
          onEntrar={() => onEntrar(p.empresa.bu)}
          onSelecionar={onSelecionar}
        />
      ))}
      <SalaDaCasa tipo="diretoria" detalhado={vista === "casa" && focoCasa === "diretoria"} onEntrar={() => onFocarCasa("diretoria")} />
      {andar === "caza" ? (
        <SlotDoEstudio detalhado={vista === "casa" && focoCasa === "estudio"} onEntrar={() => onFocarCasa("estudio")} />
      ) : (
        <SalaDaCasa
          tipo="reunioes"
          detalhado={vista === "casa" && focoCasa === "reunioes"}
          reuniao={reuniao}
          onEntrar={() => onFocarCasa("reunioes")}
        />
      )}
      <CameraRig vista={vista} alvo={alvo} apiRef={apiRef} />
      <FpsProbe onUpdate={onFps} />
    </>
  );
}

/** Minimapa: segunda cena leve, bem mais simples (só as plantas das salas, sem personagens
 * nem sombra), vista de cima por uma câmera ortográfica fixa — igual em espírito ao minimapa
 * do mundo 2D, mas como uma cena 3D própria em vez de um redesenho em canvas 2D. */
function Minimapa({
  predios, buAtual, andarAtual, vista, focoCasa,
}: { predios: PredioW[]; buAtual: string; andarAtual: AndarId; vista: "mundo" | "sala" | "casa" | "estudio"; focoCasa: CasaId }) {
  const chaoW = 20 * UNIT, chaoD = 14 * UNIT;
  const centro: [number, number, number] = [chaoW / 2 - UNIT, 0, chaoD / 2 - UNIT];
  const placa = ANDARES.find((a) => a.id === andarAtual);
  const salasFixas = andarAtual === "caza"
    ? [
        { id: "diretoria" as const, sl: SALAS_CASA.diretoria, lado: SALAS_CASA.lado, cor: "#7c5a1a" },
        { id: "estudio" as const, sl: SALA_ESTUDIO.slot, lado: SALA_ESTUDIO.lado, cor: "#6b2d3c" },
      ]
    : [
        { id: "diretoria" as const, sl: SALAS_CASA.diretoria, lado: SALAS_CASA.lado, cor: "#7c5a1a" },
        { id: "reunioes" as const, sl: SALAS_CASA.reunioes, lado: SALAS_CASA.lado, cor: "#475569" },
      ];
  return (
    <div className="absolute bottom-3 right-3 w-[168px] h-[110px] rounded-lg overflow-hidden border border-white/20 bg-black/40 pointer-events-none">
      <Canvas orthographic camera={{ position: [centro[0], 30, centro[2]], zoom: 3.4, rotation: [-Math.PI / 2, 0, 0] }} dpr={1}>
        <ambientLight intensity={1.1} />
        <mesh rotation-x={-Math.PI / 2} position={centro}>
          <planeGeometry args={[chaoW, chaoD]} />
          <meshBasicMaterial color="#1b2440" />
        </mesh>
        {predios.map((p) => {
          const tema = TEMAS[p.empresa.tema % TEMAS.length];
          const ox = p.x * UNIT, oz = p.y * UNIT, w = p.w * UNIT, d = p.h * UNIT;
          return (
            <mesh key={p.empresa.bu} rotation-x={-Math.PI / 2} position={[ox + w / 2, 0.01, oz + d / 2]}>
              <planeGeometry args={[w, d]} />
              <meshBasicMaterial color={p.empresa.bu === buAtual ? "#fbbf24" : tema.tapete[0]} />
            </mesh>
          );
        })}
        {salasFixas.map((sala) => {
          const foco = vista === "casa" && focoCasa === sala.id;
          const lado = sala.lado * UNIT;
          return (
            <mesh key={sala.id} rotation-x={-Math.PI / 2} position={[(sala.sl.x + sala.lado / 2) * UNIT, 0.02, (sala.sl.y + sala.lado / 2) * UNIT]}>
              <planeGeometry args={[lado, lado]} />
              <meshBasicMaterial color={foco ? "#fbbf24" : sala.cor} />
            </mesh>
          );
        })}
      </Canvas>
      <span className="absolute top-1 left-1.5 text-[9px] text-white/60 font-medium">{placa ? `${placa.numero}º · ${placa.nome}` : ""}</span>
    </div>
  );
}

export default function OfficeGame3D(props: Props) {
  const {
    empresas, buAtual, onEscolherEmpresa, estados, selecionado, onSelecionar, atividade,
    nomeCS, tab, painelAberto, onSair, busca, reuniao, onPainel, pendencias, temRelatorio, children,
  } = props;

  const [andar, setAndar] = useState<AndarId>("jacqes");
  const [vista, setVista] = useState<"mundo" | "sala" | "casa" | "estudio">("mundo");
  const [focoCasa, setFocoCasa] = useState<CasaId>("diretoria");
  const [vel, setVel] = useState(1);
  const [hora, setHora] = useState(horaInicial);
  const camApiRef = useRef<CameraApi | null>(null);
  const [termo, setTermo] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setHora((h) => vel === 0 || horaTravada() ? h : (h + vel * 0.01) % 24), 1000);
    return () => clearInterval(id);
  }, [vel]);

  const empresasDoAndar = useMemo(() => empresas.filter((e) => andarDaEmpresa(e) === andar), [empresas, andar]);
  const predios = useMemo(() => layoutPredios(empresasDoAndar), [empresasDoAndar]);
  const empresaAtual = empresas.find((e) => e.bu === buAtual);

  const entrar = (bu: string) => {
    const e = empresas.find((x) => x.bu === bu);
    if (e && andarDaEmpresa(e) !== andar) setAndar(andarDaEmpresa(e));
    onEscolherEmpresa(bu);
    setVista("sala");
  };
  const sair = () => setVista("mundo");
  const focarCasa = (sala: CasaId) => {
    if (sala === "estudio") {
      setAndar("caza");
      setFocoCasa("estudio");
      setVista("estudio");
      onPainel(false);
      return;
    }
    setFocoCasa(sala);
    setVista("casa");
    if (sala === "reunioes") onPainel(true, "reuniao");
  };

  const naReuniao = painelAberto && tab === "reuniao";
  useEffect(() => {
    if (!naReuniao) return;
    setFocoCasa("reunioes");
    setVista("casa");
  }, [naReuniao]);

  const predioAtual = predios.find((p) => p.empresa.bu === buAtual);
  const slotCasa = focoCasa === "estudio" ? SALA_ESTUDIO.slot : SALAS_CASA[focoCasa];
  const ladoCasa = focoCasa === "estudio" ? SALA_ESTUDIO.lado : SALAS_CASA.lado;
  const yAlvo = vista === "mundo" ? 0.4 : Y_ALVO_PERTO;
  const alvoPredio: [number, number, number] | null = predioAtual
    ? [(predioAtual.x + predioAtual.w / 2) * UNIT, yAlvo, (predioAtual.y + predioAtual.h / 2) * UNIT]
    : null;
  const alvo: [number, number, number] = vista === "casa"
    ? [(slotCasa.x + ladoCasa / 2) * UNIT, yAlvo, (slotCasa.y + ladoCasa / 2) * UNIT]
    : (alvoPredio ?? [10 * UNIT, 0, 7 * UNIT]);

  const resultados = useMemo(() => {
    if (!busca || !termo.trim()) return [];
    const q = normBusca(termo.trim());
    return busca.filter((i) => normBusca(`${i.rotulo} ${i.sub}`).includes(q)).slice(0, 8);
  }, [busca, termo]);

  const irParaItem = (i: ItemBusca) => {
    setTermo(""); setBuscaAberta(false);
    if (i.tipo === "sala" && i.sala === "reunioes") {
      setAndar("jacqes");
      setFocoCasa("reunioes");
      setVista("casa");
      onPainel(true, "reuniao");
      return;
    }
    if (i.tipo === "sala" && i.sala === "estudio") {
      setAndar("caza");
      setVista("estudio");
      onPainel(false);
      return;
    }
    if (i.tipo === "sala" && i.sala === "diretoria") {
      setFocoCasa("diretoria");
      setVista("casa");
      return;
    }
    if (i.tipo === "empresa" && i.bu) entrar(i.bu);
    else if (i.tipo === "agente" && i.bu && i.role) { entrar(i.bu); onSelecionar(i.role); }
    else if (i.tipo === "andar" && i.andar) {
      setAndar(i.andar);
      if (i.andar !== "caza" && focoCasa === "estudio") setFocoCasa("diretoria");
      setVista("mundo");
    }
  };

  const alertas = empresas.reduce((a, e) => a + e.alta, 0);
  const per = periodo(hora);
  const hh = String(Math.floor(hora)).padStart(2, "0");
  const mm = String(Math.floor((hora % 1) * 60)).padStart(2, "0");
  const alternarPainel = (t: PainelTab) => onPainel(!(painelAberto && tab === t), t);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a101f]">
      {vista === "estudio" ? (
        <Suspense fallback={null}>
          <EstudioViewport />
        </Suspense>
      ) : <Canvas shadows={{ type: THREE.PCFSoftShadowMap }} camera={{ position: [6, 10, 14], fov: 42 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <Cena
            predios={predios}
            estados={estados}
            atividade={atividade}
            selecionado={selecionado}
            buAtual={buAtual}
            andar={andar}
            vista={vista}
            focoCasa={focoCasa}
            reuniao={andar === "jacqes" ? reuniao : undefined}
            onEntrar={entrar}
            onSelecionar={onSelecionar}
            onFocarCasa={focarCasa}
            hora={hora}
            alvo={alvo}
            apiRef={camApiRef}
            onFps={setFps}
          />
        </Suspense>
      </Canvas>}

      {vista !== "estudio" && (
        <Minimapa predios={predios} buAtual={buAtual} andarAtual={andar} vista={vista} focoCasa={focoCasa} />
      )}

      <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
        <span className="rounded-md bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5">
          MODO 3D · BETA
        </span>
        {fps !== null && (
          <span className={`rounded-md text-[10px] font-bold px-2 py-0.5 ${fps >= 30 ? "bg-emerald-500/90 text-emerald-950" : "bg-red-500/90 text-white"}`} title="Quadros por segundo medidos nesta sessão">
            {fps} FPS
          </span>
        )}
      </div>

      {/* Barra superior */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 py-2 pointer-events-none">
        {onSair && (
          <button onClick={onSair} className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/60 text-white text-xs px-2.5 py-1.5 hover:bg-black/80 mt-6">
            <ArrowLeft size={13} /> Painel
          </button>
        )}
        <div role="group" aria-label="Andares" className="pointer-events-auto flex items-center gap-0.5 rounded-lg bg-black/60 p-0.5 text-xs text-white mt-6">
          {[...ANDARES].reverse().map((a) => (
            <button key={a.id} onClick={() => {
              setAndar(a.id);
              if (vista === "estudio" || (a.id === "caza" && focoCasa === "reunioes")) setVista("mundo");
              if (a.id !== "caza" && focoCasa === "estudio") { setFocoCasa("diretoria"); setVista("mundo"); }
            }} aria-pressed={andar === a.id}
              className={`rounded-md px-2 py-1 ${andar === a.id ? "bg-white text-gray-900 font-semibold" : "hover:bg-white/10"}`}>
              {a.numero}º · {a.nome}
            </button>
          ))}
          {andar === "caza" && (
            <button onClick={() => setVista("estudio")} aria-pressed={vista === "estudio"}
              className={`rounded-md px-2 py-1 ${vista === "estudio" ? "bg-amber-300 text-amber-950 font-semibold" : "hover:bg-white/10"}`}>
              Estúdio
            </button>
          )}
        </div>
        <nav className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/60 text-white text-xs px-2.5 py-1.5 mt-6">
          <button className={`hover:underline ${vista === "mundo" ? "font-semibold" : ""}`} onClick={() => vista !== "mundo" && sair()}>Escritório AWQ</button>
          {vista === "estudio" && (
            <>
              <ChevronRight size={12} className="text-white/50" />
              <span className="font-semibold">Estúdio</span>
            </>
          )}
          {vista === "casa" && (
            <>
              <ChevronRight size={12} className="text-white/50" />
              <span className="font-semibold">{focoCasa === "diretoria" ? "Sala do Miguel" : focoCasa === "estudio" ? "Estúdio" : "Sala de reuniões"}</span>
            </>
          )}
          {vista === "sala" && empresaAtual && (
            <>
              <ChevronRight size={12} className="text-white/50" />
              <span className="font-semibold">{empresaAtual.nome}</span>
              <ChevronRight size={12} className="text-white/50" />
              <span className="text-white/80">{selecionado === "cs" ? nomeCS : ROTULO_CURTO[selecionado]}</span>
            </>
          )}
        </nav>
        {busca && busca.length > 0 && (
          <div className="pointer-events-auto relative mt-6">
            <div className="flex items-center gap-1.5 rounded-lg bg-black/60 text-white text-xs px-2.5 py-1.5">
              <Search size={13} className="text-white/60" />
              <input
                value={termo}
                onChange={(e) => { setTermo(e.target.value); setBuscaAberta(true); }}
                onFocus={() => setBuscaAberta(true)}
                onBlur={() => setTimeout(() => setBuscaAberta(false), 150)}
                onKeyDown={(e) => { if (e.key === "Enter" && resultados[0]) { e.preventDefault(); irParaItem(resultados[0]); } }}
                placeholder="Buscar empresa, agente ou sala"
                className="bg-transparent outline-none placeholder:text-white/40 w-56 sm:w-72"
              />
            </div>
            {buscaAberta && resultados.length > 0 && (
              <ul className="absolute left-0 top-full mt-1 w-72 rounded-lg bg-gray-900/95 text-white text-xs shadow-xl border border-white/10 overflow-hidden z-10">
                {resultados.map((i) => (
                  <li key={i.id}>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => irParaItem(i)} className="w-full text-left px-3 py-2 hover:bg-white/10 flex flex-col">
                      <span className="font-medium">{i.rotulo}</span>
                      <span className="text-[10px] text-white/50">{i.sub}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 pointer-events-auto mt-6">
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

      <div className="absolute left-3 top-16 flex flex-col gap-1.5">
        <button onClick={() => (vista === "sala" || vista === "estudio" ? sair() : null)} aria-label={vista === "estudio" ? "Sair do estúdio" : "Visão do andar"} className={`w-10 h-10 rounded-xl flex items-center justify-center border ${vista === "mundo" ? "bg-brand-600 text-white border-brand-500" : "bg-black/60 text-white border-white/10 hover:bg-black/80"}`}>
          <Globe size={18} />
        </button>
        {RAIL.filter((r) => r.tab !== "relatorio" || temRelatorio).map(({ tab: t, rotulo, Icone }) => (
          <button key={t} title={rotulo} aria-label={rotulo} onClick={() => alternarPainel(t)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${painelAberto && tab === t ? "bg-brand-600 text-white border-brand-500" : "bg-black/60 text-white border-white/10 hover:bg-black/80"}`}>
            <Icone size={18} />
          </button>
        ))}
      </div>

      {/* Barra inferior */}
      <div className="absolute bottom-3 left-16 flex justify-center pointer-events-none transition-all" style={{ right: painelAberto ? 672 : 192 }}>
        <div className="pointer-events-auto max-w-full rounded-2xl bg-black/70 backdrop-blur text-white px-3 py-2 flex flex-wrap items-center justify-center gap-3">
          {vista === "sala" ? (
            <div className="flex gap-1.5">
              {PAPEIS.map((a) => (
                <button key={a} onClick={() => onSelecionar(a)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${selecionado === a ? "bg-white text-gray-900 border-white" : "border-white/15 hover:bg-white/10"}`}>
                  <span className={`w-2 h-2 rounded-full ${estados[a] === "working" ? "bg-sky-400 animate-pulse" : estados[a] === "done" ? "bg-emerald-400" : estados[a] === "error" ? "bg-red-500" : "bg-gray-400"}`} />
                  {a === "cs" ? nomeCS : ROTULO_CURTO[a]}
                </button>
              ))}
              <span className="text-[11px] text-white/70 self-center ml-1">{ESTADO_TXT[estados[selecionado]]}</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {empresasDoAndar.length === 0 && <span className="text-xs text-white/60 px-1">Nenhuma squad neste andar ainda</span>}
              {empresasDoAndar.map((e) => (
                <button key={e.bu} onClick={() => entrar(e.bu)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-white/15 hover:bg-white/10 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${e.trabalhando > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
                  {e.nome}
                  {e.alta > 0 && <span className="text-red-300">!{e.alta}</span>}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 border-l border-white/15 pl-3">
            <button title="Pausar" onClick={() => setVel(0)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${vel === 0 ? "bg-white text-gray-900" : "hover:bg-white/10"}`}><Pause size={14} /></button>
            <button title="1x" onClick={() => setVel(1)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${vel === 1 ? "bg-white text-gray-900" : "hover:bg-white/10"}`}><Play size={14} /></button>
            <button title="4x" onClick={() => setVel(4)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${vel === 4 ? "bg-white text-gray-900" : "hover:bg-white/10"}`}><FastForward size={14} /></button>
          </div>
          <div className="flex items-center gap-1 border-l border-white/15 pl-3">
            <button title="Menos zoom" onClick={() => camApiRef.current?.zoomBy(1 / 1.25)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"><ZoomOut size={14} /></button>
            <button title="Mais zoom" onClick={() => camApiRef.current?.zoomBy(1.25)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"><ZoomIn size={14} /></button>
            <button title="Recentralizar" onClick={() => setVista("mundo")} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"><Crosshair size={14} /></button>
          </div>
        </div>
      </div>

      <p className="absolute left-16 bottom-3 text-[10px] text-white/45 max-w-[150px] pointer-events-none hidden 2xl:block">
        Arraste para girar, scroll para zoom. Clique numa sala pra entrar, num agente pra selecionar.
      </p>

      {/* Gaveta de painéis — idêntica à versão 2D */}
      <aside className={`absolute top-0 bottom-0 right-0 w-[480px] max-w-[94%] bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 ${painelAberto ? "translate-x-0" : "translate-x-full"}`} aria-hidden={!painelAberto}>
        <button onClick={() => onPainel(false)} aria-label="Fechar painel" className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
          <X size={14} />
        </button>
        <div className="h-full">{painelAberto ? children : null}</div>
      </aside>
    </div>
  );
}
