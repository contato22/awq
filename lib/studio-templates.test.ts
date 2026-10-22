import assert from "node:assert/strict";
import { test } from "node:test";
import type { ShotEstudio } from "./studio-store";
import {
  callSheetDaProducao,
  csvDaProducao,
  csvDoDiretor,
  enquadramentoDaLente,
  htmlDaFicha,
  shotListDoDiretor,
} from "./studio-templates";

function plano(parcial: Partial<ShotEstudio> & Pick<ShotEstudio, "nome" | "lenteMm">): ShotEstudio {
  return {
    id: parcial.nome,
    nota: "",
    sensor: "super35",
    aspecto: "16:9",
    fovVertical: 20,
    png: "data:image/png;base64,iVBORw0KGgo=",
    criadoEm: "2026-10-20T12:00:00.000Z",
    ...parcial,
  };
}

test("diretor e produção saem de regras locais, sem o PNG no CSV", () => {
  assert.equal(enquadramentoDaLente(24), "aberto");
  assert.equal(enquadramentoDaLente(35), "aberto");
  assert.equal(enquadramentoDaLente(50), "médio");
  assert.equal(enquadramentoDaLente(85), "fechado");

  const shots = [
    plano({ nome: "Abertura", lenteMm: 24 }),
    plano({ nome: "Rosto", lenteMm: 85, nota: 'olhar, "limpo"' }),
    plano({ nome: "Rosto 2", lenteMm: 85, sensor: "ff" }),
  ];

  const lista = shotListDoDiretor(shots);
  assert.equal(lista[0].enquadramento, "aberto");
  assert.equal(lista[0].indicacao, "Estabelecer o espaço e o ciclorama.");
  assert.equal(lista[0].sensor, "Super35");
  assert.equal(lista[1].enquadramento, "fechado");
  assert.equal(lista[1].indicacao, 'olhar, "limpo"');
  assert.equal(lista[2].sensor, "Full Frame");

  const dia = callSheetDaProducao(shots);
  assert.equal(dia.planos, 3);
  assert.equal(dia.lentes, "24 mm, 85 mm");
  assert.deepEqual(dia.linhas.map((l) => l.horario), ["08:00", "08:20", "08:40"]);
  assert.deepEqual(dia.linhas.map((l) => l.setup), ["primeiro setup", "troca de lente", "troca de sensor"]);

  const mesmo = callSheetDaProducao([
    plano({ nome: "A", lenteMm: 50 }),
    plano({ nome: "B", lenteMm: 50 }),
  ]);
  assert.equal(mesmo.linhas[1].setup, "mesmo setup");

  const vazio = callSheetDaProducao([]);
  assert.equal(vazio.planos, 0);
  assert.match(vazio.chamada, /Sem planos/);

  const csv = csvDoDiretor(shots);
  assert.match(csv, /^ordem,plano,enquadramento/);
  assert.match(csv, /"olhar, ""limpo"""/);
  assert.equal(csv.includes("data:image"), false);
  assert.match(csvDaProducao(shots), /08:20/);

  const html = htmlDaFicha([plano({ nome: "<b>x</b>", lenteMm: 50, nota: "<script>", png: "javascript:alert(1)" })]);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(html.includes("javascript:"), false);
  assert.equal(html.includes("<img"), false);
});
