import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  CONFIRM_BASELINE,
  CONFIRM_MIGRATE,
  EXIT,
  classifySql,
  discoverFiles,
  run,
} from "./erp-migrate-lib.mjs";

const DATABASE_URL = process.env.MIGRATE_DATABASE_URL;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO_ROOT, "scripts", "erp-migrate.mjs");

function psql(sql) {
  const result = spawnSync(
    "psql",
    ["-X", "-tA", "-v", "ON_ERROR_STOP=1", "-c", sql, DATABASE_URL],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql falhou");
  }
  return result.stdout.trim();
}

function resetDatabase() {
  psql(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
  `);
}

function writeDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "erp-mig-"));
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

function local(dir, extra = {}) {
  return {
    databaseUrl: DATABASE_URL,
    root: dir,
    dir,
    allowEmptyTarget: true,
    allowRemote: false,
    actor: "test",
    ...extra,
  };
}

describe("classificação e descoberta", () => {
  test("comentário não marca o arquivo; literal e DROP TABLE marcam", () => {
    const comment = classifySql("-- DROP TABLE public.money\nCREATE TABLE public.t (id int);\n");
    assert.equal(comment.destructive, false);

    const literal = classifySql("SELECT 'DROP TABLE public.money';\n");
    assert.equal(literal.destructive, true);
    assert.deepEqual(literal.reasons, ["drop_table"]);

    const real = classifySql("DROP TABLE IF EXISTS bank_transactions CASCADE;\n");
    assert.equal(real.marked, false);
    assert.ok(real.reasons.includes("drop_table"));
  });

  test("marcação explícita é uma linha inteira", () => {
    const marked = classifySql("-- erp-migrate: allow-destructive\nDROP TABLE public.t;\n");
    assert.equal(marked.marked, true);
    const buried = classifySql("SELECT 1; -- erp-migrate: allow-destructive\nDROP TABLE public.t;\n");
    assert.equal(buried.marked, false);
  });

  test("o diretório real só trata 001 como destrutivo e ignora o atalho", () => {
    const files = discoverFiles({ root: REPO_ROOT, includeSchema: true });
    const names = files.map((file) => path.relative(REPO_ROOT, file).split(path.sep).join("/"));
    assert.equal(names[0], "awq_erp_full_schema.sql");
    assert.ok(names.includes("supabase/migrations/001_initial_schema.sql"));
    assert.ok(names.includes("supabase/migrations/006_enrd_montagem.sql"));
    assert.ok(names.includes("supabase/migrations/006_live_shop.sql"));
    assert.ok(names.includes("supabase/migrations/007_enrd_posvenda.sql"));
    assert.ok(names.includes("supabase/migrations/007_live_shop_brands.sql"));
    assert.equal(names.some((name) => name.includes("_bootstrap")), false);
    const migrations = names.slice(1);
    assert.deepEqual(migrations, [...migrations].sort());

    const destructive = [];
    for (const file of files) {
      const info = classifySql(fs.readFileSync(file, "utf8"));
      if (info.destructive) destructive.push(path.basename(file));
      if (path.basename(file) === "001_initial_schema.sql") {
        assert.equal(info.marked, false);
        assert.ok(info.reasons.includes("drop_table"));
        assert.ok(info.reasons.includes("delete_from"));
      }
    }
    assert.deepEqual(destructive, ["001_initial_schema.sql"]);
  });
});

describe("ledger contra Postgres", () => {
  beforeEach(() => {
    if (!DATABASE_URL) {
      throw new Error("MIGRATE_DATABASE_URL é obrigatória.");
    }
    resetDatabase();
  });

  test("recusa host remoto sem conectar", () => {
    const outcome = run({
      command: "migrate",
      databaseUrl: "postgres://usuario:segredo@example.com:5432/postgres",
      confirm: CONFIRM_MIGRATE,
      root: REPO_ROOT,
      dir: REPO_ROOT,
    });
    assert.equal(outcome.exitCode, EXIT.USAGE);
    assert.match(outcome.lines.join("\n"), /recusado/);
    assert.equal(outcome.lines.join("\n").includes("segredo"), false);
  });

  test("confirmação errada não abre conexão", () => {
    const outcome = run({
      command: "baseline",
      databaseUrl: "postgres://migrate:migrate@127.0.0.1:1/migrate_ledger",
      confirm: "sim",
      root: REPO_ROOT,
      allowEmptyTarget: true,
    });
    assert.equal(outcome.exitCode, EXIT.USAGE);
    assert.match(outcome.lines.join("\n"), /REGISTRAR_BASELINE_SEM_EXECUTAR/);
    assert.equal(outcome.lines.join("\n").includes("ECONNREFUSED"), false);
  });

  test("migrate sem baseline não executa e dry-run não cria o ledger", () => {
    const dir = writeDir({
      "001_drop.sql": "DROP TABLE IF EXISTS public.bank_transactions;\n",
    });
    psql("CREATE TABLE public.bank_transactions (id int); INSERT INTO public.bank_transactions VALUES (7);");

    const migrate = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE, allowEmptyTarget: false }));
    assert.equal(migrate.exitCode, EXIT.NO_BASELINE);
    assert.equal(psql("SELECT id FROM public.bank_transactions"), "7");
    assert.equal(psql("SELECT COALESCE(to_regclass('public.erp_schema_migrations')::text, '')"), "");

    const dry = run(local(dir, { command: "dry-run", allowEmptyTarget: false }));
    assert.equal(dry.exitCode, EXIT.OK);
    assert.match(dry.lines.join("\n"), /baseline=ausente/);
    assert.match(dry.lines.join("\n"), /dry-run não escreveu/);
    assert.equal(psql("SELECT COALESCE(to_regclass('public.erp_schema_migration_state')::text, '')"), "");
    assert.equal(psql("SELECT id FROM public.bank_transactions"), "7");
  });

  test("baseline exige bank_transactions e não executa DROP", () => {
    const dir = writeDir({
      "001_drop.sql": [
        "DROP TABLE IF EXISTS public.bank_transactions;",
        "CREATE TABLE public.bank_transactions (id int);",
        "INSERT INTO public.bank_transactions VALUES (1);",
      ].join("\n"),
    });

    const refused = run(local(dir, { command: "baseline", confirm: CONFIRM_BASELINE, allowEmptyTarget: false }));
    assert.equal(refused.exitCode, EXIT.USAGE);
    assert.equal(psql("SELECT COALESCE(to_regclass('public.erp_schema_migrations')::text, '')"), "");

    psql("CREATE TABLE public.bank_transactions (id int PRIMARY KEY); INSERT INTO public.bank_transactions VALUES (42);");
    const recorded = run(local(dir, { command: "baseline", confirm: CONFIRM_BASELINE, allowEmptyTarget: false }));
    assert.equal(recorded.exitCode, EXIT.OK);
    assert.match(recorded.lines.join("\n"), /Nenhum SQL de migração foi executado/);
    assert.equal(psql("SELECT id FROM public.bank_transactions"), "42");
    assert.equal(
      psql("SELECT relrowsecurity::text FROM pg_class WHERE relname = 'erp_schema_migrations'"),
      "true",
    );
    assert.equal(
      psql("SELECT source || ':' || filename FROM public.erp_schema_migrations"),
      "baseline:001_drop.sql",
    );
    assert.equal(psql("SELECT file_count FROM public.erp_schema_migration_state"), "1");

    const again = run(local(dir, { command: "baseline", confirm: CONFIRM_BASELINE, allowEmptyTarget: false }));
    assert.equal(again.exitCode, EXIT.NO_BASELINE);
    assert.equal(psql("SELECT count(*) FROM public.erp_schema_migrations"), "1");
    assert.equal(psql("SELECT id FROM public.bank_transactions"), "42");
  });

  test("aplica uma vez, sobrevive a segunda corrida e falha se o checksum mudar", () => {
    const dir = writeDir({
      "000_noop.sql": "SELECT 1;\n",
    });
    assert.equal(run(local(dir, { command: "baseline", confirm: CONFIRM_BASELINE })).exitCode, EXIT.OK);

    fs.writeFileSync(
      path.join(dir, "001_money.sql"),
      [
        "CREATE TABLE public.money (id int PRIMARY KEY, amount int);",
        "INSERT INTO public.money VALUES (1, 100);",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(dir, "002_cast.sql"),
      [
        "-- LTV:CAC e 1:N não podem ser interpolados pelo psql",
        "CREATE TABLE public.casted (d date);",
        "INSERT INTO public.casted VALUES ('2026-01-02'::date);",
      ].join("\n"),
    );

    const dry = run(local(dir, { command: "dry-run" }));
    assert.equal(dry.exitCode, EXIT.OK);
    assert.match(dry.lines.join("\n"), /migrate aplicaria 2 arquivo/);
    assert.equal(psql("SELECT COALESCE(to_regclass('public.money')::text, '')"), "");

    const applied = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE }));
    assert.equal(applied.exitCode, EXIT.OK, applied.lines.join("\n"));
    assert.deepEqual(applied.applied, ["001_money.sql", "002_cast.sql"]);
    assert.equal(psql("SELECT amount FROM public.money"), "100");
    assert.equal(psql("SELECT d::text FROM public.casted"), "2026-01-02");

    psql("UPDATE public.money SET amount = 999 WHERE id = 1;");
    const second = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE }));
    assert.equal(second.exitCode, EXIT.OK, second.lines.join("\n"));
    assert.match(second.lines.join("\n"), /Nada pendente/);
    assert.equal(psql("SELECT amount FROM public.money"), "999");
    assert.equal(psql("SELECT count(*) FROM public.money"), "1");
    assert.equal(
      psql("SELECT count(*) FROM public.erp_schema_migrations WHERE filename = '001_money.sql' AND source = 'apply'"),
      "1",
    );

    fs.appendFileSync(path.join(dir, "001_money.sql"), "\n-- editado depois de aplicado\n");
    const drifted = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE }));
    assert.equal(drifted.exitCode, EXIT.CHECKSUM);
    assert.match(drifted.lines.join("\n"), /DIVERGENTE/);
    assert.equal(psql("SELECT amount FROM public.money"), "999");
    const dryDrift = run(local(dir, { command: "dry-run" }));
    assert.equal(dryDrift.exitCode, EXIT.CHECKSUM);
  });

  test("destrutivo sem marcação não roda; com marcação só roda com a flag", () => {
    const dir = writeDir({ "000_noop.sql": "SELECT 1;\n" });
    assert.equal(run(local(dir, { command: "baseline", confirm: CONFIRM_BASELINE })).exitCode, EXIT.OK);
    fs.writeFileSync(
      path.join(dir, "001_money.sql"),
      "CREATE TABLE public.money (id int PRIMARY KEY, amount int);\nINSERT INTO public.money VALUES (1, 50);\n",
    );
    assert.equal(
      run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE })).exitCode,
      EXIT.OK,
    );

    fs.writeFileSync(path.join(dir, "002_drop.sql"), "DROP TABLE public.money;\n");
    const blocked = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE }));
    assert.equal(blocked.exitCode, EXIT.BLOCKED);
    assert.equal(psql("SELECT amount FROM public.money"), "50");
    assert.equal(
      psql("SELECT count(*) FROM public.erp_schema_migrations WHERE filename = '002_drop.sql'"),
      "0",
    );

    fs.writeFileSync(
      path.join(dir, "002_drop.sql"),
      "-- erp-migrate: allow-destructive\nDROP TABLE public.money;\n",
    );
    const still = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE, allowDestructive: false }));
    assert.equal(still.exitCode, EXIT.BLOCKED);
    assert.equal(psql("SELECT amount FROM public.money"), "50");

    const dropped = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE, allowDestructive: true }));
    assert.equal(dropped.exitCode, EXIT.OK, dropped.lines.join("\n"));
    assert.equal(psql("SELECT COALESCE(to_regclass('public.money')::text, '')"), "");
    assert.equal(
      psql("SELECT source FROM public.erp_schema_migrations WHERE filename = '002_drop.sql'"),
      "apply",
    );
  });

  test("falha no meio da migração desfaz o arquivo e não grava o ledger", () => {
    const dir = writeDir({ "000_noop.sql": "SELECT 1;\n" });
    assert.equal(run(local(dir, { command: "baseline", confirm: CONFIRM_BASELINE })).exitCode, EXIT.OK);
    fs.writeFileSync(
      path.join(dir, "001_bad.sql"),
      "CREATE TABLE public.partial (id int);\nINSERT INTO public.partial VALUES (1);\nSELECT 1/0;\n",
    );
    const failed = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE }));
    assert.equal(failed.exitCode, EXIT.SQL);
    assert.equal(psql("SELECT COALESCE(to_regclass('public.partial')::text, '')"), "");
    assert.equal(
      psql("SELECT count(*) FROM public.erp_schema_migrations WHERE filename = '001_bad.sql'"),
      "0",
    );
  });

  test("arquivo anterior permanece quando o seguinte falha", () => {
    const dir = writeDir({ "000_noop.sql": "SELECT 1;\n" });
    assert.equal(run(local(dir, { command: "baseline", confirm: CONFIRM_BASELINE })).exitCode, EXIT.OK);
    fs.writeFileSync(path.join(dir, "001_ok.sql"), "CREATE TABLE public.step1 (id int);\nINSERT INTO public.step1 VALUES (1);\n");
    fs.writeFileSync(path.join(dir, "002_bad.sql"), "SELECT 1/0;\n");
    fs.writeFileSync(path.join(dir, "003_later.sql"), "CREATE TABLE public.step3 (id int);\n");
    const failed = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE }));
    assert.equal(failed.exitCode, EXIT.SQL);
    assert.equal(psql("SELECT id FROM public.step1"), "1");
    assert.equal(psql("SELECT COALESCE(to_regclass('public.step3')::text, '')"), "");
    assert.equal(
      psql("SELECT filename FROM public.erp_schema_migrations WHERE source = 'apply' ORDER BY filename"),
      "001_ok.sql",
    );
  });

  test("no-transaction aplica e grava; COMMIT solto é bloqueado", () => {
    const dir = writeDir({ "000_noop.sql": "SELECT 1;\n" });
    assert.equal(run(local(dir, { command: "baseline", confirm: CONFIRM_BASELINE })).exitCode, EXIT.OK);
    fs.writeFileSync(
      path.join(dir, "001_notx.sql"),
      "-- erp-migrate: no-transaction\nCREATE TABLE public.outside_tx (id int);\nINSERT INTO public.outside_tx VALUES (7);\n",
    );
    const applied = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE }));
    assert.equal(applied.exitCode, EXIT.OK, applied.lines.join("\n"));
    assert.equal(psql("SELECT id FROM public.outside_tx"), "7");

    fs.writeFileSync(path.join(dir, "002_commit.sql"), "COMMIT;\n");
    const blocked = run(local(dir, { command: "migrate", confirm: CONFIRM_MIGRATE }));
    assert.equal(blocked.exitCode, EXIT.BLOCKED);
    assert.match(blocked.lines.join("\n"), /COMMIT/);
    assert.equal(
      psql("SELECT count(*) FROM public.erp_schema_migrations WHERE filename = '002_commit.sql'"),
      "0",
    );
    assert.equal(psql("SELECT id FROM public.outside_tx"), "7");
  });

  test("CLI recusa host remoto", () => {
    const result = spawnSync(
      process.execPath,
      [
        CLI,
        "migrate",
        "--database-url",
        "postgres://usuario:segredo@example.com:5432/postgres",
        "--confirm",
        CONFIRM_MIGRATE,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, EXIT.USAGE);
    assert.match(`${result.stdout}\n${result.stderr}`, /recusado/);
    assert.equal(`${result.stdout}\n${result.stderr}`.includes("segredo"), false);
  });
});
