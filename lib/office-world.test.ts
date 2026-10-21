import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANDARES,
  ANDAR_DA_BU,
  SALA_ESTUDIO,
  andarDaEmpresa,
  casaNoPonto,
  centroDaReuniao,
  centroDoEstudio,
} from "./office-world";

test("o 3º andar é a Caza Vision, produtora", () => {
  const caza = ANDARES.find((a) => a.id === "caza");
  assert.ok(caza);
  assert.equal(caza.numero, 3);
  assert.equal(caza.nome, "Caza Vision");
  assert.equal(caza.descricao, "Produtora");
  assert.deepEqual(ANDARES.map((a) => a.id), ["jacqes", "awaqe", "caza"]);
});

test("ANDAR_DA_BU manda a Caza Vision para o andar caza", () => {
  assert.equal(ANDAR_DA_BU["Caza Vision"], "caza");
  assert.equal(ANDAR_DA_BU.Caza_Vision, "caza");
  assert.equal(ANDAR_DA_BU.CAZA, "caza");
  assert.equal(andarDaEmpresa({ bu: "Caza Vision" }), "caza");
  assert.equal(andarDaEmpresa({ bu: "caza vision" }), "caza");
  assert.equal(andarDaEmpresa({ bu: "Social Media · Cliente" }), "jacqes");
  assert.equal(andarDaEmpresa({ bu: "Caza Vision", andar: "jacqes" }), "jacqes");
});

test("no andar caza o slot de reuniões é o Estúdio", () => {
  assert.equal(SALA_ESTUDIO.andar, "caza");
  assert.equal(SALA_ESTUDIO.nome, "Estúdio");
  const centro = centroDoEstudio();
  const reuniao = centroDaReuniao();
  assert.equal(centro.x, reuniao.x);
  assert.equal(centro.y, reuniao.y + 6);
  assert.equal(casaNoPonto(centro.x, centro.y, "caza"), "estudio");
  assert.equal(casaNoPonto(centro.x, centro.y, "jacqes"), "reunioes");
  assert.equal(casaNoPonto(centro.x, centro.y), "reunioes");
  assert.equal(SALA_ESTUDIO.lado, 5);
  assert.ok(SALA_ESTUDIO.alt > 0);
});
