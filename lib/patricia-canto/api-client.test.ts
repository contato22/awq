import assert from "node:assert/strict";
import { test } from "node:test";
import type { BusinessUnit } from "./business-units";
import type { CaseItem } from "./cases";
import type { Lancamento } from "./financeiro";
import type { Lead } from "./leads";
import { pcApi } from "./api-client";

const IDS = ["id com espaço", "ação", "100%", "a/b"] as const;

async function requestedUrl(run: () => Promise<unknown>): Promise<string> {
  const previous = globalThis.fetch;
  let url = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = previous;
  }
  return url;
}

test("id path segments are encodeURIComponent, including space, accent, % and /", async () => {
  for (const id of IDS) {
    const encoded = encodeURIComponent(id);
    assert.equal(encoded.includes("/"), false, id);
    assert.notEqual(encoded, id);

    const calls: Array<[string, () => Promise<unknown>]> = [
      [`/api/patricia-canto/leads/${encoded}`, () => pcApi.updateLead({ id } as Lead)],
      [`/api/patricia-canto/leads/${encoded}`, () => pcApi.deleteLead(id)],
      [`/api/patricia-canto/cases/${encoded}`, () => pcApi.updateCase({ id } as CaseItem)],
      [`/api/patricia-canto/cases/${encoded}`, () => pcApi.deleteCase(id)],
      [`/api/patricia-canto/lancamentos/${encoded}`, () => pcApi.updateLancamento({ id } as Lancamento)],
      [`/api/patricia-canto/lancamentos/${encoded}`, () => pcApi.deleteLancamento(id)],
      [`/api/patricia-canto/business-units/${encoded}`, () => pcApi.updateBusinessUnit({ id } as BusinessUnit)],
      [`/api/patricia-canto/business-units/${encoded}`, () => pcApi.deleteBusinessUnit(id)],
    ];

    for (const [expected, run] of calls) {
      const url = await requestedUrl(run);
      assert.equal(url, expected, id);
    }
  }
});
