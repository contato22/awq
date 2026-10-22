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

/**
 * O GLTFLoader tira o ponto do nome (`UpperLeg.L` → `UpperLegL`). O eixo local
 * X da coxa no rig masculino aponta para trás, então rotateX abre as pernas
 * de lado. O sentar gira em torno do eixo lateral do personagem (para a
 * frente da cadeira) e os braços usam o Z local, com sinal espelhado, nas
 * magnitudes de digitação (~1.0 no braço, ~0.6 no antebraço).
 */
const PERNAS = new Set(["Hips", "UpperLegL", "UpperLegR", "LowerLegL", "LowerLegR", "FootL", "FootR"]);
const COXA = -1.15;
const CANELA = -1.9;
const BRACO = 1.0;
const ANTEBRACO = 0.6;
const INCLINACAO = -0.18;
/** Desce o quadril até o assento. -0.12 deixava o corpo em pé atrás da cadeira. */
const QUEDA = -0.22;

const _eixo = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _joelho = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _alvo = new THREE.Vector3();
const _escala = new THREE.Vector3();

function nomeOsso(nome: string) {
  return nome.replace(/\./g, "");
}

function girarLateral(osso: THREE.Bone, grupo: THREE.Object3D, angulo: number) {
  grupo.updateMatrixWorld(true);
  _eixo.set(1, 0, 0).transformDirection(grupo.matrixWorld);
  if (_eixo.lengthSq() < 1e-6) return;
  osso.rotateOnWorldAxis(_eixo.normalize(), angulo);
}

function plantarPe(perna: THREE.Bone, pe: THREE.Bone) {
  perna.getWorldPosition(_joelho);
  _dir.set(0, -1, 0).applyQuaternion(perna.getWorldQuaternion(_q));
  perna.getWorldScale(_escala);
  _alvo.copy(_joelho).addScaledVector(_dir, 0.42 * _escala.y);
  _alvo.y = 0.04;
  pe.parent?.worldToLocal(_alvo);
  pe.position.copy(_alvo);
}

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
  const pes = new Map<string, THREE.Vector3>();
  clone.traverse((o) => {
    const bone = o as THREE.Bone;
    if (!bone.isBone) return;
    descanso.set(bone.name, bone.quaternion.clone());
    if (bone.name === "FootL" || bone.name === "FootR") pes.set(bone.name, bone.position.clone());
  });
  aplicarTinta(clone, a);
  return { clone, descanso, pes };
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

export function CorpoQuaternius({ semente, poseRef }: { semente: string; poseRef: MutableRefObject<PoseCorpo> }) {
  const gltf = useGLTF(urlDoRig(semente), false, true);
  const grupo = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const acoes = useRef<Record<string, THREE.AnimationAction>>({});
  const atual = useRef<THREE.AnimationAction | null>(null);
  const descanso = useRef<Map<string, THREE.Quaternion>>(new Map());
  const pes = useRef<Map<string, THREE.Vector3>>(new Map());
  const jaSentado = useRef(false);
  const relogio = useRef(Math.random() * 10);

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
    pes.current = montado.pes;
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
    const dt = Math.min(dtBruto, 0.05);
    relogio.current += dt;
    const pose = poseRef.current;
    if (pose === "sentado") {
      const base = acoes.current.Idle ?? acoes.current.Interact ?? acoes.current.Idle_Neutral;
      if (base) {
        if (atual.current !== base) {
          mix.stopAllAction();
          base.reset();
          base.play();
          base.paused = true;
          atual.current = base;
        }
        base.paused = true;
        base.time = 0;
        mix.update(0);
      }
      const resp = Math.sin(relogio.current * 1.4);
      const digita = Math.sin(relogio.current * 7) * 0.12;
      root.position.y = QUEDA + resp * 0.008;
      root.updateMatrixWorld(true);
      const ossos = new Map<string, THREE.Bone>();
      root.traverse((o) => {
        const bone = o as THREE.Bone;
        if (!bone.isBone) return;
        const nome = nomeOsso(bone.name);
        ossos.set(nome, bone);
        if (!PERNAS.has(nome)) return;
        const q = descanso.current.get(bone.name);
        if (q) bone.quaternion.copy(q);
      });
      root.updateMatrixWorld(true);
      for (const nome of ["UpperLegL", "UpperLegR"]) {
        const bone = ossos.get(nome);
        if (bone) girarLateral(bone, root, COXA);
      }
      for (const nome of ["LowerLegL", "LowerLegR"]) {
        const bone = ossos.get(nome);
        if (bone) bone.rotateX(CANELA);
      }
      const bracoE = ossos.get("UpperArmL");
      const bracoD = ossos.get("UpperArmR");
      const anteE = ossos.get("LowerArmL");
      const anteD = ossos.get("LowerArmR");
      if (bracoE) bracoE.rotateZ(-(BRACO + digita));
      if (bracoD) bracoD.rotateZ(BRACO + digita);
      if (anteE) anteE.rotateZ(-(ANTEBRACO + digita * 0.5));
      if (anteD) anteD.rotateZ(ANTEBRACO + digita * 0.5);
      for (const nome of ["Abdomen", "Chest"]) {
        const bone = ossos.get(nome);
        if (bone) girarLateral(bone, root, INCLINACAO + resp * 0.04);
      }
      root.updateMatrixWorld(true);
      const peE = ossos.get("FootL");
      const peD = ossos.get("FootR");
      const canelaE = ossos.get("LowerLegL");
      const canelaD = ossos.get("LowerLegR");
      if (peE && canelaE) plantarPe(canelaE, peE);
      if (peD && canelaD) plantarPe(canelaD, peD);
      jaSentado.current = true;
      return;
    }
    if (jaSentado.current) {
      root.position.y = 0;
      root.traverse((o) => {
        const bone = o as THREE.Bone;
        if (!bone.isBone) return;
        const p = pes.current.get(bone.name);
        if (p) bone.position.copy(p);
      });
      atual.current = null;
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
