"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { LUZES_INICIAIS, kelvinParaRgb, type AjusteLuz, type LuzId } from "@/lib/studio-lights";

const ORDEM: LuzId[] = ["key", "fill", "back"];
const POS: Record<LuzId, [number, number, number]> = {
  key: [1.7, 2.65, 2.15],
  fill: [-2.15, 1.85, 2.35],
  back: [-0.35, 2.9, -2.15],
};
const ALVO: [number, number, number] = [0, 1.2, -0.4];

function Alca({ cor, ativo, onClick }: { cor: string; ativo: boolean; onClick: () => void }) {
  return (
    <mesh
      position={[0, -0.18, 0]}
      userData={{ ocultarNaCaptura: true }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <sphereGeometry args={[0.09, 16, 12]} />
      <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={ativo ? 1.4 : 0.45} />
    </mesh>
  );
}

export function LuzesDoEstudio({
  ajustes,
  podeOrbitar,
  gizmo,
  selecionada,
  onSelect,
}: {
  ajustes: Record<LuzId, AjusteLuz>;
  podeOrbitar: boolean;
  gizmo: boolean;
  selecionada: LuzId;
  onSelect: (id: LuzId) => void;
}) {
  const sel = selecionada;
  const [pronto, setPronto] = useState(false);
  const keyG = useRef<THREE.Group>(null);
  const fillG = useRef<THREE.Group>(null);
  const backG = useRef<THREE.Group>(null);
  const grupos: Record<LuzId, RefObject<THREE.Group>> = { key: keyG, fill: fillG, back: backG };
  const keyL = useRef<THREE.SpotLight>(null);
  const backL = useRef<THREE.SpotLight>(null);
  const alvo = useRef<THREE.Object3D>(null);
  const controls = useThree((s) => s.controls) as { enabled?: boolean } | null;

  useLayoutEffect(() => {
    RectAreaLightUniformsLib.init();
    setPronto(true);
  }, []);

  useLayoutEffect(() => {
    if (keyL.current && alvo.current) keyL.current.target = alvo.current;
    if (backL.current && alvo.current) backL.current.target = alvo.current;
  });

  useFrame(() => {
    fillG.current?.lookAt(...ALVO);
  });

  const cor = (id: LuzId) => "#" + kelvinParaRgb(ajustes[id].kelvin).map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
  const objeto = pronto ? grupos[sel].current : null;

  return (
    <>
      <object3D ref={alvo} position={ALVO} />
      <group ref={keyG} position={POS.key}>
        <spotLight
          ref={keyL}
          angle={0.42}
          penumbra={0.55}
          intensity={ajustes.key.intensidade}
          color={cor("key")}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-radius={8}
          shadow-bias={-0.00015}
          shadow-normalBias={0.04}
        />
        <Alca cor={cor("key")} ativo={sel === "key"} onClick={() => onSelect("key")} />
      </group>
      <group ref={fillG} position={POS.fill}>
        <rectAreaLight
          width={1.8}
          height={1.1}
          intensity={ajustes.fill.intensidade}
          color={cor("fill")}
        />
        <mesh>
          <planeGeometry args={[1.8, 1.1]} />
          <meshStandardMaterial color={cor("fill")} emissive={cor("fill")} emissiveIntensity={0.6} side={THREE.DoubleSide} />
        </mesh>
        <Alca cor={cor("fill")} ativo={sel === "fill"} onClick={() => onSelect("fill")} />
      </group>
      <group ref={backG} position={POS.back}>
        <spotLight
          ref={backL}
          angle={0.5}
          penumbra={0.7}
          intensity={ajustes.back.intensidade}
          color={cor("back")}
        />
        <Alca cor={cor("back")} ativo={sel === "back"} onClick={() => onSelect("back")} />
      </group>
      {gizmo && objeto && (
        <TransformControls
          object={objeto}
          mode="translate"
          onMouseDown={() => { if (controls) controls.enabled = false; }}
          onMouseUp={() => { if (controls) controls.enabled = podeOrbitar; }}
        />
      )}
    </>
  );
}

export function PainelDasLuzes({
  ajustes,
  selecionada,
  onSelect,
  onChange,
}: {
  ajustes: Record<LuzId, AjusteLuz>;
  selecionada: LuzId;
  onSelect: (id: LuzId) => void;
  onChange: (id: LuzId, parcial: Partial<AjusteLuz>) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest("input, textarea, select, [contenteditable='true']")) return;
      const porTecla: Record<string, LuzId> = { "1": "key", "2": "fill", "3": "back" };
      if (porTecla[e.key]) {
        onSelect(porTecla[e.key]);
        return;
      }
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const i = ORDEM.indexOf(selecionada);
      const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      onSelect(ORDEM[(i + delta + ORDEM.length) % ORDEM.length]);
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSelect, selecionada]);

  return (
    <div className="absolute top-24 right-3 pointer-events-auto w-52 rounded-2xl bg-black/75 text-white text-[11px] p-3 space-y-2">
      <p className="font-semibold text-xs">Luzes · key / fill / back</p>
      {ORDEM.map((id, indice) => {
        const meta = LUZES_INICIAIS[id];
        const a = ajustes[id];
        const ativa = selecionada === id;
        return (
          <div key={id} className={`rounded-lg p-1.5 ${ativa ? "bg-white/15" : ""}`}>
            <button
              type="button"
              aria-pressed={ativa}
              onClick={() => onSelect(id)}
              className="w-full text-left"
            >
              <span className="flex justify-between">
                <span>{indice + 1} · {meta.nome} · {meta.tipo === "area" ? "soft" : "spot"}</span>
                <span>{a.kelvin} K</span>
              </span>
            </button>
            <label className="block">
              <span className="sr-only">Temperatura da {meta.nome}</span>
              <input
                aria-label={`Temperatura da ${meta.nome}`}
                type="range"
                min={2700}
                max={9000}
                step={100}
                value={a.kelvin}
                onChange={(e) => onChange(id, { kelvin: Number(e.target.value) })}
                className="w-full"
              />
            </label>
            <label className="block">
              <span className="flex justify-between text-white/70">
                <span>Intensidade</span>
                <span>{a.intensidade}</span>
              </span>
              <input
                aria-label={`Intensidade da ${meta.nome}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={a.intensidade}
                onChange={(e) => onChange(id, { intensidade: Number(e.target.value) })}
                className="w-full"
              />
            </label>
          </div>
        );
      })}
      <p className="text-white/60">1, 2 e 3 escolhem a luz. Arraste o gizmo para movê-la.</p>
    </div>
  );
}
