"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AspectoQuadro, SensorId } from "@/lib/studio-optics";
import { SENSORES } from "@/lib/studio-optics";
import { avisoDaCota, listarShots, persistenciaDoEstudioLigada, salvarShot, type ShotEstudio } from "@/lib/studio-store";
import { CAMADA_CICLORAMA } from "./camadas";
import { ALVO_CAMERA, POSICAO_CAMERA } from "./VirtualCamera";

export interface PedidoCaptura {
  n: number;
  nome: string;
  nota: string;
  lenteMm: number;
  sensor: SensorId;
  aspecto: AspectoQuadro;
  fovVertical: number;
}

function razaoDoQuadro(aspecto: AspectoQuadro): number {
  return aspecto === "16:9" ? 16 / 9 : 2.39;
}

function ehAjuda(obj: THREE.Object3D): boolean {
  let atual: THREE.Object3D | null = obj;
  while (atual) {
    if (atual.userData?.ocultarNaCaptura) return true;
    atual = atual.parent;
  }
  return false;
}

/** Renderiza pela câmera virtual, no quadro da lente, sem gizmos. */
function pngPelaCamera(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  pedido: PedidoCaptura,
): string {
  const razao = razaoDoQuadro(pedido.aspecto);
  const w = 960;
  const h = Math.max(1, Math.round(w / razao));
  const cam = new THREE.PerspectiveCamera(pedido.fovVertical, razao, 0.1, 80);
  cam.position.set(...POSICAO_CAMERA);
  cam.up.set(0, 1, 0);
  cam.lookAt(...ALVO_CAMERA);
  cam.layers.enable(CAMADA_CICLORAMA);
  cam.updateProjectionMatrix();

  const ocultos: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (ehAjuda(obj) && obj.visible) {
      obj.visible = false;
      ocultos.push(obj);
    }
  });

  const alvo = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace,
  });
  alvo.texture.colorSpace = THREE.SRGBColorSpace;
  const anterior = gl.getRenderTarget();
  const xr = gl.xr.enabled;
  gl.xr.enabled = false;
  gl.setRenderTarget(alvo);
  gl.render(scene, cam);
  const buf = new Uint8Array(w * h * 4);
  gl.readRenderTargetPixels(alvo, 0, 0, w, h, buf);
  gl.setRenderTarget(anterior);
  gl.xr.enabled = xr;
  alvo.dispose();
  for (const obj of ocultos) obj.visible = true;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const linha = (h - 1 - y) * w * 4;
    img.data.set(buf.subarray(linha, linha + w * 4), y * w * 4);
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Dentro do Canvas: fotografa o quadro da câmera virtual e grava o plano. */
export function GanchoDeCaptura({
  pedido,
  onFeito,
}: {
  pedido: PedidoCaptura | null;
  onFeito: (shot: ShotEstudio) => void;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (!pedido) return;
    let vivo = true;
    const id = requestAnimationFrame(() => {
      if (!vivo) return;
      const png = pngPelaCamera(gl, scene, pedido);
      const shot = salvarShot({
        nome: pedido.nome.trim() || "Sem nome",
        nota: pedido.nota.trim(),
        lenteMm: pedido.lenteMm,
        sensor: pedido.sensor,
        aspecto: pedido.aspecto,
        fovVertical: pedido.fovVertical,
        png,
      });
      onFeito(shot);
    });
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [pedido, gl, scene, onFeito]);
  return null;
}

export function FormularioDeCaptura({
  lenteMm,
  sensor,
  aspecto,
  fovVertical,
  onCapturar,
  ultimo,
}: {
  lenteMm: number;
  sensor: SensorId;
  aspecto: AspectoQuadro;
  fovVertical: number;
  onCapturar: (nome: string, nota: string) => void;
  ultimo: ShotEstudio | null;
}) {
  const [nome, setNome] = useState("Plano 1");
  const [nota, setNota] = useState("");
  const total = listarShots().length;
  const persiste = persistenciaDoEstudioLigada();

  return (
    <form
      className="absolute bottom-40 left-16 pointer-events-auto w-64 rounded-2xl bg-black/75 text-white text-[11px] p-3 space-y-2"
      onSubmit={(e) => { e.preventDefault(); onCapturar(nome, nota); }}
    >
      <p className="font-semibold text-xs">Captura</p>
      <label className="block">
        Nome
        <input
          aria-label="Nome do plano"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mt-0.5 w-full rounded-md bg-white/10 px-2 py-1"
        />
      </label>
      <label className="block">
        Nota
        <input
          aria-label="Nota do plano"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="luz, lente, intenção"
          className="mt-0.5 w-full rounded-md bg-white/10 px-2 py-1 placeholder:text-white/40"
        />
      </label>
      <p className="text-white/70">{lenteMm} mm · {SENSORES[sensor].nome} · {aspecto} · {fovVertical.toFixed(1)}°</p>
      <button type="submit" className="w-full rounded-lg bg-white text-gray-900 font-semibold py-1.5">
        Capturar
      </button>
      <p className="text-white/60">
        {total} {total === 1 ? "plano" : "planos"} nesta sessão.
        {persiste ? " Gravado neste navegador." : " Persistência desligada."}
      </p>
      {avisoDaCota() && <p role="status" className="text-amber-200">{avisoDaCota()}</p>}
      {ultimo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ultimo.png} alt={`Miniatura de ${ultimo.nome}`} className="w-full rounded-md border border-white/20" />
      )}
    </form>
  );
}
