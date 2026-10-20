"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import {
  PROPS_SET,
  encaixar,
  propPorId,
  type PropId,
  type PropNoSet,
} from "@/lib/studio-build";

for (const prop of PROPS_SET) useGLTF.preload(prop.arquivo);

function PropInstancia({
  prop,
  selecionado,
  montando,
  onSelect,
}: {
  prop: PropNoSet;
  selecionado: boolean;
  montando: boolean;
  onSelect: (id: string) => void;
}) {
  const def = propPorId(prop.tipo);
  const { scene } = useGLTF(def?.arquivo ?? PROPS_SET[0].arquivo);
  const clone = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    clone.traverse((obj) => {
      const malha = obj as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (malha.isMesh) {
        malha.castShadow = true;
        malha.receiveShadow = true;
      }
    });
  }, [clone]);

  if (!def) return null;
  return (
    <group
      position={[prop.x, 0, prop.z]}
      onClick={(e) => {
        if (!montando) return;
        e.stopPropagation();
        onSelect(prop.id);
      }}
    >
      <group scale={def.escala}>
        <primitive object={clone} position={[-def.centro[0], 0, -def.centro[1]]} />
      </group>
      {selecionado && (
        <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.42, 0.5, 28]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}
    </group>
  );
}

export function PropsNoSet({
  props,
  selecionado,
  montando,
  onSelect,
}: {
  props: PropNoSet[];
  selecionado: string | null;
  montando: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <group>
      {props.map((prop) => (
        <PropInstancia
          key={prop.id}
          prop={prop}
          selecionado={selecionado === prop.id}
          montando={montando}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

/** Plano invisível do piso. O clique cai no passo de 0,5 m. */
export function PisoDeEncaixe({ ativo, onColocar }: { ativo: boolean; onColocar: (x: number, z: number) => void }) {
  if (!ativo) return null;
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0.02, 1]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const ponto = encaixar(e.point.x, e.point.z);
        onColocar(ponto.x, ponto.z);
      }}
    >
      <planeGeometry args={[16, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function PainelDeMontagem({
  montando,
  tipo,
  selecionado,
  onMontando,
  onTipo,
  onColocar,
  onRemover,
}: {
  montando: boolean;
  tipo: PropId;
  selecionado: boolean;
  onMontando: (v: boolean) => void;
  onTipo: (id: PropId) => void;
  onColocar: () => void;
  onRemover: () => void;
}) {
  return (
    <div className="absolute bottom-40 right-3 pointer-events-auto w-52 rounded-2xl bg-black/75 text-white text-[11px] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-xs">Set</p>
        <button
          type="button"
          aria-pressed={montando}
          onClick={() => onMontando(!montando)}
          className={`px-2 py-1 rounded-md font-semibold ${montando ? "bg-amber-300 text-amber-950" : "bg-white/15"}`}
        >
          Montar set
        </button>
      </div>
      {montando && (
        <>
          <div role="group" aria-label="Props do set" className="grid grid-cols-2 gap-1">
            {PROPS_SET.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={tipo === p.id}
                onClick={() => onTipo(p.id)}
                className={`px-2 py-1 rounded-md ${tipo === p.id ? "bg-white text-gray-900 font-semibold" : "bg-white/10"}`}
              >
                {p.nome}
              </button>
            ))}
          </div>
          <button type="button" onClick={onColocar} className="w-full px-2 py-1.5 rounded-md bg-white text-gray-900 font-semibold">
            Colocar
          </button>
          <button type="button" onClick={onRemover} disabled={!selecionado} className="w-full px-2 py-1 rounded-md bg-white/10 disabled:opacity-40">
            Tirar
          </button>
          <p className="text-white/60">Kenney CC0 · encaixe de 0,5 m. Clique no piso também coloca.</p>
        </>
      )}
    </div>
  );
}
