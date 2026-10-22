"use client";

import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { fovNoQuadro, type AspectoQuadro, type SensorId } from "@/lib/studio-optics";
import { LUZES_INICIAIS, type AjusteLuz, type LuzId } from "@/lib/studio-lights";
import { CAMADA_CICLORAMA, CAMADA_GIZMO } from "./camadas";
import { CorpoDaCamera, OlharPelaCamera, PainelDaCamera } from "./VirtualCamera";
import { LuzesDoEstudio, PainelDasLuzes } from "./StudioLights";
import { FormularioDeCaptura, GanchoDeCaptura, type PedidoCaptura } from "./ShotCapture";
import type { ShotEstudio } from "@/lib/studio-store";

/**
 * Cenário do Estúdio da Caza Vision, no espírito do Cine Tracer:
 * ciclorama curvo (a parede desce até a curva e encontra um único piso),
 * grade de luz no teto. Geometria procedural — nenhum asset pago.
 */

const ALTURA = 12;
const RAIO = 2.6;
const COR_CICLO = "#f4f1ea";

/** Linha da parede no plano, com a normal apontando para dentro da sala. */
function trajetoDaParede(): { x: number; z: number; nx: number; nz: number }[] {
  const xParede = 11;
  const zParede = -4.2;
  const zFrente = 14;
  const canto = 2.8;
  const pts: { x: number; z: number; nx: number; nz: number }[] = [];
  const asa = 8;
  const curva = 12;
  const fundo = 18;
  for (let i = 0; i <= asa; i++) {
    const z = zFrente + (i / asa) * (zParede + canto - zFrente);
    pts.push({ x: -xParede, z, nx: 1, nz: 0 });
  }
  const cz = zParede + canto;
  const cxL = -xParede + canto;
  for (let i = 1; i <= curva; i++) {
    const ang = Math.PI + (i / curva) * (Math.PI / 2);
    pts.push({
      x: cxL + canto * Math.cos(ang),
      z: cz + canto * Math.sin(ang),
      nx: -Math.cos(ang),
      nz: -Math.sin(ang),
    });
  }
  const xFim = xParede - canto;
  for (let i = 1; i <= fundo; i++) {
    const x = cxL + (i / fundo) * (xFim - cxL);
    pts.push({ x, z: zParede, nx: 0, nz: 1 });
  }
  const cxR = xParede - canto;
  for (let i = 1; i <= curva; i++) {
    const ang = -Math.PI / 2 + (i / curva) * (Math.PI / 2);
    pts.push({
      x: cxR + canto * Math.cos(ang),
      z: cz + canto * Math.sin(ang),
      nx: -Math.cos(ang),
      nz: -Math.sin(ang),
    });
  }
  for (let i = 1; i <= asa; i++) {
    const z = zParede + canto + (i / asa) * (zFrente - zParede - canto);
    pts.push({ x: xParede, z, nx: -1, nz: 0 });
  }
  return pts;
}

/**
 * Perfil do cove: parede reta e quarto de círculo que termina no plano do chão.
 * [altura, recuo para dentro]. O último vértice é o mesmo da malha do piso.
 */
function perfilDoCove(): [number, number][] {
  const parede = ALTURA - RAIO;
  const passosParede = 8;
  const passosArco = 24;
  const perfil: [number, number][] = [];
  for (let i = 0; i <= passosParede; i++) {
    perfil.push([ALTURA - (i / passosParede) * parede, 0]);
  }
  for (let i = 1; i <= passosArco; i++) {
    const ang = (i / passosArco) * (Math.PI / 2);
    perfil.push([RAIO * Math.cos(ang), RAIO * Math.sin(ang)]);
  }
  // Lábio horizontal: a borda do piso só encosta em faces planas, sem degrau de normal.
  perfil.push([0, RAIO + 0.45]);
  return perfil;
}

function normalY(pos: number[], ia: number, ib: number, ic: number): number {
  const ax = pos[ia * 3], az = pos[ia * 3 + 2];
  const bx = pos[ib * 3], bz = pos[ib * 3 + 2];
  const cx = pos[ic * 3], cz = pos[ic * 3 + 2];
  return (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
}

/** O arco continua até y=0 e o miolo é a mesma malha, com o mesmo material. */
function geometriaCiclorama(): THREE.BufferGeometry {
  const base = trajetoDaParede();
  const perfil = perfilDoCove();
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j < base.length; j++) {
    const p = base[j];
    for (const [y, recuo] of perfil) {
      pos.push(p.x + p.nx * recuo, y, p.z + p.nz * recuo);
    }
  }
  const n = perfil.length;
  for (let j = 0; j < base.length - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      idx.push(a, a + 1, a + n, a + n, a + 1, a + n + 1);
    }
  }
  const borda = Array.from({ length: base.length }, (_, j) => j * n + (n - 1));
  const contorno = borda.map((vi) => new THREE.Vector2(pos[vi * 3], pos[vi * 3 + 2]));
  const faces = THREE.ShapeUtils.triangulateShape(contorno, []);
  if (faces.length > 0) {
    const [fa, fb, fc] = faces[0];
    const virar = normalY(pos, borda[fa], borda[fb], borda[fc]) < 0;
    for (const [a, b, c] of faces) {
      const ia = borda[a];
      const ib = borda[b];
      const ic = borda[c];
      if (virar) idx.push(ia, ic, ib);
      else idx.push(ia, ib, ic);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function Ciclorama() {
  const geo = useMemo(() => geometriaCiclorama(), []);
  const malha = useRef<THREE.Mesh>(null);
  useEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => {
    malha.current?.layers.enable(CAMADA_CICLORAMA);
  }, []);
  return (
    <mesh ref={malha} geometry={geo} receiveShadow>
      <meshStandardMaterial color={COR_CICLO} roughness={0.9} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Ilumina só o ciclorama. O pool de key/fill/back não chega na curva e ela ficava cinza. */
function LuzDoCiclorama() {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sol = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    hemi.current?.layers.set(CAMADA_CICLORAMA);
    sol.current?.layers.set(CAMADA_CICLORAMA);
  }, []);
  return (
    <>
      <hemisphereLight ref={hemi} args={["#fbf7f1", "#e4ddd2", 1.25]} />
      <directionalLight ref={sol} position={[1.5, 8, 9]} intensity={0.65} color="#fff6ec" />
    </>
  );
}

function CameraDoEstudio() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.layers.enable(CAMADA_CICLORAMA);
    camera.layers.enable(CAMADA_GIZMO);
  }, [camera]);
  return null;
}

/** Treliça no teto. Não projeta sombra: a sombra dura da grade comia o ciclorama. */
function GradeDeLuz() {
  const y = 5.1;
  const trilhos = 4;
  const vao = 6;
  return (
    <group>
      {Array.from({ length: trilhos }, (_, i) => {
        const z = -1.6 + i * 1.35;
        return (
          <mesh key={`trilho-${i}`} position={[0, y, z]}>
            <boxGeometry args={[vao * 2, 0.05, 0.05]} />
            <meshStandardMaterial color="#3a404a" metalness={0.7} roughness={0.35} />
          </mesh>
        );
      })}
      {Array.from({ length: vao }, (_, i) => {
        const x = -5 + i * 2;
        return (
          <group key={`vao-${i}`}>
            <mesh position={[x, y, 0.4]}>
              <boxGeometry args={[0.05, 0.05, 4.2]} />
              <meshStandardMaterial color="#3a404a" metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh position={[x, y - 0.16, -0.2]}>
              <boxGeometry args={[0.34, 0.08, 0.2]} />
              <meshStandardMaterial color="#1a1d22" emissive="#ffe2b0" emissiveIntensity={0.25} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Escala humana: cápsula r 0.22, comprimento 1.0, centro no raio + metade do corpo, cabeça a 1.62. */
function Manequim() {
  const raio = 0.22;
  const comprimento = 1.0;
  return (
    <group position={[0, 0, -0.4]}>
      <mesh position={[0, raio + comprimento / 2, 0]} castShadow>
        <capsuleGeometry args={[raio, comprimento, 4, 12]} />
        <meshStandardMaterial color="#c8c2b6" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color="#d4cec2" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Exposicao() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.3;
  }, [gl]);
  return null;
}

export function StudioSet() {
  return (
    <group>
      <Ciclorama />
      <GradeDeLuz />
      <Manequim />
    </group>
  );
}

class LimiteDoEstudio extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  render() {
    if (this.state.erro) {
      return (
        <div className="absolute inset-0 grid place-items-center bg-[#f4f1ea] text-sm text-[#3a1520]">
          Não foi possível abrir o estúdio.
        </div>
      );
    }
    return this.props.children;
  }
}

/** Vista cheia do estúdio. O Office só troca o canvas; o HUD do simulador continua por cima. */
export function EstudioViewport() {
  const [olhando, setOlhando] = useState(false);
  const [lenteMm, setLenteMm] = useState(50);
  const [sensor, setSensor] = useState<SensorId>("super35");
  const [aspecto, setAspecto] = useState<AspectoQuadro>("16:9");
  const [luzes, setLuzes] = useState(LUZES_INICIAIS);
  const [luzSel, setLuzSel] = useState<LuzId>("key");
  const fov = fovNoQuadro(lenteMm, sensor, aspecto).vertical;
  const [pedido, setPedido] = useState<PedidoCaptura | null>(null);
  const [ultimo, setUltimo] = useState<ShotEstudio | null>(null);
  const mudarLuz = (id: LuzId, parcial: Partial<AjusteLuz>) => {
    setLuzes((atual) => ({ ...atual, [id]: { ...atual[id], ...parcial } }));
  };
  const aoCapturar = useCallback((shot: ShotEstudio) => {
    setUltimo(shot);
    setPedido(null);
  }, []);

  return (
    <div className="absolute inset-0 bg-[#f4f1ea]">
      <LimiteDoEstudio>
        <Suspense fallback={<div className="absolute inset-0 bg-[#f4f1ea]" />}>
          <Canvas
            shadows={{ type: THREE.PCFSoftShadowMap }}
            camera={{ position: [0, 1.7, 9], fov: 36 }}
            dpr={[1, 1.5]}
          >
            <Exposicao />
            <CameraDoEstudio />
            <color attach="background" args={[COR_CICLO]} />
            <fog attach="fog" args={[COR_CICLO, 24, 42]} />
            <hemisphereLight args={["#f7f4ee", "#e4ddd2", 0.22]} />
            <ambientLight intensity={0.06} />
            <directionalLight position={[0, 3.4, 7]} intensity={0.35} color="#fff8f2" />
            <LuzDoCiclorama />
            <LuzesDoEstudio ajustes={luzes} podeOrbitar={!olhando} gizmo={!olhando} selecionada={luzSel} onSelect={setLuzSel} />
            <StudioSet />
            <CorpoDaCamera visivel={!olhando} />
            <OlharPelaCamera ativo={olhando} fov={fov} aspecto={aspecto} />
            <GanchoDeCaptura pedido={pedido} onFeito={aoCapturar} />
            <OrbitControls
              makeDefault
              enabled={!olhando}
              target={[0, 1.2, -3]}
              minDistance={4}
              maxDistance={14}
              minAzimuthAngle={-1.15}
              maxAzimuthAngle={1.15}
              minPolarAngle={0.85}
              maxPolarAngle={Math.PI / 2.08}
            />
          </Canvas>
        </Suspense>
      </LimiteDoEstudio>
      <PainelDaCamera
        ativo={olhando}
        onAtivo={setOlhando}
        lenteMm={lenteMm}
        onLente={setLenteMm}
        sensor={sensor}
        onSensor={setSensor}
        aspecto={aspecto}
        onAspecto={setAspecto}
      />
      <PainelDasLuzes ajustes={luzes} selecionada={luzSel} onSelect={setLuzSel} onChange={mudarLuz} />
      <FormularioDeCaptura
        lenteMm={lenteMm}
        sensor={sensor}
        aspecto={aspecto}
        fovVertical={fov}
        ultimo={ultimo}
        onCapturar={(nome, nota) => setPedido({
          n: Date.now(),
          nome,
          nota,
          lenteMm,
          sensor,
          aspecto,
          fovVertical: fov,
        })}
      />
    </div>
  );
}
