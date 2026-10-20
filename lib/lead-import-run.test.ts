import assert from "node:assert/strict";
import { test } from "node:test";
import { LEAD_CSV_TEMPLATE } from "./lead-csv";
import { runLeadImport } from "./lead-import-run";
import { isLeadImportPersistEnabled, type LeadImportStore } from "./lead-import-store";

const NOW = new Date("2026-10-20T12:00:00Z");

test("persist flag is on only for the exact value 1", () => {
  assert.equal(isLeadImportPersistEnabled({}), false);
  assert.equal(isLeadImportPersistEnabled({ LEAD_IMPORT_PERSIST: "true" }), false);
  assert.equal(isLeadImportPersistEnabled({ LEAD_IMPORT_PERSIST: "1" }), true);
});

test("without a store, validation succeeds and nothing is saved", async () => {
  const report = await runLeadImport(LEAD_CSV_TEMPLATE, { now: NOW }, null);
  assert.equal(report.persistence, "off");
  assert.equal(report.saved, 0);
  assert.equal(report.valid, 1);
  assert.equal(report.errors, 0);
  assert.equal(report.results[0]?.success, true);
  assert.equal(report.results[0]?.persisted, false);
  assert.equal(report.results[0]?.score, 90);
});

test("a store receives only valid rows", async () => {
  const saved: string[] = [];
  const store: LeadImportStore = {
    async save(lead) {
      saved.push(lead.email);
      return { lead_id: `id-${saved.length}` };
    },
  };
  const csv = [
    "nome,empresa,email",
    "Ana,Acme,ana@acme.com",
    "Sem,Email,",
    "Lia,Beta,lia@beta.com",
  ].join("\n");
  const report = await runLeadImport(csv, { now: NOW }, store);
  assert.deepEqual(saved, ["ana@acme.com", "lia@beta.com"]);
  assert.equal(report.persistence, "on");
  assert.equal(report.saved, 2);
  assert.equal(report.errors, 1);
  assert.equal(report.results[1]?.success, false);
  assert.equal(report.results[0]?.persisted, true);
  assert.equal(report.results[2]?.persisted, true);
});

test("a store failure stays on that row and does not stop the next one", async () => {
  let calls = 0;
  const store: LeadImportStore = {
    async save() {
      calls += 1;
      if (calls === 1) throw new Error("banco indisponível");
      return { lead_id: "ok" };
    },
  };
  const csv = [
    "nome,empresa,email",
    "Ana,Acme,ana@acme.com",
    "Lia,Beta,lia@beta.com",
  ].join("\n");
  const report = await runLeadImport(csv, { now: NOW }, store);
  assert.equal(calls, 2);
  assert.equal(report.saved, 1);
  assert.equal(report.results[0]?.error, "banco indisponível");
  assert.equal(report.results[1]?.persisted, true);
});

test("file errors never call the store", async () => {
  let calls = 0;
  const store: LeadImportStore = {
    async save() {
      calls += 1;
      return { lead_id: "nope" };
    },
  };
  const report = await runLeadImport("foo,bar\n1,2", { now: NOW }, store);
  assert.equal(calls, 0);
  assert.equal(report.saved, 0);
  assert.match(report.fileErrors[0] ?? "", /colunas obrigatórias/);
});
