/**
 * Elenco do Estúdio. Memória da sessão; localStorage só com
 * CAZA_STUDIO_PERSIST=1. As poses são clipes do GLB CC0 do Quaternius.
 */

import { persistenciaDoEstudioLigada } from "./studio-store";

export const POSES_ATOR = [
  { id: "Idle_Loop", rotulo: "Parado" },
  { id: "Idle_Talking_Loop", rotulo: "Falando" },
  { id: "Walk_Loop", rotulo: "Andando" },
  { id: "Sitting_Idle_Loop", rotulo: "Sentado" },
  { id: "Fixing_Kneeling", rotulo: "Ajoelhado" },
  { id: "Interact", rotulo: "Interagindo" },
] as const;

export type PoseAtorId = (typeof POSES_ATOR)[number]["id"];

export const NOME_ATOR_PADRAO = "Elenco";
export const POSE_ATOR_PADRAO: PoseAtorId = "Idle_Loop";

export interface EstadoAtor {
  nome: string;
  pose: PoseAtorId;
}

const CHAVE = "awq.caza.studio.actor";

let memoria: EstadoAtor | null = null;

export function poseValida(id: string): id is PoseAtorId {
  return POSES_ATOR.some((p) => p.id === id);
}

function padrao(): EstadoAtor {
  return { nome: NOME_ATOR_PADRAO, pose: POSE_ATOR_PADRAO };
}

function lerLocal(): EstadoAtor | null {
  if (!persistenciaDoEstudioLigada() || typeof localStorage === "undefined") return null;
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return null;
    const dado = JSON.parse(cru) as { nome?: unknown; pose?: unknown };
    const nome = typeof dado.nome === "string" && dado.nome.trim() ? dado.nome.trim() : NOME_ATOR_PADRAO;
    const pose = typeof dado.pose === "string" && poseValida(dado.pose) ? dado.pose : POSE_ATOR_PADRAO;
    return { nome, pose };
  } catch {
    return null;
  }
}

function carregar(): EstadoAtor {
  if (!memoria) memoria = lerLocal() ?? padrao();
  return memoria;
}

function gravar(estado: EstadoAtor) {
  memoria = estado;
  if (persistenciaDoEstudioLigada() && typeof localStorage !== "undefined") {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { /* cota */ }
  }
}

export function estadoDoAtor(): EstadoAtor {
  return { ...carregar() };
}

/** Rótulo no set. O valor digitado guarda o espaço; a exibição é que corta as pontas. */
export function nomeExibido(nome: string): string {
  const limpo = nome.trim();
  return limpo || NOME_ATOR_PADRAO;
}

export function definirAtor(parcial: Partial<EstadoAtor>): EstadoAtor {
  const atual = carregar();
  const nome = parcial.nome === undefined ? atual.nome : parcial.nome;
  const proximo: EstadoAtor = {
    nome,
    pose: parcial.pose && poseValida(parcial.pose) ? parcial.pose : atual.pose,
  };
  gravar(proximo);
  return { ...proximo };
}

export function resetAtorParaTeste() {
  memoria = null;
  if (typeof localStorage !== "undefined") {
    try { localStorage.removeItem(CHAVE); } catch { /* sem storage */ }
  }
}
