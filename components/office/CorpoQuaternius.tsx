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
 */

const URL_HOMEM = "/models/office/quaternius/men.glb";
const URL_MULHER = "/models/office/quaternius/women.glb";
/** O rig mede ~1,81. 0,62 deixa a pessoa na escala do mobiliário da sala. */
const ESCALA = 0.62;

useGLTF.preload(URL_HOMEM, false, true);
useGLTF.preload(URL_MULHER, false, true);

export type PoseCorpo = "idle" | "walk" | "sentado";

const JAQUETA = /^(Suit|Casual_Hoodie|Worker|Formal)_Body$/;
const PELE = /skin|eye|eyebrow|hair|moustache|beard|mouth|teeth/i;

const SENTAR: Record<string, number> = {
  "UpperLeg.L": -1.25,
  "UpperLeg.R": -1.25,
  "LowerLeg.L": 1.4,
  "LowerLeg.R": 1.4,
  "Foot.L": 0.35,
  "Foot.R": 0.35,
  Abdomen: 0.16,
};

function pecas(scene: THREE.Object3D, sufixo: string): string[] {
  const nomes: string[] = [];
  scene.traverse((o) => {
    if (o.parent?.name === "CharacterArmature" && o.name.endsWith(sufixo)) nomes.push(o.name);
  });
  return nomes;
}

function escolher(semente: string, homens: THREE.Object3D, mulheres: THREE.Object3D) {
  const h = hashSemente(semente);
  const genero = h % 2 === 0 ? "women" : "men";
  const cena = genero === "women" ? mulheres : homens;
  const a = aparenciaDe(semente);
  const corpos = pecas(cena, "_Body");
  const jaquetas = corpos.filter((n) => JAQUETA.test(n));
  const camisas = corpos.filter((n) => !JAQUETA.test(n));
  const torso = escolhe(a.jaqueta && jaquetas.length ? jaquetas : camisas.length ? camisas : corpos, h, 13);
  const perna = escolhe(pecas(cena, "_Legs"), h, 19);
  return {
    genero,
    aparencia: a,
    manter: new Set([escolhe(pecas(cena, "_Head"), h, 7), torso, perna, perna.replace(/_Legs$/, "_Feet")]),
  };
}

function tingir(material: THREE.Material, slot: string, a: AparenciaPersonagem): THREE.Material {
  const m = material.clone() as THREE.MeshStandardMaterial;
  if (!m.color || PELE.test(m.name) || slot.endsWith("_Head")) return m;
  if (slot.endsWith("_Feet")) {
    m.color.lerp(new THREE.Color("#3a2e26"), 0.4);
    return m;
  }
  const alvo = slot.endsWith("_Legs") ? a.calca : (a.jaqueta ?? a.corpo);
  m.color.lerp(new THREE.Color(alvo), 0.78);
  return m;
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
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.frustumCulled = true;
    const slot = mesh.parent?.name ?? "";
    const lista = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const tintas = lista.map((mat) => tingir(mat, slot, a));
    mesh.material = tintas.length === 1 ? tintas[0] : tintas;
  });
  return { clone, descanso };
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
  root.position.y = -0.28;
}

export function CorpoQuaternius({ semente, poseRef }: { semente: string; poseRef: MutableRefObject<PoseCorpo> }) {
  const homens = useGLTF(URL_HOMEM, false, true);
  const mulheres = useGLTF(URL_MULHER, false, true);
  const grupo = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const acoes = useRef<Record<string, THREE.AnimationAction>>({});
  const atual = useRef<THREE.AnimationAction | null>(null);
  const descanso = useRef<Map<string, THREE.Quaternion>>(new Map());
  const jaSentado = useRef(false);

  const montado = useMemo(() => {
    const escolha = escolher(semente, homens.scene, mulheres.scene);
    const fonte = escolha.genero === "women" ? mulheres : homens;
    return { ...montarInstancia(fonte.scene, escolha.manter, escolha.aparencia), clips: fonte.animations };
  }, [semente, homens, mulheres]);

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
