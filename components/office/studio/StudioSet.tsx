"use client";

import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * Cenário do Estúdio da Caza Vision, no espírito do Cine Tracer:
 * ciclorama curvo (piso que sobe na parede, sem horizonte), grade de luz no teto
 * e piso em grade. Geometria procedural — nenhum asset pago.
 */

const LARGURA = 22;
const PROFUNDIDADE = 14;
const ALTURA = 8;
const RAIO = 2.6;

function geometriaCiclorama(): THREE.BufferGeometry {
  const chao = PROFUNDIDADE - RAIO;
  const arco = (Math.PI * RAIO) / 2;
  const parede = ALTURA - RAIO;
  const total = chao + arco + parede;
  const passos = 64;
  const colunas = 1;
  const frente = PROFUNDIDADE / 2;
  const perfil: [number, number][] = [];

  for (let i = 0; i <= passos; i++) {
    const s = (i / passos) * total;
    if (s <= chao) {
      perfil.push([0, frente - s]);
    } else if (s <= chao + arco) {
      const ang = (s - chao) / RAIO;
      const zCentro = frente - chao;
      perfil.push([RAIO - RAIO * Math.cos(ang), zCentro - RAIO * Math.sin(ang)]);
    } else {
      perfil.push([RAIO + (s - chao - arco), frente - chao - RAIO]);
    }
  }

  const geo = new THREE.BufferGeometry();
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= colunas; j++) {
    const x = -LARGURA / 2 + (j / colunas) * LARGURA;
    perfil.forEach(([y, z], i) => {
      pos.push(x, y, z);
      uv.push(j / colunas, i / (perfil.length - 1));
    });
  }
  const n = perfil.length;
  for (let j = 0; j < colunas; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function Ciclorama() {
  const geo = useMemo(() => geometriaCiclorama(), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#f4f1ea" roughness={0.88} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Treliça no teto com refletores apagados — a luz de cena entra no PR das luzes. */
function GradeDeLuz() {
  const y = 5.1;
  const trilhos = 4;
  const vao = 6;
  return (
    <group>
      {Array.from({ length: trilhos }, (_, i) => {
        const z = -1.6 + i * 1.35;
        return (
          <mesh key={`trilho-${i}`} position={[0, y, z]} castShadow>
            <boxGeometry args={[vao * 2, 0.05, 0.05]} />
            <meshStandardMaterial color="#3a404a" metalness={0.7} roughness={0.35} />
          </mesh>
        );
      })}
      {Array.from({ length: vao }, (_, i) => {
        const x = -5 + i * 2;
        return (
          <group key={`vao-${i}`}>
            <mesh position={[x, y, 0.4]} castShadow>
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

function Manequim() {
  return (
    <group position={[0, 0, -0.4]}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.62, 4, 12]} />
        <meshStandardMaterial color="#c8c2b6" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.52, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial color="#d4cec2" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function StudioSet() {
  return (
    <group>
      <Ciclorama />
      <GradeDeLuz />
      <Manequim />
      <Grid
        args={[30, 30]}
        position={[0, 0.008, 0]}
        cellSize={0.5}
        cellThickness={0.7}
        cellColor="#8b93a3"
        sectionSize={2}
        sectionThickness={1.2}
        sectionColor="#c5ccd8"
        fadeDistance={28}
        fadeStrength={1.4}
        infiniteGrid
      />
    </group>
  );
}

/** Vista cheia do estúdio. O Office só troca o canvas; o HUD do simulador continua por cima. */
export function EstudioViewport() {
  return (
    <div className="absolute inset-0 bg-[#090b10]">
      <Canvas shadows camera={{ position: [3.4, 1.8, 5.6], fov: 36 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#10131a"]} />
        <hemisphereLight args={["#e7eeff", "#2c261c", 0.45]} />
        <ambientLight intensity={0.18} />
        <directionalLight position={[3, 6, 4]} intensity={0.55} color="#fff4e0" castShadow />
        <spotLight position={[1.6, 4.2, 2.2]} angle={0.6} penumbra={0.45} intensity={18} color="#fff1d6" castShadow />
        <StudioSet />
        <OrbitControls makeDefault target={[0, 1.15, -0.6]} maxPolarAngle={Math.PI / 2.08} />
      </Canvas>
    </div>
  );
}
