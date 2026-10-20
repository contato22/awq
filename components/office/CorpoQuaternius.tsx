"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { aparenciaDe, escolhe, hashSemente, type AparenciaPersonagem } from "@/lib/office-aparencia";

/**
 * Personagem modular do Quaternius (CC0): Ultimate Modular Men / Women.
 * Um GLB por gênero guarda o esqueleto, as 24 animações e as peças
 * (cabeça, torso, pernas, pés). Cada agente clona o esqueleto e fica só
 * com a combinação da própria semente; os AnimationClips são os mesmos
 * objetos para todo mundo.
 *
 * O pacote não tem clipe de sentar. Mixamo exigiria conta Adobe, então a
 * pose sentada é aplicada nos ossos do esqueleto compartilhado.
 *
 * Só o GLB do gênero da semente é baixado (nada de pré-carregar os dois).
 */

const URL_HOMEM = "/models/office/quaternius/men.glb";
const URL_MULHER = "/models/office/quaternius/women.glb";
/** O rig mede ~1,81. 0,62 deixa a pessoa na escala do mobiliário da sala. */
const ESCALA = 0.62;

export type PoseCorpo = "idle" | "walk" | "sentado";

const JAQUETA = /^(Suit|Casual_Hoodie|Worker|Formal)_Body$/;
const CABELO_MAT = /hair|moustache|mustache/i;
const PELE_MAT = /skin/i;
const INTACTO = /eye|brow|earring|gold|teeth|mouth/i;

const SENTAR: Record<string, number> = {
  "UpperLeg.L": -1.25,
  "UpperLeg.R": -1.25,
  "LowerLeg.L": 1.4,
  "LowerLeg.R": 1.4,
  "Foot.L": 0.35,
  "Foot.R": 0.35,
  Abdomen: 0.16,
};

export function urlDoRig(semente: string): string {
  return hashSemente(semente) % 2 === 0 ? URL_MULHER : URL_HOMEM;
}

function pecas(scene: THREE.Object3D, sufixo: string): string[] {
  const nomes: string[] = [];
  scene.traverse((o) => {
    if (o.parent?.name === "CharacterArmature" && o.name.endsWith(sufixo)) nomes.push(o.name);
  });
  return nomes;
}

function escolher(semente: string, cena: THREE.Object3D) {
  const h = hashSemente(semente);
  const a = aparenciaDe(semente);
  const corpos = pecas(cena, "_Body");
  const jaquetas = corpos.filter((n) => JAQUETA.test(n));
  const camisas = corpos.filter((n) => !JAQUETA.test(n));
  const torso = escolhe(a.jaqueta && jaquetas.length ? jaquetas : camisas.length ? camisas : corpos, h, 13);
  const perna = escolhe(pecas(cena, "_Legs"), h, 19);
  return {
    aparencia: a,
    manter: new Set([escolhe(pecas(cena, "_Head"), h, 7), torso, perna, perna.replace(/_Legs$/, "_Feet")]),
  };
}

function tingir(material: THREE.Material, slot: string, a: AparenciaPersonagem): THREE.Material {
  const m = material.clone() as THREE.MeshStandardMaterial;
  if (!m.color || INTACTO.test(m.name)) return m;
  if (CABELO_MAT.test(m.name)) {
    m.color.lerp(new THREE.Color(a.cabelo), 0.85);
    return m;
  }
  if (PELE_MAT.test(m.name)) {
    m.color.lerp(new THREE.Color(a.pele), 0.8);
    return m;
  }
  if (slot.endsWith("_Feet")) {
    m.color.lerp(new THREE.Color("#3a2e26"), 0.4);
    return m;
  }
  const alvo = slot.endsWith("_Legs") ? a.calca : (a.jaqueta ?? a.corpo);
  m.color.lerp(new THREE.Color(alvo), 0.78);
  return m;
}

function aplicarTinta(root: THREE.Object3D, a: AparenciaPersonagem) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.frustumCulled = true;
    const slot = mesh.parent?.name ?? "";
    const lista = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const tintas = lista.map((mat) => tingir(mat, slot, a));
    mesh.material = tintas.length === 1 ? tintas[0] : tintas;
  });
}

function montarInstancia(cena: THREE.Object3D, manter: Set<string>, a: AparenciaPersonagem) {
  const clone = SkeletonUtils.clone(cena) as THREE.Object3D;
  const remover: THREE.Object3D[] = [];
  clone.traverse((o) => {
    if (o.parent?.name === "CharacterArmature" && /_(Head|Body|Legs|Feet)$/.test(o.name) && !manter.has(o.name)) {
      remover.push(o);
    }
  });
  for (const o of remover) o.removeFromParent();
  const descanso = new Map<string, THREE.Quaternion>();
  clone.traverse((o) => {
    const bone = o as THREE.Bone;
    if (bone.isBone) descanso.set(bone.name, bone.quaternion.clone());
  });
  aplicarTinta(clone, a);
  return { clone, descanso };
}

/** Cabeça da semente, já tingida, para o retrato fora da cena. */
export function montarCabeca(cena: THREE.Object3D, semente: string): THREE.Object3D {
  const h = hashSemente(semente);
  const a = aparenciaDe(semente);
  const nome = escolhe(pecas(cena, "_Head"), h, 7);
  const clone = SkeletonUtils.clone(cena) as THREE.Object3D;
  const remover: THREE.Object3D[] = [];
  clone.traverse((o) => {
    if (o.parent?.name === "CharacterArmature" && o.name !== nome) remover.push(o);
  });
  for (const o of remover) o.removeFromParent();
  aplicarTinta(clone, a);
  return clone;
}

function aplicarSentado(root: THREE.Object3D, descanso: Map<string, THREE.Quaternion>) {
  root.traverse((o) => {
    const bone = o as THREE.Bone;
    if (!bone.isBone) return;
    const giro = SENTAR[bone.name];
    const q = descanso.get(bone.name);
    if (giro === undefined || !q) return;
    bone.quaternion.copy(q);
    bone.rotateX(giro);
  });
  root.position.y = -0.12;
}

export function CorpoQuaternius({ semente, poseRef }: { semente: string; poseRef: MutableRefObject<PoseCorpo> }) {
  const gltf = useGLTF(urlDoRig(semente), false, true);
  const grupo = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const acoes = useRef<Record<string, THREE.AnimationAction>>({});
  const atual = useRef<THREE.AnimationAction | null>(null);
  const descanso = useRef<Map<string, THREE.Quaternion>>(new Map());
  const jaSentado = useRef(false);

  const montado = useMemo(() => {
    const escolha = escolher(semente, gltf.scene);
    return { ...montarInstancia(gltf.scene, escolha.manter, escolha.aparencia), clips: gltf.animations };
  }, [semente, gltf]);

  useEffect(() => {
    const root = grupo.current;
    if (!root) return;
    root.clear();
    root.add(montado.clone);
    descanso.current = montado.descanso;
    const mix = new THREE.AnimationMixer(montado.clone);
    mixer.current = mix;
    const mapa: Record<string, THREE.AnimationAction> = {};
    for (const clip of montado.clips) mapa[clip.name] = mix.clipAction(clip);
    acoes.current = mapa;
    atual.current = null;
    jaSentado.current = false;
    return () => {
      mix.stopAllAction();
      mixer.current = null;
    };
  }, [montado]);

  useFrame((_, dtBruto) => {
    const root = grupo.current;
    const mix = mixer.current;
    if (!root || !mix) return;
    const pose = poseRef.current;
    if (pose === "sentado") {
      if (!jaSentado.current) {
        mix.stopAllAction();
        atual.current = null;
        aplicarSentado(root, descanso.current);
        jaSentado.current = true;
      }
      return;
    }
    if (jaSentado.current) {
      root.position.y = 0;
      jaSentado.current = false;
    }
    const nome = pose === "walk" ? "Walk" : "Idle";
    const proxima = acoes.current[nome];
    if (proxima && atual.current !== proxima) {
      proxima.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.18).play();
      atual.current?.fadeOut(0.18);
      atual.current = proxima;
    }
    mix.update(Math.min(dtBruto, 0.05));
  });

  return <group ref={grupo} scale={ESCALA} />;
}
