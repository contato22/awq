// Testa lib/cron-auth.ts: produção falha fechada; dev sem segredo libera.
import assert from "node:assert";
import { NextRequest } from "next/server";
import { isCronAuthorized, requireCronSecret } from "../lib/cron-auth";

const req = (auth?: string) => new NextRequest("http://x/api/cron", { headers: auth ? { authorization: auth } : {} });
const env = process.env as Record<string, string | undefined>;

env.NODE_ENV = "production"; delete env.CRON_SECRET;
assert.equal(isCronAuthorized(req()), false, "produção sem CRON_SECRET deve negar");
assert.equal(isCronAuthorized(req("Bearer x")), false);

env.CRON_SECRET = "cron-teste";
assert.equal(isCronAuthorized(req()), false);
assert.equal(isCronAuthorized(req("Bearer errado")), false);
assert.equal(isCronAuthorized(req("Bearer cron-teste")), true);
assert.equal(requireCronSecret(req("Bearer cron-teste")), null);
assert.equal(requireCronSecret(req())?.status, 401);

env.NODE_ENV = "development"; delete env.CRON_SECRET;
assert.equal(isCronAuthorized(req()), true, "dev local sem segredo libera");
console.log("cron-auth: OK");
