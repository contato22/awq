import assert from "node:assert/strict";
import { test } from "node:test";
import { kelvinParaRgb } from "./studio-lights";

test("tungstênio é quente e o céu aberto é frio", () => {
  const quente = kelvinParaRgb(2700);
  const frio = kelvinParaRgb(10000);
  assert.ok(quente[0] > quente[2], "2700 K tem mais vermelho que azul");
  assert.ok(frio[2] >= frio[0], "10000 K não é mais vermelho que azul");
  assert.ok(quente[0] > frio[0]);
});

test("5600 K da key fica perto do branco", () => {
  const [r, g, b] = kelvinParaRgb(5600);
  for (const c of [r, g, b]) assert.ok(c > 0.85 && c <= 1);
});

test("Kelvin fora da faixa é limitado", () => {
  assert.deepEqual(kelvinParaRgb(100), kelvinParaRgb(1000));
  assert.deepEqual(kelvinParaRgb(80000), kelvinParaRgb(40000));
  const [r, g, b] = kelvinParaRgb(Number.NaN);
  assert.ok(r > 0.9 && g > 0.9 && b > 0.9);
});
