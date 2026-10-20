import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LEAD_CSV_TEMPLATE,
  bantScore,
  parseLeadCsv,
} from "./lead-csv";

const NOW = new Date("2026-10-20T12:00:00Z");

const HEADER = "nome,empresa,email,telefone,cargo,bu,fonte,budget,necessidade,timeline,decisor,responsavel,notas";

function csv(lines: string[]): string {
  return [HEADER, ...lines].join("\n");
}

function line(values: string[]): string {
  return values.map((value) => (
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  )).join(",");
}

test("template row maps columns and scores BANT", () => {
  const result = parseLeadCsv(LEAD_CSV_TEMPLATE, { now: NOW });
  assert.deepEqual(result.fileErrors, []);
  assert.equal(result.rows.length, 1);
  const row = result.rows[0];
  assert.equal(row.ok, true);
  assert.equal(row.lead?.contact_name, "Ana Souza");
  assert.equal(row.lead?.company_name, "Acme Ltda");
  assert.equal(row.lead?.email, "ana@acme.com.br");
  assert.equal(row.lead?.bu, "JACQES");
  assert.equal(row.lead?.lead_source, "inbound");
  assert.equal(row.lead?.bant_budget, 50000);
  assert.equal(row.lead?.bant_need, "high");
  assert.equal(row.lead?.bant_authority, true);
  assert.equal(row.lead?.bant_timeline, "2026-11-01");
  assert.equal(row.lead?.assigned_to, "Miguel");
  assert.equal(row.lead?.lead_score, 90);
});

test("english headers and semicolon files map to the same fields", () => {
  const text = [
    "name;company;email;phone;source;budget;need;authority",
    "Rafael;Tech Solutions;rafael@tech.com;11999990000;referral;20000;medium;yes",
  ].join("\n");
  const result = parseLeadCsv(text, { now: NOW, defaultBu: "CAZA" });
  assert.deepEqual(result.fileErrors, []);
  const lead = result.rows[0]?.lead;
  assert.equal(lead?.contact_name, "Rafael");
  assert.equal(lead?.company_name, "Tech Solutions");
  assert.equal(lead?.bu, "CAZA");
  assert.equal(lead?.lead_source, "referral");
  assert.equal(lead?.bant_need, "medium");
  assert.equal(lead?.bant_authority, true);
  assert.equal(lead?.bant_budget, 20000);
  assert.equal(lead?.lead_score, 20 + 15 + 20);
});

test("quoted commas and escaped quotes stay inside the company name", () => {
  const text = csv([
    'Lia,"Acme, ""Filial"" Ltda",lia@acme.com',
  ]);
  const result = parseLeadCsv(text, { now: NOW });
  assert.equal(result.rows[0]?.ok, true);
  assert.equal(result.rows[0]?.lead?.company_name, 'Acme, "Filial" Ltda');
});

test("crlf, blank lines and a BOM do not shift row numbers", () => {
  const text = `\uFEFF${HEADER}\r\n\r\nAna,Acme,ana@acme.com\r\n`;
  const result = parseLeadCsv(text, { now: NOW });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.row, 3);
  assert.equal(result.rows[0]?.ok, true);
});

test("a bad row is reported and a valid sibling is kept", () => {
  const text = csv([
    "Ana,Acme,ana@acme.com",
    "Sem Email,Beta,",
    "email-ruim,Gama,nao-e-email",
  ]);
  const result = parseLeadCsv(text, { now: NOW });
  assert.equal(result.rows[0]?.ok, true);
  assert.equal(result.rows[1]?.ok, false);
  assert.match(result.rows[1]?.errors.join(" ") ?? "", /e-mail obrigatório/);
  assert.match(result.rows[2]?.errors.join(" ") ?? "", /e-mail inválido/);
});

test("explicit invalid BU is not replaced by the default", () => {
  const text = csv(["Ana,Acme,ana@acme.com,,,ENRD"]);
  const result = parseLeadCsv(text, { now: NOW, defaultBu: "JACQES" });
  assert.equal(result.rows[0]?.ok, false);
  assert.match(result.rows[0]?.errors.join(" ") ?? "", /BU inválida/);
});

test("empty BU uses the default and a forced BU rejects other units", () => {
  const open = parseLeadCsv(csv(["Ana,Acme,ana@acme.com"]), { now: NOW, defaultBu: "VENTURE" });
  assert.equal(open.rows[0]?.lead?.bu, "VENTURE");

  const locked = parseLeadCsv(csv(["Ana,Acme,ana@acme.com,,,CAZA"]), {
    now: NOW,
    forcedBu: "JACQES",
  });
  assert.equal(locked.rows[0]?.ok, false);
  assert.match(locked.rows[0]?.errors.join(" ") ?? "", /fora do seu acesso/);
});

test("portuguese aliases fill BANT and a brazilian budget parses", () => {
  const text = csv([
    line(["Ana", "Acme", "ana@acme.com", "", "", "", "organico", "50.000,50", "média", "", "não"]),
  ]);
  const result = parseLeadCsv(text, { now: NOW });
  const lead = result.rows[0]?.lead;
  assert.equal(result.rows[0]?.ok, true);
  assert.equal(lead?.lead_source, "organic");
  assert.equal(lead?.bant_budget, 50000.5);
  assert.equal(lead?.bant_need, "medium");
  assert.equal(lead?.bant_authority, false);
});

test("rejects formula injection, bad dates and duplicate emails", () => {
  const text = csv([
    line(["=cmd", "Acme", "ana@acme.com"]),
    line(["Lia", "Beta", "lia@beta.com", "", "", "", "", "", "", "2026-02-31"]),
    line(["Lia", "Beta", "lia@beta.com"]),
  ]);
  const result = parseLeadCsv(text, { now: NOW });
  assert.match(result.rows[0]?.errors.join(" ") ?? "", /fórmula/);
  assert.match(result.rows[1]?.errors.join(" ") ?? "", /timeline inválida/);
  assert.match(result.rows[2]?.errors.join(" ") ?? "", /repetido/);
});

test("phone may start with + and notes may not start with =", () => {
  const text = csv([line(["Ana", "Acme", "ana@acme.com", "+55 11 99999-0000"])]);
  const ok = parseLeadCsv(text, { now: NOW });
  assert.equal(ok.rows[0]?.lead?.phone, "+55 11 99999-0000");

  const notes = csv([
    line(["Ana", "Acme", "ana@acme.com", "", "", "", "", "", "", "", "", "", "=HYPERLINK()"]),
  ]);
  const bad = parseLeadCsv(notes, { now: NOW });
  assert.match(bad.rows[0]?.errors.join(" ") ?? "", /notas parece fórmula/);
});

test("file-level errors cover empty input, missing columns and the row cap", () => {
  assert.match(parseLeadCsv("   ").fileErrors[0] ?? "", /vazio/);
  assert.match(parseLeadCsv("foo,bar\n1,2").fileErrors[0] ?? "", /colunas obrigatórias/);
  assert.match(parseLeadCsv(`${HEADER}\n`).fileErrors[0] ?? "", /Nenhuma linha/);
  const huge = [HEADER, ...Array.from({ length: 3 }, (_, i) => `A${i},C${i},a${i}@x.com`)].join("\n");
  assert.match(parseLeadCsv(huge, { maxRows: 2 }).fileErrors[0] ?? "", /máximo é 2/);
});

test("outbound is not a stored source and an unknown need fails the row", () => {
  const text = csv(["Ana,Acme,ana@acme.com,,,,outbound,,urgente"]);
  const result = parseLeadCsv(text, { now: NOW });
  const message = result.rows[0]?.errors.join(" ") ?? "";
  assert.match(message, /fonte inválida/);
  assert.match(message, /necessidade inválida/);
});

test("bant score bands follow budget, authority, need and timeline", () => {
  assert.equal(bantScore({ budget: 0, authority: false, need: null, timeline: null }, NOW), 0);
  assert.equal(bantScore({ budget: 10000, authority: false, need: "low", timeline: "2026-12-01" }, NOW), 10 + 5 + 10);
  assert.equal(bantScore({ budget: 50000, authority: true, need: "high", timeline: "2026-10-25" }, NOW), 90);
  assert.equal(bantScore({ budget: 9999, authority: false, need: null, timeline: "2027-06-01" }, NOW), 0);
});
