/**
 * Cor de luz do Estúdio. Kelvin → sRGB 0..1 (aproximação de Tanner Helland),
 * suficiente para key / fill / back sem tabela medida de fabricante.
 */

export type LuzId = "key" | "fill" | "back";

export interface AjusteLuz {
  kelvin: number;
  intensidade: number;
}

export const LUZES_INICIAIS: Record<LuzId, AjusteLuz & { nome: string; tipo: "spot" | "area" }> = {
  key: { nome: "Key", tipo: "spot", kelvin: 5600, intensidade: 70 },
  fill: { nome: "Fill", tipo: "area", kelvin: 4500, intensidade: 6 },
  back: { nome: "Back", tipo: "spot", kelvin: 7000, intensidade: 28 },
};

function canal(n: number): number {
  return Math.max(0, Math.min(255, n)) / 255;
}

/** sRGB 0..1 para uma temperatura entre 1000 K e 40000 K. */
export function kelvinParaRgb(kelvin: number): [number, number, number] {
  const k = Number.isFinite(kelvin) ? kelvin : 6500;
  const temp = Math.min(40000, Math.max(1000, k)) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    r = 329.698727446 * (temp - 60) ** -0.1332047592;
    g = 288.1221695283 * (temp - 60) ** -0.0755148492;
  }
  if (temp >= 66) b = 255;
  else if (temp <= 19) b = 0;
  else b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  return [canal(r), canal(g), canal(b)];
}
