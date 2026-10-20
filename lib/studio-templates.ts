/**
 * Diretor (lista de planos) e Produção (ordem do dia).
 * Regras locais em cima dos planos capturados. Sem modelo de linguagem.
 */

import { SENSORES, type SensorId } from "./studio-optics";
import type { ShotEstudio } from "./studio-store";

export type Enquadramento = "aberto" | "médio" | "fechado";

export interface LinhaDiretor {
  ordem: number;
  plano: string;
  enquadramento: Enquadramento;
  lenteMm: number;
  sensor: string;
  aspecto: string;
  indicacao: string;
}

export interface LinhaProducao {
  ordem: number;
  horario: string;
  plano: string;
  lenteMm: number;
  setup: string;
}

export interface OrdemDoDia {
  chamada: string;
  planos: number;
  lentes: string;
  linhas: LinhaProducao[];
}

const PASSO_MIN = 20;
const INICIO_MIN = 8 * 60;

export function enquadramentoDaLente(mm: number): Enquadramento {
  if (mm <= 35) return "aberto";
  if (mm >= 85) return "fechado";
  return "médio";
}

function indicacao(shot: ShotEstudio, enquadramento: Enquadramento): string {
  const nota = shot.nota.trim();
  if (nota) return nota;
  if (enquadramento === "aberto") return "Estabelecer o espaço e o ciclorama.";
  if (enquadramento === "fechado") return "Apertar no rosto do elenco.";
  return "Plano de cobertura no eixo da câmera.";
}

function nomeSensor(id: SensorId): string {
  return SENSORES[id]?.nome ?? id;
}

export function shotListDoDiretor(shots: ShotEstudio[]): LinhaDiretor[] {
  return shots.map((shot, i) => {
    const enquadramento = enquadramentoDaLente(shot.lenteMm);
    return {
      ordem: i + 1,
      plano: shot.nome.trim() || "Sem nome",
      enquadramento,
      lenteMm: shot.lenteMm,
      sensor: nomeSensor(shot.sensor),
      aspecto: shot.aspecto,
      indicacao: indicacao(shot, enquadramento),
    };
  });
}

function horario(indice: number): string {
  const total = INICIO_MIN + indice * PASSO_MIN;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function setupDe(atual: ShotEstudio, anterior: ShotEstudio | undefined): string {
  if (!anterior) return "primeiro setup";
  if (anterior.lenteMm === atual.lenteMm && anterior.sensor === atual.sensor) return "mesmo setup";
  return "troca de lente";
}

export function callSheetDaProducao(shots: ShotEstudio[]): OrdemDoDia {
  const linhas = shots.map((shot, i) => ({
    ordem: i + 1,
    horario: horario(i),
    plano: shot.nome.trim() || "Sem nome",
    lenteMm: shot.lenteMm,
    setup: setupDe(shot, shots[i - 1]),
  }));
  const lentes: number[] = [];
  for (const shot of shots) {
    if (!lentes.includes(shot.lenteMm)) lentes.push(shot.lenteMm);
  }
  return {
    chamada: shots.length
      ? `${shots.length} plano${shots.length === 1 ? "" : "s"} · chamada 08:00 · blocos de ${PASSO_MIN} min`
      : "Sem planos capturados. A ordem do dia sai da captura do Estúdio.",
    planos: shots.length,
    lentes: lentes.length ? lentes.map((mm) => `${mm} mm`).join(", ") : "—",
    linhas,
  };
}

function celula(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

export function csvDoDiretor(shots: ShotEstudio[]): string {
  const cabecalho = "ordem,plano,enquadramento,lente_mm,sensor,aspecto,indicacao";
  const linhas = shotListDoDiretor(shots).map((l) => [
    String(l.ordem),
    celula(l.plano),
    celula(l.enquadramento),
    String(l.lenteMm),
    celula(l.sensor),
    celula(l.aspecto),
    celula(l.indicacao),
  ].join(","));
  return [cabecalho, ...linhas].join("\n");
}

export function csvDaProducao(shots: ShotEstudio[]): string {
  const cabecalho = "ordem,horario,plano,lente_mm,setup";
  const linhas = callSheetDaProducao(shots).linhas.map((l) => [
    String(l.ordem),
    celula(l.horario),
    celula(l.plano),
    String(l.lenteMm),
    celula(l.setup),
  ].join(","));
  return [cabecalho, ...linhas].join("\n");
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

function srcSeguro(png: string): string {
  return png.startsWith("data:image/png") ? png : "";
}

/** HTML da ficha (Diretor + Produção) para a impressão do navegador. */
export function htmlDaFicha(shots: ShotEstudio[]): string {
  const diretor = shotListDoDiretor(shots);
  const producao = callSheetDaProducao(shots);
  const blocos = diretor.map((l, i) => {
    const src = srcSeguro(shots[i]?.png ?? "");
    const img = src ? `<img src="${src}" alt="">` : "";
    return `<article><h2>${l.ordem}. ${escapar(l.plano)}</h2>${img}<p>${escapar(l.enquadramento)} · ${l.lenteMm} mm · ${escapar(l.sensor)} · ${escapar(l.aspecto)}</p><p>${escapar(l.indicacao)}</p></article>`;
  }).join("");
  const grade = producao.linhas.map((l) =>
    `<tr><td>${l.ordem}</td><td>${escapar(l.horario)}</td><td>${escapar(l.plano)}</td><td>${l.lenteMm} mm</td><td>${escapar(l.setup)}</td></tr>`,
  ).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Estúdio · Caza Vision</title>
    <style>
      body { font-family: sans-serif; margin: 16px; color: #111; }
      h1 { font-size: 18px; } h2 { font-size: 14px; }
      article { break-inside: avoid; margin: 0 0 16px; }
      img { width: 100%; max-height: 280px; object-fit: cover; border: 1px solid #ddd; }
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      td, th { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    </style></head><body>
    <h1>Diretor · lista de planos</h1>
    ${blocos || "<p>Nenhum plano.</p>"}
    <h1>Produção · ordem do dia</h1>
    <p>${escapar(producao.chamada)} · lentes ${escapar(producao.lentes)}</p>
    <table><thead><tr><th>#</th><th>Hora</th><th>Plano</th><th>Lente</th><th>Setup</th></tr></thead><tbody>${grade}</tbody></table>
    </body></html>`;
}
