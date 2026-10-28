// Testa lib/erp-route.ts: config ausente → 503; erro comum → 500 JSON; sucesso passa.
import assert from "node:assert";
import { withErpErrors } from "../lib/erp-route";

(async () => {
  const cfg = await withErpErrors(async () => { throw new Error("Missing NEXT_PUBLIC_ERP_SUPABASE_URL or ERP_SUPABASE_SERVICE_ROLE_KEY (server-only)."); })();
  assert.equal(cfg.status, 503);
  assert.equal((await cfg.json()).configured, false);

  const other = await withErpErrors(async () => { throw new Error("boom"); })();
  assert.equal(other.status, 500);
  assert.equal((await other.json()).error, "boom");

  const okRes = await withErpErrors(async (x: number) => new Response(String(x), { status: 200 }))(7);
  assert.equal(okRes.status, 200); assert.equal(await okRes.text(), "7");
  console.log("erp-route: OK");
})();
