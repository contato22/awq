"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, MeshoptDecoder } from "three-stdlib";
import { aparenciaDe } from "@/lib/office-aparencia";
import { montarCabeca, urlDoRig } from "./CorpoQuaternius";

/**
 * Retrato do agente no topo da gaveta. A cabeça do Quaternius (só o GLB do
 * gênero da semente) é desenhada fora da cena 3D, sobre o degradê claro.
 * Se o modelo não carregar, fica a silhueta — o painel 2D não quebra.
 */

const LADO = 192;
const fotos = new Map<string, string>();
const cenas = new Map<string, Promise<THREE.Object3D>>();

function cenaDoRig(url: string): Promise<THREE.Object3D> {
  const pronta = cenas.get(url);
  if (pronta) return pronta;
  const pedido = (async () => {
    const decodificador = typeof MeshoptDecoder === "function" ? MeshoptDecoder() : MeshoptDecoder;
    const pronto = decodificador as { ready?: Promise<void> };
    if (pronto.ready) await pronto.ready;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(decodificador);
    const gltf = await loader.loadAsync(url);
    return gltf.scene;
  })();
  cenas.set(url, pedido);
  return pedido;
}

function enquadrar(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const caixa = new THREE.Box3();
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const malha = o as THREE.SkinnedMesh;
    if (!malha.isMesh) return;
    malha.skeleton?.update();
    const pos = malha.geometry.getAttribute("position");
    if (!pos) return;
    const passo = Math.max(1, Math.floor(pos.count / 480));
    for (let i = 0; i < pos.count; i += passo) {
      v.fromBufferAttribute(pos, i);
      if (malha.isSkinnedMesh) malha.applyBoneTransform(i, v);
      v.applyMatrix4(malha.matrixWorld);
      caixa.expandByPoint(v);
    }
  });
  if (caixa.isEmpty()) caixa.set(new THREE.Vector3(-0.1, 1.5, -0.1), new THREE.Vector3(0.1, 1.75, 0.1));
  return caixa;
}

async function fotografar(semente: string): Promise<string> {
  const pronta = fotos.get(semente);
  if (pronta) return pronta;
  const cena = await cenaDoRig(urlDoRig(semente));
  const cabeca = montarCabeca(cena, semente);
  const caixa = enquadrar(cabeca);
  const centro = caixa.getCenter(new THREE.Vector3());
  const tamanho = caixa.getSize(new THREE.Vector3());
  const maior = Math.max(tamanho.x, tamanho.y, 0.18);
  const fov = 26;
  const dist = (maior / 2) / Math.tan((fov * Math.PI) / 360) * 1.28;

  const palco = new THREE.Scene();
  palco.add(cabeca);
  palco.add(new THREE.AmbientLight("#ffffff", 0.75));
  const chave = new THREE.DirectionalLight("#fff6ea", 1.35);
  chave.position.set(0.55, 1.6, 2.2);
  palco.add(chave);
  const preenchimento = new THREE.DirectionalLight("#d7ecea", 0.5);
  preenchimento.position.set(-1.1, 0.6, 1.4);
  palco.add(preenchimento);

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.02, 30);
  camera.position.set(centro.x + maior * 0.08, centro.y, centro.z + dist);
  camera.lookAt(centro);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(LADO, LADO, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.render(palco, camera);
  const url = renderer.domElement.toDataURL("image/png");
  renderer.dispose();
  renderer.forceContextLoss();
  fotos.set(semente, url);
  return url;
}

function Silhueta({ pele, cabelo }: { pele: string; cabelo: string }) {
  return (
    <div className="relative h-full w-full" aria-hidden>
      <div className="absolute left-1/2 top-1.5 h-10 w-10 -translate-x-1/2 rounded-full" style={{ background: pele }} />
      <div className="absolute left-1/2 top-1.5 h-4 w-10 -translate-x-1/2 rounded-t-full" style={{ background: cabelo }} />
      <div className="absolute inset-x-2.5 bottom-1 h-6 rounded-t-2xl" style={{ background: pele }} />
    </div>
  );
}

export function RetratoAgente({ semente, nome, papel }: { semente: string; nome: string; papel: string }) {
  const a = aparenciaDe(semente);
  const [foto, setFoto] = useState<string | null>(() => fotos.get(semente) ?? null);

  useEffect(() => {
    let vivo = true;
    const cache = fotos.get(semente);
    if (cache) {
      setFoto(cache);
      return;
    }
    setFoto(null);
    fotografar(semente).then(
      (url) => {
        if (vivo) setFoto(url);
      },
      () => {
        if (vivo) setFoto(null);
      },
    );
    return () => {
      vivo = false;
    };
  }, [semente]);

  return (
    <div className="shrink-0 px-3 pt-3 pr-12">
      <div
        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 shadow-sm"
        style={{ background: "linear-gradient(135deg, #9fd3d0 0%, #7fb3d5 100%)" }}
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          {foto ? <img src={foto} alt="" className="h-full w-full object-contain" /> : <Silhueta pele={a.pele} cabelo={a.cabelo} />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{nome}</div>
          <div className="text-[11px] font-medium text-slate-800">{papel}</div>
        </div>
      </div>
    </div>
  );
}
