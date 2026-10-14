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
 * Estado desta entrega: cena 3D integrada, câmera (zoom/pan/rotação/recentralizar),
 * seleção de empresa/agente, troca de andar, ciclo dia/noite e indicadores de estado real
 * (idle/working/done/error) nos personagens. Personagens e mobiliário ainda são formas
 * primitivas (cápsula/esfera/caixa) — substituí-las por modelos humanos estilizados e por
 * navegação com desvio de obstáculos fica para a próxima iteração.
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

// ── Personagem (primitiva, estilizada por papel — a substituir por modelo humano depois) ──

function Personagem({ papel, estado, selecionado, onClick }: { papel: Agente; estado: Estado; selecionado: boolean; onClick: () => void }) {
  const L = LOOK[papel];
  const grupo = useRef<THREE.Group>(null);
  const t0 = useRef(Math.random() * 10);
  useFrame((_, dt) => {
    t0.current += dt;
    if (!grupo.current) return;
    if (estado === "working") grupo.current.position.y = 0.02 * Math.sin(t0.current * 3);
    else grupo.current.position.y = 0;
  });
  const corIndicador = estado === "done" ? "#22c55e" : estado === "error" ? "#ef4444" : estado === "working" ? "#38bdf8" : null;
  return (
    <group
      ref={grupo}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "default"; }}
    >
      {selecionado && (
        <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.42, 0.52, 24]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}
      {/* corpo */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
        <meshStandardMaterial color={L.corpo} roughness={0.75} />
      </mesh>
      {/* cabeça */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={L.pele} roughness={0.6} />
      </mesh>
      {/* cabelo (calota simples) */}
      <mesh position={[0, 1.16, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={L.cabelo} roughness={0.8} />
      </mesh>
      {corIndicador && (
        <mesh position={[0, 1.45, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={corIndicador} emissive={corIndicador} emissiveIntensity={estado === "working" ? 1.4 : 0.8} />
        </mesh>
      )}
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
            <RoundedBox args={[0.6, 0.42, 0.6]} radius={0.03} position={[0, 0.21, 0]} castShadow receiveShadow>
              <meshStandardMaterial color="#8a5a2e" roughness={0.6} />
            </RoundedBox>
            <mesh position={[0.18, 0.55, -0.15]} castShadow>
              <boxGeometry args={[0.28, 0.2, 0.03]} />
              <meshStandardMaterial color="#1f2937" emissive={estados[a] === "working" ? "#1d4ed8" : "#0f172a"} emissiveIntensity={estados[a] === "working" ? 0.8 : 0.1} />
            </mesh>
            <Personagem papel={a} estado={estados[a]} selecionado={ativo && selecionado === a} onClick={() => { if (!ativo) onEntrar(); onSelecionar(a); }} />
          </group>
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
      <hemisphereLight args={[ceuAtual.topo, "#2a2a3a", 0.35 + l * 0.35]} />
      <ambientLight intensity={0.25 + l * 0.25} />
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
    </>
  );
}

function Cena({
  predios, estados, atividade, selecionado, buAtual, vista, onEntrar, onSelecionar, hora, alvo, apiRef,
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
    </>
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
          />
        </Suspense>
      </Canvas>

      <div className="absolute top-2 left-2 rounded-md bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 pointer-events-none">
        MODO 3D · BETA
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
