"use client";

import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * Cenário do Estúdio da Caza Vision, no espírito do Cine Tracer:
 * ciclorama curvo (a parede desce até a curva e encontra um único piso),
 * grade de luz no teto. Geometria procedural — nenhum asset pago.
 */

const ALTURA = 8;
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
 * Perfil do cove: parede reta e quarto de círculo, parando no raio.
 * Sem a faixa de 16 m: ela se repetia em cada parede e z-fightava no meio.
 * [altura, recuo para dentro]. O último ponto fica 1 cm acima do piso.
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
    const y = RAIO * Math.cos(ang);
    const recuo = Math.min(RAIO, RAIO * Math.sin(ang));
    perfil.push([i === passosArco ? 0.01 : y, recuo]);
  }
  return perfil;
}

function geometriaCiclorama(): THREE.BufferGeometry {
  const base = trajetoDaParede();
  const perfil = perfilDoCove();
  const pos: number[] = [];
  const cor: number[] = [];
  const idx: number[] = [];
  const linho = [0xf7 / 255, 0xf4 / 255, 0xee / 255];
  const curva = [0xe4 / 255, 0xdd / 255, 0xd2 / 255];
  for (let j = 0; j < base.length; j++) {
    const p = base[j];
    for (const [y, recuo] of perfil) {
      pos.push(p.x + p.nx * recuo, y, p.z + p.nz * recuo);
      const noCove = y > 0.05 && y < RAIO + 0.35 && recuo < RAIO + 0.6;
      const k = noCove ? Math.sin(Math.min(1, y / RAIO) * Math.PI) * 0.9 : 0;
      cor.push(
        linho[0] + (curva[0] - linho[0]) * k,
        linho[1] + (curva[1] - linho[1]) * k,
        linho[2] + (curva[2] - linho[2]) * k,
      );
    }
  }
  const n = perfil.length;
  for (let j = 0; j < base.length - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function Ciclorama() {
  const geo = useMemo(() => geometriaCiclorama(), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#ffffff" vertexColors roughness={0.9} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
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
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 4.9]} receiveShadow>
        <planeGeometry args={[22.2, 18.4]} />
        <meshStandardMaterial color={COR_CICLO} roughness={0.95} metalness={0} />
      </mesh>
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
            <color attach="background" args={[COR_CICLO]} />
            <fog attach="fog" args={[COR_CICLO, 24, 42]} />
            <hemisphereLight args={["#f7f4ee", "#e4ddd2", 0.8]} />
            <ambientLight intensity={0.22} />
            <directionalLight position={[0, 3.4, 7]} intensity={2.4} color="#fff8f2" />
            <spotLight
              position={[0.4, 4.6, 2.4]}
              angle={0.5}
              penumbra={0.55}
              intensity={40}
              color="#fff6e8"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-radius={8}
              shadow-bias={-0.00015}
              shadow-normalBias={0.04}
            />
            <StudioSet />
            <OrbitControls
              makeDefault
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
    </div>
  );
}
