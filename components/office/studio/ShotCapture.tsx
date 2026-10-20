"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import type { AspectoQuadro, SensorId } from "@/lib/studio-optics";
import { SENSORES } from "@/lib/studio-optics";
import { listarShots, persistenciaDoEstudioLigada, salvarShot, type ShotEstudio } from "@/lib/studio-store";

export interface PedidoCaptura {
  n: number;
  nome: string;
  nota: string;
  lenteMm: number;
  sensor: SensorId;
  aspecto: AspectoQuadro;
  fovVertical: number;
}

/** Dentro do Canvas: lê o framebuffer (preserveDrawingBuffer) e grava o plano. */
export function GanchoDeCaptura({
  pedido,
  onFeito,
}: {
  pedido: PedidoCaptura | null;
  onFeito: (shot: ShotEstudio) => void;
}) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!pedido) return;
    let vivo = true;
    const id = requestAnimationFrame(() => {
      if (!vivo) return;
      const png = gl.domElement.toDataURL("image/png");
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
  }, [pedido, gl, onFeito]);
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
      className="absolute bottom-40 left-3 pointer-events-auto w-64 rounded-2xl bg-black/75 text-white text-[11px] p-3 space-y-2"
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
      {ultimo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ultimo.png} alt={`Miniatura de ${ultimo.nome}`} className="w-full rounded-md border border-white/20" />
      )}
    </form>
  );
}
