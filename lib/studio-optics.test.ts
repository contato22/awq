import assert from "node:assert/strict";
import { test } from "node:test";
import { SENSORES, fovDaLente, fovGraus, fovVertical } from "./studio-optics";

const perto = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.02, `${a} ≠ ${b}`);

test("50 mm em full frame abre ~27° na vertical e ~40° na horizontal", () => {
  const fov = fovDaLente(50, "ff");
  perto(fov.vertical, 26.991);
  perto(fov.horizontal, 39.598);
  perto(fovVertical(50, "ff"), 26.991);
});

test("Super35 é mais fechado que full frame na mesma lente", () => {
  const s35 = fovDaLente(35, "super35");
  const ff = fovDaLente(35, "ff");
  perto(s35.vertical, 29.853);
  perto(s35.horizontal, 39.148);
  assert.ok(s35.vertical < ff.vertical);
  assert.ok(s35.horizontal < ff.horizontal);
});

test("no celular a mesma distância focal física fecha o ângulo", () => {
  const phone = fovDaLente(50, "phone");
  const ff = fovDaLente(50, "ff");
  perto(phone.vertical, 6.525);
  perto(phone.horizontal, 8.692);
  assert.ok(phone.vertical < ff.vertical);
  assert.equal(SENSORES.phone.nome, "Celular");
  assert.equal(SENSORES.super35.larguraMm, 24.89);
});

test("lente mais curta abre o campo", () => {
  const curta = fovGraus(24, 24);
  const longa = fovGraus(24, 85);
  perto(curta, 53.13);
  perto(longa, 16.071);
  assert.ok(curta > longa);
});

test("lente ou sensor inválido não devolve um ângulo", () => {
  assert.throws(() => fovGraus(24, 0));
  assert.throws(() => fovGraus(24, -35));
  assert.throws(() => fovGraus(0, 50));
  assert.throws(() => fovDaLente(Number.NaN, "ff"));
});
