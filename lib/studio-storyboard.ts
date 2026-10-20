import type { ShotEstudio } from "./studio-store";

function celula(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

/** CSV dos planos, sem o PNG (o binário fica no storyboard impresso). */
export function csvDoStoryboard(shots: ShotEstudio[]): string {
  const cabecalho = "nome,nota,lente_mm,sensor,aspecto,fov_vertical,criado_em";
  const linhas = shots.map((s) => [
    celula(s.nome),
    celula(s.nota),
    String(s.lenteMm),
    celula(s.sensor),
    celula(s.aspecto),
    s.fovVertical.toFixed(2),
    celula(s.criadoEm),
  ].join(","));
  return [cabecalho, ...linhas].join("\n");
}
