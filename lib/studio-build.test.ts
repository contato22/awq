import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cabeNoPiso,
  colocarProp,
  encaixar,
  girarProp,
  listarProps,
  proximoPonto,
  removerProp,
  resetBuildParaTeste,
} from "./studio-build";

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
});

test("o encaixe é de meio metro e a flag guarda os props", () => {
  assert.deepEqual(encaixar(1.24, -0.74), { x: 1, z: -0.5 });
  assert.deepEqual(encaixar(0.25, 0.24), { x: 0.5, z: 0 });
  assert.equal(cabeNoPiso(8, 5), true);
  assert.equal(cabeNoPiso(8.5, 0), false);
  assert.equal(cabeNoPiso(0, -3.5), false);

  delete process.env.CAZA_STUDIO_PERSIST;
  delete process.env.NEXT_PUBLIC_CAZA_STUDIO_PERSIST;
  store.clear();
  resetBuildParaTeste();
  assert.equal(colocarProp("cadeira", 9.2, 0), null);
  const mesa = colocarProp("mesa", 1.24, 1.6);
  assert.ok(mesa);
  assert.equal(mesa.x, 1);
  assert.equal(mesa.z, 1.5);
  assert.equal(store.size, 0);
  assert.equal(listarProps().length, 1);
  assert.equal(colocarProp("cadeira", mesa.x, mesa.z), null);
  assert.equal(listarProps().length, 1);
  assert.equal(girarProp(mesa.id)?.rotacao, Math.PI / 2);
  assert.equal(listarProps()[0]?.rotacao, Math.PI / 2);
  const seguinte = proximoPonto(listarProps());
  assert.notDeepEqual(seguinte, { x: mesa.x, z: mesa.z });
  assert.equal(cabeNoPiso(seguinte.x, seguinte.z), true);
  removerProp(mesa.id);
  assert.equal(listarProps().length, 0);
  assert.deepEqual(proximoPonto([]), { x: 0, z: 1 });

  process.env.CAZA_STUDIO_PERSIST = "1";
  store.clear();
  resetBuildParaTeste();
  colocarProp("planta", 0.1, 1.1);
  const gravado = store.get("awq.caza.studio.props") ?? "";
  assert.match(gravado, /"tipo":"planta"/);
  resetBuildParaTeste();
  store.set("awq.caza.studio.props", gravado);
  assert.equal(listarProps()[0]?.tipo, "planta");
  assert.equal(listarProps()[0]?.x, 0);
  assert.equal(listarProps()[0]?.z, 1);

  delete process.env.CAZA_STUDIO_PERSIST;
  resetBuildParaTeste();
});
