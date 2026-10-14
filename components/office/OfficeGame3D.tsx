"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  ArrowLeft, BarChart3, ChevronRight, ClipboardList, Crosshair, Crown, FastForward, FileText, Globe, ListChecks,
  MessageSquare, Moon, Pause, Play, ScrollText, Search, ShieldCheck, Sun, Sunrise, Sunset, Target, Users, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { ceu, LOOK, luzDoDia, TEMAS, type Agente, type Atividade, type Estado } from "@/lib/office-iso";
import { andarDaEmpresa, ANDARES, layoutPredios, type AndarId, type Empresa, type PredioW } from "@/lib/office-world";
import type { ItemBusca, MetricaAgente, PainelTab } from "./OfficeGame";

/**
 * Camada de renderização 3D do Office, alternativa ao mundo isométrico em canvas 2D
 * (`OfficeGame`). Usa EXATAMENTE a mesma interface de props — é um substituto plugável,
 * acionado por um alerta ("Modo 3D (beta)") em `OfficeSimulator`. Consome o mesmo estado
 * operacional (empresas, estados, métricas, atividade); nenhuma lógica de negócio mora aqui.
 *
 * Estado desta entrega: cena 3D integrada, câmera (zoom/pan/rotação/recentralizar), seleção
 * de empresa/agente, troca de andar, ciclo dia/noite, minimapa (segunda câmera ortográfica
 * sobre a mesma cena) e indicadores de estado real (idle/working/done/error). Personagens são
 * figuras humanas estilizadas de várias partes (pernas, tronco, braços, cabeça, cabelo por
 * papel) com animação de respiração/digitação (trabalho) e caminhada curta até um ponto de
 * descanso dentro da própria sala quando ociosos (idle) — desvio de obstáculos é por
 * pontos-destino pré-validados (não há replanejamento de rota em tempo real ainda). Mobiliário
 * (mesa, cadeira, monitor) tem volume e acabamento simples. Modelos humanos esculpidos/rigged
 * (GLTF) e desvio de obstáculos em tempo real ficam para iterações futuras.
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
const OBSTACULOS: Set<string> = (() => {
  const s = new Set<string>();
  for (const papel of PAPEIS) {
    const [dx, dy] = MESAS[papel];
    const cx = dx * UNIT * 0.5, cz = dy * UNIT * 0.5;
    const [i0, j0] = celulaDe(cx - 0.4, cz - 0.4);
    const [i1, j1] = celulaDe(cx + 0.4, cz + 0.85); // cobre a mesa e a cadeira atrás dela
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) s.add(`${i},${j}`);
  }
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
  papel, estado, selecionado, onClick, basePos,
}: { papel: Agente; estado: Estado; selecionado: boolean; onClick: () => void; basePos: [number, number] }) {
  const L = LOOK[papel];
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

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.05);
    t0.current += dt;
    if (!grupo.current || !corpoRef.current) return;

    if (estado !== "idle") {
      // trabalhando/entregue/com erro: sentado no lugar, de frente pro monitor
      fase.current = "no-lugar";
      caminho.current = [];
      posAtual.current.set(basePos[0], 0, basePos[1]);
      grupo.current.position.copy(posAtual.current);
      grupo.current.rotation.y = Math.PI;
      pararPernas();
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
      if (fase.current === "no-lugar") grupo.current.rotation.y = Math.PI;
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
        if (chegouEmCasa) grupo.current.rotation.y = Math.PI;
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
      {selecionado && (
        <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.32, 0.4, 24]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}
      {/* pernas */}
      <mesh ref={pernaE} position={[-0.1, 0.27, 0]} castShadow>
        <capsuleGeometry args={[0.065, 0.3, 4, 8]} />
        <meshStandardMaterial color={L.calca} roughness={0.8} />
      </mesh>
      <mesh ref={pernaD} position={[0.1, 0.27, 0]} castShadow>
        <capsuleGeometry args={[0.065, 0.3, 4, 8]} />
        <meshStandardMaterial color={L.calca} roughness={0.8} />
      </mesh>
      {/* tronco + cabeça (o grupo que "respira"/inclina) */}
      <group ref={corpoRef} position={[0, 0.55, 0]}>
        <RoundedBox args={[0.3, 0.38, 0.19]} radius={0.05} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial color={L.corpo} roughness={0.75} />
        </RoundedBox>
        {/* braços */}
        <mesh ref={bracoE} position={[-0.19, 0.05, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.28, 4, 8]} />
          <meshStandardMaterial color={L.corpo} roughness={0.75} />
        </mesh>
        <mesh ref={bracoD} position={[0.19, 0.05, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.28, 4, 8]} />
          <meshStandardMaterial color={L.corpo} roughness={0.75} />
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
  );
}

// ── Sala de uma squad (piso + 2 paredes de fundo + 4 mesas) ────────────────────────────

function Sala({
  predio, estados, atividade, selecionado, ativo, onEntrar, onSelecionar,
}: {
  predio: PredioW;
  estados: Record<Agente, Estado>;
  atividade: Record<Agente, Atividade>;
  selecionado: Agente;
  ativo: boolean;
  onEntrar: () => void;
  onSelecionar: (a: Agente) => void;
}) {
  const tema = TEMAS[predio.empresa.tema % TEMAS.length];
  const ox = predio.x * UNIT, oz = predio.y * UNIT;
  const w = predio.w * UNIT, d = predio.h * UNIT;
  return (
    <group position={[ox, 0, oz]}>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[w / 2, 0, d / 2]}
        receiveShadow
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onEntrar(); }}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={tema.tapete[0]} roughness={0.9} />
      </mesh>
      {/* duas paredes de fundo, translúcidas (vidro), como no mundo 2D */}
      <mesh position={[0.02, 1.1, d / 2]} castShadow>
        <boxGeometry args={[0.04, 2.2, d]} />
        <meshStandardMaterial color={tema.paredeD} />
      </mesh>
      <mesh position={[w / 2, 1.1, 0.02]} castShadow>
        <boxGeometry args={[w, 2.2, 0.04]} />
        <meshStandardMaterial color={tema.paredeE} />
      </mesh>
      {PAPEIS.map((a) => {
        const [dx, dy] = MESAS[a];
        return (
          <group key={a} position={[dx * UNIT * 0.5, 0, dy * UNIT * 0.5]}>
            {/* mesa */}
            <RoundedBox args={[0.6, 0.42, 0.6]} radius={0.03} position={[0, 0.21, 0]} castShadow receiveShadow>
              <meshStandardMaterial color="#8a5a2e" roughness={0.6} />
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
            {/* cadeira: assento + encosto + pernas finas */}
            <group position={[0, 0, 0.4]}>
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
          />
        );
      })}
    </group>
  );
}

// ── Câmera: aproxima a sala selecionada, recua para a visão do andar ──────────────────

export interface CameraApi { zoomBy: (fator: number) => void }

// Ângulo de visão fixo (um "olhar isométrico" clássico, como o mundo 2D): só a distância e
// o ponto mirado mudam. Reposicionar direto (sem mexer com o estado esférico interno do
// OrbitControls a cada frame) evita a câmera degenerar para um ângulo raso/errático.
const DIRECAO_CAM = new THREE.Vector3(0.62, 0.72, 0.58).normalize();

function CameraRig({
  vista, alvo, apiRef,
}: { vista: "mundo" | "sala"; alvo: [number, number, number]; apiRef: React.MutableRefObject<CameraApi | null> }) {
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
  useEffect(() => { aplicar(vista === "sala" ? 9.5 : 50); }, [vista, alvoKey]);

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
  return (
    <>
      <color attach="background" args={[ceuAtual.base]} />
      <hemisphereLight args={[ceuAtual.topo, "#4b5567", 0.55 + l * 0.35]} />
      <ambientLight intensity={0.4 + l * 0.25} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={0.4 + l * 0.9}
        color={l > 0.3 ? "#fff6e0" : "#b9c6ff"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-10}
        shadow-camera-right={55}
        shadow-camera-top={45}
        shadow-camera-bottom={-10}
      />
      {/* luz de preenchimento fixa do lado oposto: nenhuma face do personagem fica 100% preta
          à noite, mesmo vista de um ângulo contrário à luz direcional principal */}
      <directionalLight position={[-10, 10, -6]} intensity={0.3} color="#9fc0ff" />
    </>
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

function Cena({
  predios, estados, atividade, selecionado, buAtual, vista, onEntrar, onSelecionar, hora, alvo, apiRef, onFps,
}: {
  predios: PredioW[];
  estados: Record<Agente, Estado>;
  atividade: Record<Agente, Atividade>;
  selecionado: Agente;
  buAtual: string;
  vista: "mundo" | "sala";
  onEntrar: (bu: string) => void;
  onSelecionar: (a: Agente) => void;
  hora: number;
  alvo: [number, number, number];
  apiRef: React.MutableRefObject<CameraApi | null>;
  onFps: (fps: number) => void;
}) {
  const chaoW = 20 * UNIT, chaoD = 14 * UNIT;
  return (
    <>
      <Iluminacao hora={hora} />
      <mesh rotation-x={-Math.PI / 2} position={[chaoW / 2 - UNIT, 0, chaoD / 2 - UNIT]} receiveShadow>
        <planeGeometry args={[chaoW, chaoD]} />
        <meshStandardMaterial color="#c9a876" roughness={0.95} />
      </mesh>
      {predios.map((p) => (
        <Sala
          key={p.empresa.bu}
          predio={p}
          estados={p.empresa.bu === buAtual ? estados : (p.empresa.estados ?? { cs: "idle", ref: "idle", criativo: "idle", midia: "idle" })}
          atividade={atividade}
          selecionado={selecionado}
          ativo={vista === "sala" && p.empresa.bu === buAtual}
          onEntrar={() => onEntrar(p.empresa.bu)}
          onSelecionar={onSelecionar}
        />
      ))}
      <CameraRig vista={vista} alvo={alvo} apiRef={apiRef} />
      <FpsProbe onUpdate={onFps} />
    </>
  );
}

/** Minimapa: segunda cena leve, bem mais simples (só as plantas das salas, sem personagens
 * nem sombra), vista de cima por uma câmera ortográfica fixa — igual em espírito ao minimapa
 * do mundo 2D, mas como uma cena 3D própria em vez de um redesenho em canvas 2D. */
function Minimapa({ predios, buAtual, andarAtual }: { predios: PredioW[]; buAtual: string; andarAtual: AndarId }) {
  const chaoW = 20 * UNIT, chaoD = 14 * UNIT;
  const centro: [number, number, number] = [chaoW / 2 - UNIT, 0, chaoD / 2 - UNIT];
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
      </Canvas>
      <span className="absolute top-1 left-1.5 text-[9px] text-white/60 font-medium">{andarAtual === "jacqes" ? "1º · JACQES" : "2º · AWAQE"}</span>
    </div>
  );
}

export default function OfficeGame3D(props: Props) {
  const {
    empresas, buAtual, onEscolherEmpresa, estados, selecionado, onSelecionar, atividade,
    nomeCS, tab, painelAberto, onSair, busca, onPainel, pendencias, temRelatorio, children,
  } = props;

  const [andar, setAndar] = useState<AndarId>("jacqes");
  const [vista, setVista] = useState<"mundo" | "sala">("mundo");
  const [vel, setVel] = useState(1);
  const [hora, setHora] = useState(horaBrasilia());
  const camApiRef = useRef<CameraApi | null>(null);
  const [termo, setTermo] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setHora((h) => vel === 0 ? h : (h + (vel * 0.01)) % 24), 1000);
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

  const predioAtual = predios.find((p) => p.empresa.bu === buAtual);
  const alvo: [number, number, number] = predioAtual
    ? [(predioAtual.x + predioAtual.w / 2) * UNIT, 0.6, (predioAtual.y + predioAtual.h / 2) * UNIT]
    : [10 * UNIT, 0, 7 * UNIT];

  const resultados = useMemo(() => {
    if (!busca || !termo.trim()) return [];
    const q = termo.toLowerCase();
    return busca.filter((i) => i.rotulo.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)).slice(0, 8);
  }, [busca, termo]);

  const irParaItem = (i: ItemBusca) => {
    setTermo(""); setBuscaAberta(false);
    if (i.tipo === "empresa" && i.bu) entrar(i.bu);
    else if (i.tipo === "agente" && i.bu && i.role) { entrar(i.bu); onSelecionar(i.role); }
    else if (i.tipo === "andar" && i.andar) { setAndar(i.andar); setVista("mundo"); }
  };

  const alertas = empresas.reduce((a, e) => a + e.alta, 0);
  const per = periodo(hora);
  const hh = String(Math.floor(hora)).padStart(2, "0");
  const mm = String(Math.floor((hora % 1) * 60)).padStart(2, "0");
  const alternarPainel = (t: PainelTab) => onPainel(!(painelAberto && tab === t), t);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a101f]">
      <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [6, 10, 14], fov: 42 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <Cena
            predios={predios}
            estados={estados}
            atividade={atividade}
            selecionado={selecionado}
            buAtual={buAtual}
            vista={vista}
            onEntrar={entrar}
            onSelecionar={onSelecionar}
            hora={hora}
            alvo={alvo}
            apiRef={camApiRef}
            onFps={setFps}
          />
        </Suspense>
      </Canvas>

      <Minimapa predios={predios} buAtual={buAtual} andarAtual={andar} />

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
            <button key={a.id} onClick={() => setAndar(a.id)} aria-pressed={andar === a.id}
              className={`rounded-md px-2 py-1 ${andar === a.id ? "bg-white text-gray-900 font-semibold" : "hover:bg-white/10"}`}>
              {a.numero}º · {a.nome}
            </button>
          ))}
        </div>
        <nav className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/60 text-white text-xs px-2.5 py-1.5 mt-6">
          <button className={`hover:underline ${vista === "mundo" ? "font-semibold" : ""}`} onClick={() => vista === "sala" && sair()}>Escritório AWQ</button>
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
        <button onClick={() => (vista === "sala" ? sair() : null)} className={`w-10 h-10 rounded-xl flex items-center justify-center border ${vista === "mundo" ? "bg-brand-600 text-white border-brand-500" : "bg-black/60 text-white border-white/10 hover:bg-black/80"}`}>
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
