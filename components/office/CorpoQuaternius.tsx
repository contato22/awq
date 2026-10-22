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
 * O pacote Quaternius não traz clipe de sentar (só Idle, Walk, Interact…).
 * O eixo local também muda entre os rigs: no masculino o X da coxa aponta
 * para trás, no feminino aponta para o lado, e o Z do braço não é o mesmo
 * depois que o grupo gira para a câmera. `rotateX` / `rotateZ` / `rotateOnWorldAxis`
 * misturam esses eixos e abrem as pernas. A pose aponta o +Y de cada osso
 * (o eixo que segue o membro) para uma direção no espaço do personagem,
 * compondo o quaternion do pai — vale igual para os dois GLBs.
 * Os pés ficam no Root, separados da perna. O GLB nomeia `UpperLeg.L`, não
 * `UpperLegL`: sem esse ponto a pose não acha o membro e a perna fica reta
 * enquanto o quadril desce. Transladar o osso do pé estica a malha — o pé só
 * gira, e a canela aponta para ele. Quem desce até o assento é o osso Body.
 */
const POSE = ["Hips", "Abdomen", "Chest", "UpperLegL", "UpperLegR", "LowerLegL", "LowerLegR", "FootL", "FootR", "UpperArmL", "UpperArmR", "LowerArmL", "LowerArmR", "WristL", "WristR"];

/** `UpperLegL` no código → `UpperLeg.L` no esqueleto Quaternius. */
function nomeOsso(nome: string): string {
  return /^(?:UpperLeg|LowerLeg|Foot|UpperArm|LowerArm|Wrist)[LR]$/.test(nome)
    ? nome.replace(/([LR])$/, ".$1")
    : nome;
}
/** Quadril no mundo, em cima do assento (topo ~0.29). A malha da pelve fica um pouco abaixo do osso. */
const ALVO_QUADRIL = 0.38;

const _lateral = new THREE.Vector3();
const _frente = new THREE.Vector3();
const _cima = new THREE.Vector3();
const _baixo = new THREE.Vector3();
const _alvo = new THREE.Vector3();
const _atual = new THREE.Vector3();
const _v = new THREE.Vector3();
const _delta = new THREE.Quaternion();
const _pai = new THREE.Quaternion();
const _local = new THREE.Quaternion();
const _quadril = new THREE.Vector3();
const _pe = new THREE.Vector3();
const _joelho = new THREE.Vector3();
const _eixo = new THREE.Vector3();
const _polo = new THREE.Vector3();

/** Joelho para a frente, com o comprimento da coxa e da canela, sem mover o pé. */
function dobrarPerna(quadril: THREE.Vector3, pe: THREE.Vector3, frente: THREE.Vector3, coxa: number, canela: number, destino: THREE.Vector3) {
  _eixo.subVectors(pe, quadril);
  const dist = _eixo.length();
  if (dist < 1e-4 || coxa < 1e-4 || canela < 1e-4) {
    destino.copy(quadril).addScaledVector(frente, coxa);
    return;
  }
  const d = Math.min(Math.max(dist, Math.abs(coxa - canela) + 1e-3), coxa + canela - 1e-3);
  _eixo.multiplyScalar(1 / dist);
  const aoLongo = (coxa * coxa - canela * canela + d * d) / (2 * d);
  const altura = Math.sqrt(Math.max(coxa * coxa - aoLongo * aoLongo, 0));
  _polo.copy(frente).addScaledVector(_eixo, -frente.dot(_eixo));
  if (_polo.lengthSq() < 1e-8) _polo.copy(frente);
  _polo.normalize();
  destino.copy(quadril).addScaledVector(_eixo, aoLongo).addScaledVector(_polo, altura);
}

/** Rotação no mundo que respeita o quaternion dos pais (o grupo está virado para a câmera). */
function girarNoMundo(osso: THREE.Bone, eixo: THREE.Vector3, angulo: number) {
  if (!osso.parent || Math.abs(angulo) < 1e-4) return;
  _delta.setFromAxisAngle(eixo, angulo);
  osso.parent.getWorldQuaternion(_pai);
  _local.copy(_pai).invert().multiply(_delta).multiply(_pai);
  osso.quaternion.premultiply(_local);
}

/** Aponta o +Y do osso (direção do membro) para `desejado`, já em mundo. */
function apontar(osso: THREE.Bone, desejado: THREE.Vector3) {
  if (!osso.parent) return;
  _alvo.copy(desejado);
  if (_alvo.lengthSq() < 1e-6) return;
  _alvo.normalize();
  osso.updateMatrixWorld(true);
  _atual.set(0, 1, 0).transformDirection(osso.matrixWorld);
  if (_atual.lengthSq() < 1e-6) return;
  _atual.normalize();
  if (_atual.dot(_alvo) > 0.9995) return;
  _delta.setFromUnitVectors(_atual, _alvo);
  osso.parent.getWorldQuaternion(_pai);
  _local.copy(_pai).invert().multiply(_delta).multiply(_pai);
  osso.quaternion.premultiply(_local);
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
  clone.traverse((o) => {
    const bone = o as THREE.Bone;
    if (!bone.isBone) return;
    descanso.set(bone.name, bone.quaternion.clone());
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

export function CorpoQuaternius({ semente, poseRef }: { semente: string; poseRef: MutableRefObject<PoseCorpo> }) {
  const gltf = useGLTF(urlDoRig(semente), false, true);
  const grupo = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const acoes = useRef<Record<string, THREE.AnimationAction>>({});
  const atual = useRef<THREE.AnimationAction | null>(null);
  const descanso = useRef<Map<string, THREE.Quaternion>>(new Map());
  const ossos = useRef<Record<string, THREE.Bone> | null>(null);
  const corpoBindY = useRef(0);
  const quedaCorpo = useRef<number | null>(null);
  const pernas = useRef<{ coxaL: number; canelaL: number; coxaR: number; canelaR: number } | null>(null);
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
    const porOsso: Record<string, THREE.Bone> = {};
    montado.clone.traverse((o) => {
      const bone = o as THREE.Bone;
      if (bone.isBone) porOsso[bone.name] = bone;
    });
    ossos.current = porOsso;
    corpoBindY.current = porOsso.Body?.position.y ?? 0;
    quedaCorpo.current = null;
    pernas.current = null;
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
    const mapa = ossos.current;
    const corpo = mapa?.Body;
    if (pose === "sentado" && mapa && corpo) {
      if (!jaSentado.current) {
        mix.stopAllAction();
        atual.current = null;
        jaSentado.current = true;
      }
      const resp = Math.sin(relogio.current * 1.4);
      const digita = Math.sin(relogio.current * 7) * 0.1;
      root.position.y = 0;
      root.updateWorldMatrix(true, true);
      if (quedaCorpo.current == null && mapa.Hips) {
        corpo.position.y = corpoBindY.current;
        root.updateWorldMatrix(true, true);
        const y0 = mapa.Hips.getWorldPosition(_v).y;
        corpo.position.y = corpoBindY.current - 0.25;
        root.updateWorldMatrix(true, true);
        const ganho = (y0 - mapa.Hips.getWorldPosition(_v).y) / 0.25;
        quedaCorpo.current = ganho > 1e-4 ? (y0 - ALVO_QUADRIL) / ganho : 0;
      }
      corpo.position.y = corpoBindY.current - (quedaCorpo.current ?? 0) + resp * 0.01;
      for (const nome of POSE) {
        const bone = mapa[nomeOsso(nome)];
        const q = bone && descanso.current.get(bone.name);
        if (bone && q) bone.quaternion.copy(q);
      }
      root.updateWorldMatrix(true, true);
      _lateral.set(1, 0, 0).transformDirection(root.matrixWorld);
      _frente.set(0, 0, 1).transformDirection(root.matrixWorld);
      _cima.set(0, 1, 0).transformDirection(root.matrixWorld);
      if (_lateral.lengthSq() > 1e-6 && _frente.lengthSq() > 1e-6) {
        _lateral.normalize();
        _frente.normalize();
        _cima.normalize();
        _baixo.copy(_cima).negate();
        if (mapa.Abdomen) girarNoMundo(mapa.Abdomen, _lateral, -0.12 + resp * 0.04);
        if (mapa.Chest) girarNoMundo(mapa.Chest, _lateral, -0.06 + resp * 0.02);
        const coxaE = mapa[nomeOsso("UpperLegL")];
        const coxaD = mapa[nomeOsso("UpperLegR")];
        const canelaE = mapa[nomeOsso("LowerLegL")];
        const canelaD = mapa[nomeOsso("LowerLegR")];
        const peE = mapa[nomeOsso("FootL")];
        const peD = mapa[nomeOsso("FootR")];
        if (!pernas.current && coxaE && canelaE && peE && coxaD && canelaD && peD) {
          const ySentado = corpo.position.y;
          corpo.position.y = corpoBindY.current;
          root.updateWorldMatrix(true, true);
          const trecho = (a: THREE.Bone, b: THREE.Bone) => a.getWorldPosition(_quadril).distanceTo(b.getWorldPosition(_pe));
          pernas.current = {
            coxaL: trecho(coxaE, canelaE),
            canelaL: trecho(canelaE, peE),
            coxaR: trecho(coxaD, canelaD),
            canelaR: trecho(canelaD, peD),
          };
          corpo.position.y = ySentado;
          root.updateWorldMatrix(true, true);
        }
        const sentarPerna = (coxa: THREE.Bone | undefined, canela: THREE.Bone | undefined, pe: THREE.Bone | undefined, compCoxa: number, compCanela: number) => {
          if (!coxa || !canela || !pe || compCoxa < 1e-4) return;
          coxa.getWorldPosition(_quadril);
          pe.getWorldPosition(_pe);
          dobrarPerna(_quadril, _pe, _frente, compCoxa, compCanela, _joelho);
          apontar(coxa, _v.subVectors(_joelho, _quadril));
          root.updateWorldMatrix(true, true);
          canela.getWorldPosition(_quadril);
          apontar(canela, _v.subVectors(_pe, _quadril));
          apontar(pe, _frente);
        };
        const comp = pernas.current;
        sentarPerna(coxaE, canelaE, peE, comp?.coxaL ?? 0, comp?.canelaL ?? 0);
        sentarPerna(coxaD, canelaD, peD, comp?.coxaR ?? 0, comp?.canelaR ?? 0);
        root.updateWorldMatrix(true, true);
        _v.copy(_frente).multiplyScalar(0.34).addScaledVector(_baixo, 0.9).addScaledVector(_lateral, 0.2);
        if (mapa[nomeOsso("UpperArmL")]) apontar(mapa[nomeOsso("UpperArmL")], _v);
        _v.copy(_frente).multiplyScalar(0.34).addScaledVector(_baixo, 0.9).addScaledVector(_lateral, -0.2);
        if (mapa[nomeOsso("UpperArmR")]) apontar(mapa[nomeOsso("UpperArmR")], _v);
        root.updateWorldMatrix(true, true);
        _v.copy(_frente).multiplyScalar(0.42 + digita).addScaledVector(_baixo, 0.9 - digita);
        const bracoE = mapa[nomeOsso("LowerArmL")];
        const bracoD = mapa[nomeOsso("LowerArmR")];
        if (bracoE) apontar(bracoE, _v);
        if (bracoD) apontar(bracoD, _v);
      }
      return;
    }
    if (jaSentado.current) {
      root.position.y = 0;
      if (corpo) corpo.position.y = corpoBindY.current;
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
