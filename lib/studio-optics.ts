/**
 * Óptica do Estúdio: distância focal (mm) + tamanho do sensor → campo de visão.
 * Fórmula física, a mesma da câmera de cinema virtual: o ângulo cobre o sensor,
 * não a "equivalência em 35 mm".
 *
 * Super35: gate comum de cinema digital, 24,89 × 18,66 mm.
 * Full frame: 36 × 24 mm.
 * Celular: sensor compacto 7,6 × 5,7 mm (a lente física curta é que abre o ângulo).
 */

export const SENSORES = {
  super35: { id: "super35", nome: "Super35", larguraMm: 24.89, alturaMm: 18.66 },
  ff: { id: "ff", nome: "Full Frame", larguraMm: 36, alturaMm: 24 },
  phone: { id: "phone", nome: "Celular", larguraMm: 7.6, alturaMm: 5.7 },
} as const;

export type SensorId = keyof typeof SENSORES;

export interface CampoDeVisao {
  horizontal: number;
  vertical: number;
}

/** Ângulo, em graus, que uma lente cobre num eixo do sensor. */
export function fovGraus(eixoMm: number, lenteMm: number): number {
  if (!(lenteMm > 0) || !(eixoMm > 0) || !Number.isFinite(lenteMm) || !Number.isFinite(eixoMm)) {
    throw new Error("Lente e sensor precisam ser números positivos.");
  }
  return (2 * Math.atan(eixoMm / (2 * lenteMm)) * 180) / Math.PI;
}

export function fovDaLente(lenteMm: number, sensor: SensorId): CampoDeVisao {
  const s = SENSORES[sensor];
  return {
    horizontal: fovGraus(s.larguraMm, lenteMm),
    vertical: fovGraus(s.alturaMm, lenteMm),
  };
}

/** FOV vertical em graus, o que o PerspectiveCamera do Three.js consome. */
export function fovVertical(lenteMm: number, sensor: SensorId): number {
  return fovDaLente(lenteMm, sensor).vertical;
}
