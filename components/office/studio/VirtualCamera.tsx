"use client";

import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  SENSORES,
  fovNoQuadro,
  type AspectoQuadro,
  type SensorId,
} from "@/lib/studio-optics";

export const LENTES_MM = [24, 35, 50, 85] as const;

const ALVO: [number, number, number] = [0, 1.15, -0.4];
const POSICAO: [number, number, number] = [0, 1.35, 3.5];

/** Corpo da câmera no estúdio, escondido quando se olha por ela. */
export function CorpoDaCamera({ visivel }: { visivel: boolean }) {
  if (!visivel) return null;
  return (
    <group position={POSICAO}>
      <mesh castShadow>
        <boxGeometry args={[0.32, 0.2, 0.36]} />
        <meshStandardMaterial color="#1c1917" roughness={0.4} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.02, -0.28]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.22, 20]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.55} roughness={0.25} />
      </mesh>
    </group>
  );
}

/** Enquadra o manequim com o FOV vertical da lente e do quadro. */
export function OlharPelaCamera({ ativo, fov }: { ativo: boolean; fov: number }) {
  const { camera, size, controls } = useThree();
  const salvo = useRef<{ fov: number; position: THREE.Vector3; quaternion: THREE.Quaternion } | null>(null);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!ativo) {
      if (!salvo.current) return;
      cam.fov = salvo.current.fov;
      cam.position.copy(salvo.current.position);
      cam.quaternion.copy(salvo.current.quaternion);
      cam.aspect = size.width / Math.max(1, size.height);
      cam.updateProjectionMatrix();
      salvo.current = null;
      const orbit = controls as { update?: () => void } | null;
      orbit?.update?.();
      return;
    }
    if (!salvo.current) {
      salvo.current = { fov: cam.fov, position: cam.position.clone(), quaternion: cam.quaternion.clone() };
    }
    cam.fov = fov;
    cam.aspect = size.width / Math.max(1, size.height);
    cam.position.set(...POSICAO);
    cam.up.set(0, 1, 0);
    cam.lookAt(...ALVO);
    cam.updateProjectionMatrix();
  }, [ativo, fov, camera, size.width, size.height, controls]);

  return null;
}

function retangulo(aspecto: AspectoQuadro, largura: number, altura: number) {
  const razao = aspecto === "16:9" ? 16 / 9 : 2.39;
  const tela = largura / Math.max(1, altura);
  if (tela > razao) {
    const w = altura * razao;
    return { x: (largura - w) / 2, y: 0, w, h: altura };
  }
  const h = largura / razao;
  return { x: 0, y: (altura - h) / 2, w: largura, h };
}

export function PainelDaCamera({
  ativo,
  onAtivo,
  lenteMm,
  onLente,
  sensor,
  onSensor,
  aspecto,
  onAspecto,
}: {
  ativo: boolean;
  onAtivo: (v: boolean) => void;
  lenteMm: number;
  onLente: (mm: number) => void;
  sensor: SensorId;
  onSensor: (s: SensorId) => void;
  aspecto: AspectoQuadro;
  onAspecto: (a: AspectoQuadro) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const q = retangulo(aspecto, tam.w, tam.h);
  const fov = fovNoQuadro(lenteMm, sensor, aspecto);
  const barra = "absolute bg-black pointer-events-none";

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none">
      {ativo && (
        <>
          <div className={barra} style={{ left: 0, top: 0, width: q.x, height: tam.h }} />
          <div className={barra} style={{ left: q.x + q.w, top: 0, width: Math.max(0, tam.w - q.x - q.w), height: tam.h }} />
          <div className={barra} style={{ left: q.x, top: 0, width: q.w, height: q.y }} />
          <div className={barra} style={{ left: q.x, top: q.y + q.h, width: q.w, height: Math.max(0, tam.h - q.y - q.h) }} />
          <svg
            className="absolute pointer-events-none"
            style={{ left: q.x, top: q.y, width: q.w, height: q.h }}
            viewBox="0 0 300 300"
            preserveAspectRatio="none"
            aria-hidden
          >
            {[100, 200].map((n) => (
              <g key={n} stroke="white" strokeOpacity="0.8" strokeWidth="1.25">
                <line x1={n} y1="0" x2={n} y2="300" />
                <line x1="0" y1={n} x2="300" y2={n} />
              </g>
            ))}
          </svg>
          <p
            className="absolute text-[11px] text-white/90 pointer-events-none"
            style={{ left: q.x + 12, top: q.y + 10 }}
          >
            {lenteMm} mm · {SENSORES[sensor].nome} · {aspecto} · {fov.vertical.toFixed(1)}° vertical
          </p>
        </>
      )}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-black/75 text-white text-xs px-3 py-2 max-w-[94%]">
        <label className="flex items-center gap-1">
          Lente
          <select
            aria-label="Distância focal"
            value={lenteMm}
            onChange={(e) => onLente(Number(e.target.value))}
            className="bg-white/10 rounded-md px-1.5 py-1"
          >
            {LENTES_MM.map((mm) => (
              <option key={mm} value={mm}>{mm} mm</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Sensor
          <select
            aria-label="Sensor"
            value={sensor}
            onChange={(e) => onSensor(e.target.value as SensorId)}
            className="bg-white/10 rounded-md px-1.5 py-1"
          >
            {(Object.keys(SENSORES) as SensorId[]).map((id) => (
              <option key={id} value={id}>{SENSORES[id].nome}</option>
            ))}
          </select>
        </label>
        <div role="group" aria-label="Proporção" className="flex rounded-md bg-white/10 p-0.5">
          {(["16:9", "2.39"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={aspecto === a}
              onClick={() => onAspecto(a)}
              className={`px-2 py-1 rounded ${aspecto === a ? "bg-white text-gray-900 font-semibold" : ""}`}
            >
              {a}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={ativo}
          onClick={() => onAtivo(!ativo)}
          className={`px-2.5 py-1.5 rounded-lg font-semibold ${ativo ? "bg-amber-300 text-amber-950" : "bg-white text-gray-900"}`}
        >
          {ativo ? "Sair da câmera" : "Olhar pela câmera"}
        </button>
      </div>
    </div>
  );
}
