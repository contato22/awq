// Testa lib/seed-secret.ts: falha fechada, segredo errado, segredo certo.
import assert from "node:assert";
import { NextRequest } from "next/server";
import { hasValidSeedSecret, requireSeedSecret } from "../lib/seed-secret";

const req = (h?: string) =>
  new NextRequest("http://x/api", { headers: h ? { "x-seed-secret": h } : {} });

delete process.env.SEED_SECRET;
assert.equal(hasValidSeedSecret(req("qualquer")), false, "sem SEED_SECRET no servidor deve negar");
assert.equal(hasValidSeedSecret(req()), false);

process.env.SEED_SECRET = "segredo-teste";
assert.equal(hasValidSeedSecret(req()), false, "sem header deve negar");
assert.equal(hasValidSeedSecret(req("errado")), false);
assert.equal(hasValidSeedSecret(req("segredo-teste-")), false, "tamanho diferente nega");
assert.equal(hasValidSeedSecret(req("segredo-teste")), true);
assert.equal(requireSeedSecret(req("segredo-teste")), null);
assert.equal(requireSeedSecret(req("errado"))?.status, 401);
console.log("seed-secret: OK");
