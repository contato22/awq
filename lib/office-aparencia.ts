/**
 * Aparência estável de cada agente do Office (mesma semente = mesma pessoa).
 * A paleta de roupa é neutra/terrosa de propósito: o escritório não usa o
 * azul/roxo saturado dos papéis. A jaqueta é uma variante a mais, também
 * escolhida pela semente.
 */

export const PELES = ["#f1c9a5", "#e0b08a", "#c98f5f", "#a9714a", "#8d5524", "#6b3d1f"];
export const CABELOS = ["#374151", "#6b4423", "#c2410c", "#2d3748", "#78350f", "#4b2e1a", "#d4a373", "#44403c"];

/** Camisas, malhas e coletes — areia, camelo, sálvia, terracota, linho, cacau. */
export const ROUPAS = ["#c4a484", "#a67c52", "#8a9a6a", "#b85c38", "#6f6256", "#d4c4a8", "#7d5a3c", "#9c7a4a"];

/** Calças em marrom, oliva e carvão quente. */
export const CALCAS = ["#4a4036", "#5c5346", "#3d4a3c", "#6b5b4b", "#3f342c", "#2e2926"];

/** Paletó, moletom ou colete. `null` na aparência significa sem jaqueta. */
export const JAQUETA_CORES = ["#6b5344", "#8d7355", "#4e463c", "#7a6248", "#5c4a3a"];

export interface AparenciaPersonagem {
  pele: string;
  cabelo: string;
  corpo: string;
  calca: string;
  /** Cor da jaqueta, ou null quando a semente não veste uma. */
  jaqueta: string | null;
  altura: number;
}

export function hashSemente(txt: string): number {
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
  return h;
}

export const escolhe = <T,>(lista: T[], seed: number, sal: number) => lista[(seed + sal) % lista.length];

/** Deriva uma aparência estável (mesma empresa+papel = sempre a mesma pessoa). */
export function aparenciaDe(semente: string): AparenciaPersonagem {
  const h = hashSemente(semente);
  return {
    pele: escolhe(PELES, h, 0),
    cabelo: escolhe(CABELOS, h, 7),
    corpo: escolhe(ROUPAS, h, 13),
    calca: escolhe(CALCAS, h, 19),
    jaqueta: h % 3 === 0 ? null : escolhe(JAQUETA_CORES, h, 23),
    altura: 0.94 + ((h >> 3) % 10) / 100,
  };
}
