/**
 * Planos capturados no Estúdio. Ficam na memória da sessão.
 * localStorage só entra se CAZA_STUDIO_PERSIST=1 (desligado por padrão).
 * Não há banco.
 */

import type { AspectoQuadro, SensorId } from "./studio-optics";

export interface ShotEstudio {
  id: string;
  nome: string;
  nota: string;
  lenteMm: number;
  sensor: SensorId;
  aspecto: AspectoQuadro;
  fovVertical: number;
  png: string;
  criadoEm: string;
}

const CHAVE = "awq.caza.studio.shots";

let memoria: ShotEstudio[] | null = null;
let avisoCota: string | null = null;
const ouvintes = new Set<() => void>();

export function avisoDaCota(): string | null {
  return avisoCota;
}

export function persistenciaDoEstudioLigada(): boolean {
  const v = process.env.NEXT_PUBLIC_CAZA_STUDIO_PERSIST || process.env.CAZA_STUDIO_PERSIST;
  return v === "1" || v === "true";
}

function lerLocal(): ShotEstudio[] {
  if (!persistenciaDoEstudioLigada() || typeof localStorage === "undefined") return [];
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return [];
    const lista = JSON.parse(cru) as ShotEstudio[];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function carregar(): ShotEstudio[] {
  if (!memoria) memoria = lerLocal();
  return memoria;
}

function gravar(lista: ShotEstudio[]) {
  memoria = lista;
  avisoCota = null;
  if (persistenciaDoEstudioLigada() && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(lista));
    } catch {
      avisoCota = "O navegador não gravou os planos: a cota do armazenamento encheu. Eles continuam só nesta sessão.";
    }
  }
  ouvintes.forEach((fn) => fn());
}

export function listarShots(): ShotEstudio[] {
  return [...carregar()];
}

export function salvarShot(entrada: Omit<ShotEstudio, "id" | "criadoEm">): ShotEstudio {
  const shot: ShotEstudio = {
    ...entrada,
    id: `shot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    criadoEm: new Date().toISOString(),
  };
  gravar([...carregar(), shot]);
  return shot;
}

export function moverShot(id: string, delta: -1 | 1) {
  const lista = [...carregar()];
  const i = lista.findIndex((s) => s.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= lista.length) return;
  const [item] = lista.splice(i, 1);
  lista.splice(j, 0, item);
  gravar(lista);
}

export function removerShot(id: string) {
  gravar(carregar().filter((s) => s.id !== id));
}

export function assinarEstudio(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** Só para teste: esquece a sessão e a chave local. */
export function resetEstudioParaTeste() {
  memoria = null;
  avisoCota = null;
  if (typeof localStorage !== "undefined") {
    try { localStorage.removeItem(CHAVE); } catch { /* sem storage */ }
  }
  ouvintes.forEach((fn) => fn());
}
