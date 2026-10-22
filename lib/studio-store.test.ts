import assert from "node:assert/strict";
import { test } from "node:test";
import {
  avisoDaCota,
  listarShots,
  moverShot,
  persistenciaDoEstudioLigada,
  resetEstudioParaTeste,
  salvarShot,
} from "./studio-store";

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
});

const base = {
  nome: "Plano",
  nota: "contra o ciclorama",
  lenteMm: 50,
  sensor: "super35" as const,
  aspecto: "16:9" as const,
  fovVertical: 15.9,
  png: "data:image/png;base64,iVBORw0KGgo=",
};

test("a flag desligada não escreve no navegador e a ligada relê e reordena", () => {
  delete process.env.CAZA_STUDIO_PERSIST;
  delete process.env.NEXT_PUBLIC_CAZA_STUDIO_PERSIST;
  store.clear();
  resetEstudioParaTeste();
  assert.equal(persistenciaDoEstudioLigada(), false);
  salvarShot(base);
  assert.equal(listarShots().length, 1);
  assert.equal(store.size, 0);

  process.env.CAZA_STUDIO_PERSIST = "1";
  store.clear();
  resetEstudioParaTeste();
  assert.equal(persistenciaDoEstudioLigada(), true);
  salvarShot({ ...base, nome: "A" });
  salvarShot({ ...base, nome: "B" });
  const gravado = store.get("awq.caza.studio.shots") ?? "";
  assert.match(gravado, /"nome":"A"/);
  assert.match(gravado, /"nome":"B"/);
  resetEstudioParaTeste();
  store.set("awq.caza.studio.shots", gravado);
  assert.deepEqual(listarShots().map((s) => s.nome), ["A", "B"]);
  moverShot(listarShots()[1].id, -1);
  assert.deepEqual(listarShots().map((s) => s.nome), ["B", "A"]);
  delete process.env.CAZA_STUDIO_PERSIST;
  resetEstudioParaTeste();
});

test("a cota cheia avisa e mantém o plano na sessão", () => {
  process.env.CAZA_STUDIO_PERSIST = "1";
  store.clear();
  resetEstudioParaTeste();
  const original = store.set.bind(store);
  store.set = () => { throw new Error("quota"); };
  const shot = salvarShot({ ...base, nome: "Cheio" });
  assert.equal(shot.nome, "Cheio");
  assert.equal(listarShots().length, 1);
  assert.match(avisoDaCota() ?? "", /cota/);
  store.set = original;
  delete process.env.CAZA_STUDIO_PERSIST;
  resetEstudioParaTeste();
  assert.equal(avisoDaCota(), null);
});
