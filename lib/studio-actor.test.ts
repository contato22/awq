import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NOME_ATOR_PADRAO,
  POSE_ATOR_PADRAO,
  POSES_ATOR,
  definirAtor,
  estadoDoAtor,
  nomeExibido,
  poseValida,
  resetAtorParaTeste,
} from "./studio-actor";

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
});

test("o elenco tem poses nomeadas e só persiste com a flag", () => {
  delete process.env.CAZA_STUDIO_PERSIST;
  delete process.env.NEXT_PUBLIC_CAZA_STUDIO_PERSIST;
  store.clear();
  resetAtorParaTeste();

  assert.equal(POSES_ATOR.length, 6);
  assert.equal(new Set(POSES_ATOR.map((p) => p.id)).size, 6);
  assert.equal(poseValida("Idle_Loop"), true);
  assert.equal(poseValida("Sword_Attack"), false);

  assert.deepEqual(estadoDoAtor(), { nome: NOME_ATOR_PADRAO, pose: POSE_ATOR_PADRAO });
  definirAtor({ nome: "Marina Silva", pose: "Sitting_Idle_Loop" });
  assert.deepEqual(estadoDoAtor(), { nome: "Marina Silva", pose: "Sitting_Idle_Loop" });
  definirAtor({ nome: "Ana " });
  assert.equal(estadoDoAtor().nome, "Ana ");
  assert.equal(nomeExibido("Ana "), "Ana");
  definirAtor({ nome: "   ", pose: "Walk_Loop" });
  assert.equal(estadoDoAtor().nome, "   ");
  assert.equal(estadoDoAtor().pose, "Walk_Loop");
  assert.equal(nomeExibido("   "), NOME_ATOR_PADRAO);
  assert.equal(store.size, 0);

  process.env.CAZA_STUDIO_PERSIST = "1";
  store.clear();
  resetAtorParaTeste();
  definirAtor({ nome: "Rui", pose: "Idle_Talking_Loop" });
  const gravado = store.get("awq.caza.studio.actor") ?? "";
  assert.match(gravado, /"nome":"Rui"/);
  resetAtorParaTeste();
  store.set("awq.caza.studio.actor", JSON.stringify({ nome: "Lia", pose: "nao-existe" }));
  assert.deepEqual(estadoDoAtor(), { nome: "Lia", pose: POSE_ATOR_PADRAO });

  delete process.env.CAZA_STUDIO_PERSIST;
  resetAtorParaTeste();
});
