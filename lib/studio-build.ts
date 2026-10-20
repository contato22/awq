/**
 * Props CC0 do set (Kenney Furniture Kit). Encaixe de 0,5 m.
 * Memória da sessão; localStorage só com CAZA_STUDIO_PERSIST=1.
 */

import { persistenciaDoEstudioLigada } from "./studio-store";

export const PASSO_ENCAIXE = 0.5;

export const PISO = { x: 8, zMin: -3, zMax: 5 } as const;

export const PROPS_SET = [
  { id: "cadeira", nome: "Cadeira", arquivo: "/models/studio/kenney/chair.glb", escala: 2.2, centro: [0.1, -0.1] as [number, number] },
  { id: "mesa", nome: "Mesa", arquivo: "/models/studio/kenney/table.glb", escala: 2.2, centro: [0.4205, -0.2235] as [number, number] },
  { id: "planta", nome: "Planta", arquivo: "/models/studio/kenney/pottedPlant.glb", escala: 2.2, centro: [0.0845, -0.0955] as [number, number] },
  { id: "luminaria", nome: "Luminária", arquivo: "/models/studio/kenney/lampRoundFloor.glb", escala: 2.2, centro: [0.06, -0.06] as [number, number] },
] as const;

export type PropId = (typeof PROPS_SET)[number]["id"];

export interface PropNoSet {
  id: string;
  tipo: PropId;
  x: number;
  z: number;
}

const CHAVE = "awq.caza.studio.props";

let memoria: PropNoSet[] | null = null;

export function propPorId(id: string) {
  return PROPS_SET.find((p) => p.id === id);
}

export function encaixar(x: number, z: number): { x: number; z: number } {
  const passo = PASSO_ENCAIXE;
  const px = Math.round(x / passo) * passo;
  const pz = Math.round(z / passo) * passo;
  return { x: Object.is(px, -0) ? 0 : px, z: Object.is(pz, -0) ? 0 : pz };
}

export function cabeNoPiso(x: number, z: number): boolean {
  return Math.abs(x) <= PISO.x && z >= PISO.zMin && z <= PISO.zMax;
}

function tipoValido(id: string): id is PropId {
  return PROPS_SET.some((p) => p.id === id);
}

function lerLocal(): PropNoSet[] {
  if (!persistenciaDoEstudioLigada() || typeof localStorage === "undefined") return [];
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return [];
    const lista = JSON.parse(cru) as PropNoSet[];
    if (!Array.isArray(lista)) return [];
    return lista.filter((p) => p && tipoValido(p.tipo) && Number.isFinite(p.x) && Number.isFinite(p.z));
  } catch {
    return [];
  }
}

function carregar(): PropNoSet[] {
  if (!memoria) memoria = lerLocal();
  return memoria;
}

function gravar(lista: PropNoSet[]) {
  memoria = lista;
  if (persistenciaDoEstudioLigada() && typeof localStorage !== "undefined") {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { /* cota */ }
  }
}

export function listarProps(): PropNoSet[] {
  return [...carregar()];
}

/** Encaixa e recusa ponto fora do piso. */
export function colocarProp(tipo: PropId, x: number, z: number): PropNoSet | null {
  const ponto = encaixar(x, z);
  if (!cabeNoPiso(ponto.x, ponto.z)) return null;
  const prop: PropNoSet = {
    id: `prop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tipo,
    x: ponto.x,
    z: ponto.z,
  };
  gravar([...carregar(), prop]);
  return prop;
}

export function removerProp(id: string) {
  gravar(carregar().filter((p) => p.id !== id));
}

/** Próximo vão livre, já no passo da grade, para o botão Colocar. */
export function proximoPonto(ocupados: { x: number; z: number }[]): { x: number; z: number } {
  for (let i = 0; i < 10; i++) {
    const ponto = encaixar(-2 + i, 1.5);
    if (cabeNoPiso(ponto.x, ponto.z) && !ocupados.some((p) => p.x === ponto.x && p.z === ponto.z)) return ponto;
  }
  return encaixar(1.5, 2.5);
}

export function resetBuildParaTeste() {
  memoria = null;
  if (typeof localStorage !== "undefined") {
    try { localStorage.removeItem(CHAVE); } catch { /* sem storage */ }
  }
}
