"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import type { EstadoAtor, PoseAtorId } from "@/lib/studio-actor";
import { NOME_ATOR_PADRAO, POSES_ATOR } from "@/lib/studio-actor";

const MODELO = "/models/studio/quaternius/UAL1_Standard.glb";

useGLTF.preload(MODELO);

/** Boneco CC0 do Quaternius (Universal Animation Library, tier gratuito). */
export function AtorNoSet({ pose, nome }: { pose: PoseAtorId; nome: string }) {
  const { scene, animations } = useGLTF(MODELO);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, clone);
  const rotulo = nome.trim() || NOME_ATOR_PADRAO;

  useLayoutEffect(() => {
    const action = actions[pose];
    if (!action) return;
    for (const nomeAcao of Object.keys(actions)) {
      if (nomeAcao !== pose) actions[nomeAcao]?.stop();
    }
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.reset().play();
    mixer.update(0);
    return () => {
      action.stop();
    };
  }, [actions, mixer, pose]);

  useEffect(() => {
    clone.traverse((obj) => {
      const malha = obj as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (malha.isMesh) {
        malha.castShadow = true;
        malha.receiveShadow = true;
      }
    });
  }, [clone]);

  return (
    <group position={[0, 0, -0.4]}>
      <primitive object={clone} />
      <Html position={[0.55, 1.95, 0]} center distanceFactor={8} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className="px-2 py-0.5 rounded-md bg-black/75 text-white text-xs whitespace-nowrap">{rotulo}</div>
      </Html>
    </group>
  );
}

export function PainelDoAtor({
  estado,
  onChange,
}: {
  estado: EstadoAtor;
  onChange: (parcial: Partial<EstadoAtor>) => void;
}) {
  return (
    <div className="absolute top-24 left-3 pointer-events-auto w-52 rounded-2xl bg-black/75 text-white text-[11px] p-3 space-y-2">
      <p className="font-semibold text-xs">Elenco</p>
      <label className="block space-y-1">
        Nome
        <input
          aria-label="Nome do ator"
          value={estado.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
          className="w-full bg-white/10 rounded-md px-2 py-1 text-white"
        />
      </label>
      <label className="block space-y-1">
        Pose
        <select
          aria-label="Pose do ator"
          value={estado.pose}
          onChange={(e) => onChange({ pose: e.target.value as PoseAtorId })}
          className="w-full bg-white/10 rounded-md px-1.5 py-1"
        >
          {POSES_ATOR.map((p) => (
            <option key={p.id} value={p.id}>{p.rotulo}</option>
          ))}
        </select>
      </label>
      <p className="text-white/60">Quaternius CC0 · Universal Animation Library</p>
    </div>
  );
}
