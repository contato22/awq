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

export type AspectoQuadro = "16:9" | "2.39";

const RAZAO: Record<AspectoQuadro, number> = { "16:9": 16 / 9, "2.39": 2.39 };

/**
 * Recorte do sensor para o quadro. 16:9 e 2.39 são mais largos que a altura
 * útil desses sensores, então a largura manda e a altura é cortada.
 */
export function gateNoAspecto(sensor: SensorId, aspecto: AspectoQuadro): { larguraMm: number; alturaMm: number } {
  const s = SENSORES[sensor];
  const razao = RAZAO[aspecto];
  const altura = s.larguraMm / razao;
  if (altura <= s.alturaMm) return { larguraMm: s.larguraMm, alturaMm: altura };
  return { larguraMm: s.alturaMm * razao, alturaMm: s.alturaMm };
}

/**
 * O FOV da lente vale para a altura do quadro. A tela é mais alta, então
 * fov = 2·atan(tan(fov/2)·H/q.h), com os ângulos em radianos dentro do atan.
 */
export function fovNoVisor(fovQuadroGraus: number, alturaTela: number, alturaQuadro: number): number {
  const qh = Math.max(1, alturaQuadro);
  const tela = Math.max(qh, alturaTela);
  const rad = (fovQuadroGraus * Math.PI) / 180;
  return (2 * Math.atan(Math.tan(rad / 2) * (tela / qh)) * 180) / Math.PI;
}

export function fovNoQuadro(lenteMm: number, sensor: SensorId, aspecto: AspectoQuadro): CampoDeVisao {
  const g = gateNoAspecto(sensor, aspecto);
  return {
    horizontal: fovGraus(g.larguraMm, lenteMm),
    vertical: fovGraus(g.alturaMm, lenteMm),
  };
}
