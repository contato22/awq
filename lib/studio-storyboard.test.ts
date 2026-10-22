import assert from "node:assert/strict";
import { test } from "node:test";
import { csvDoStoryboard } from "./studio-storyboard";
import type { ShotEstudio } from "./studio-store";

const shot = (parcial: Partial<ShotEstudio>): ShotEstudio => ({
  id: "s",
  nome: "Plano",
  nota: "nota",
  lenteMm: 50,
  sensor: "super35",
  aspecto: "16:9",
  fovVertical: 15.9,
  png: "data:image/png;base64,aa",
  criadoEm: "2026-10-20T21:00:00.000Z",
  ...parcial,
});

test("o CSV escapa aspas e não embute o PNG", () => {
  const csv = csvDoStoryboard([
    shot({ nome: 'Close "A"', nota: "key, fill" }),
    shot({ nome: "B", lenteMm: 85, aspecto: "2.39", fovVertical: 11.9 }),
  ]);
  assert.ok(csv.startsWith("nome,nota,lente_mm,sensor,aspecto,fov_vertical,criado_em\n"));
  assert.match(csv, /"Close ""A"""/);
  assert.match(csv, /"key, fill"/);
  assert.match(csv, /,85,/);
  assert.equal(csv.includes("base64"), false);
});

test("o CSV neutraliza fórmula no começo da célula", () => {
  const csv = csvDoStoryboard([
    shot({ nome: "=cmd|'/c calc'!A1", nota: "+soma" }),
    shot({ nome: "-1", nota: "@risco" }),
  ]);
  assert.match(csv, /"'=cmd\|'\/c calc'!A1"/);
  assert.match(csv, /"'\+soma"/);
  assert.match(csv, /"'-1"/);
  assert.match(csv, /"'@risco"/);
});
