/**
 * Ledger de migrações do ERP.
 *
 * Cada arquivo entra no máximo uma vez em public.erp_schema_migrations,
 * com nome relativo e SHA-256. Baseline grava as linhas e não executa SQL.
 * Sem a linha em public.erp_schema_migration_state, migrate recusa.
 *
 * Host que não seja localhost exige MIGRATE_ALLOW_REMOTE=1. O workflow de
 * produção define isso. Um agente local não deve definir.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const CONFIRM_BASELINE = "REGISTRAR_BASELINE_SEM_EXECUTAR";
export const CONFIRM_MIGRATE = "APLICAR_PENDENTES";

export const EXIT = {
  OK: 0,
  CHECKSUM: 1,
  USAGE: 2,
  NO_BASELINE: 3,
  BLOCKED: 4,
  SQL: 5,
};

const DESTRUCTIVE_RULES = [
  ["drop_table", /\bDROP\s+TABLE\b/i],
  ["drop_schema", /\bDROP\s+SCHEMA\b/i],
  ["drop_database", /\bDROP\s+DATABASE\b/i],
  ["truncate", /\bTRUNCATE\b/i],
  ["delete_from", /\bDELETE\s+FROM\b/i],
  ["drop_column", /\bDROP\s+COLUMN\b/i],
];

const MARKER_DESTRUCTIVE = /^\s*--[ \t]*erp-migrate:[ \t]*allow-destructive[ \t]*$/im;
const MARKER_NO_TX = /^\s*--[ \t]*erp-migrate:[ \t]*no-transaction[ \t]*$/im;
const CONCURRENT_OR_VACUUM =
  /\b(?:CREATE|DROP|REINDEX)\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b|\bVACUUM\b/i;

const ADVISORY_XACT_LOCK =
  "pg_advisory_xact_lock(hashtext('awq.erp_schema_migrations')::bigint)";

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Remove comentários `--` e bloco. Mantém literais e dollar-quotes para que
 * SQL dinâmico (EXECUTE '...DROP TABLE...') ainda conte como destrutivo.
 */
export function stripSqlComments(sql) {
  let out = "";
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === "-" && next === "-") {
      i += 2;
      while (i < n && sql[i] !== "\n") i += 1;
      out += " ";
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i += 1;
      i = Math.min(n, i + 2);
      out += " ";
      continue;
    }
    if (c === "'") {
      out += c;
      i += 1;
      while (i < n) {
        out += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            out += sql[i + 1];
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (c === "$") {
      const match = sql.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (match) {
        const tag = match[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) {
          out += sql.slice(i);
          break;
        }
        out += sql.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }
    out += c;
    i += 1;
  }
  return out;
}

/** Comentários, literais e corpos dollar-quoted viram espaço. */
export function stripSqlNoise(sql) {
  let out = "";
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === "-" && next === "-") {
      i += 2;
      while (i < n && sql[i] !== "\n") i += 1;
      out += " ";
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i += 1;
      i = Math.min(n, i + 2);
      out += " ";
      continue;
    }
    if (c === "'") {
      i += 1;
      while (i < n) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      out += " ";
      continue;
    }
    if (c === "$") {
      const match = sql.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (match) {
        const tag = match[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) break;
        i = end + tag.length;
        out += " ";
        continue;
      }
    }
    out += c;
    i += 1;
  }
  return out;
}

export function classifySql(sql) {
  const visible = stripSqlComments(sql);
  const reasons = [];
  for (const [id, re] of DESTRUCTIVE_RULES) {
    if (re.test(visible)) reasons.push(id);
  }
  const structural = stripSqlNoise(sql);
  const transactionControl = /\b(?:BEGIN|COMMIT|ROLLBACK)\b/i.test(structural);
  const concurrent = CONCURRENT_OR_VACUUM.test(visible);
  const noTxMarker = MARKER_NO_TX.test(sql);
  return {
    destructive: reasons.length > 0,
    reasons,
    marked: MARKER_DESTRUCTIVE.test(sql),
    transactionControl,
    transactional: !noTxMarker && !concurrent && !transactionControl,
    noTxMarker,
    concurrent,
  };
}

export function assertDatabaseHost(databaseUrl, allowRemote) {
  let host;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    const error = new Error("MIGRATE_DATABASE_URL inválida.");
    error.exitCode = EXIT.USAGE;
    throw error;
  }
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local && !allowRemote) {
    const error = new Error(
      `Host "${host}" recusado. Baseline e migrate de produção só rodam no workflow, com MIGRATE_ALLOW_REMOTE=1. Nada foi conectado.`,
    );
    error.exitCode = EXIT.USAGE;
    throw error;
  }
}

export function discoverFiles({ root, dir, files, includeSchema }) {
  if (files && files.length > 0) {
    return files.map((file) => path.resolve(root, file));
  }
  if (dir) {
    const absDir = path.resolve(root, dir);
    return fs
      .readdirSync(absDir)
      .filter((name) => name.endsWith(".sql") && !name.startsWith("_"))
      .sort()
      .map((name) => path.join(absDir, name));
  }
  const found = [];
  if (includeSchema) {
    const schema = path.join(root, "awq_erp_full_schema.sql");
    if (fs.existsSync(schema)) found.push(schema);
  }
  const migDir = path.join(root, "supabase", "migrations");
  if (!fs.existsSync(migDir)) {
    const error = new Error(`Diretório de migrações ausente: ${migDir}`);
    error.exitCode = EXIT.USAGE;
    throw error;
  }
  const names = fs
    .readdirSync(migDir)
    .filter((name) => name.endsWith(".sql") && !name.startsWith("_"))
    .sort();
  for (const name of names) found.push(path.join(migDir, name));
  return found;
}

function relativeName(root, file) {
  const rel = path.relative(root, path.resolve(file));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    const error = new Error(`Arquivo fora do root: ${file}`);
    error.exitCode = EXIT.USAGE;
    throw error;
  }
  return rel.split(path.sep).join("/");
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function psqlPath(file) {
  if (file.includes("'") || file.includes("\n")) {
    const error = new Error(`Caminho de migração não suportado: ${file}`);
    error.exitCode = EXIT.USAGE;
    throw error;
  }
  return `'${file}'`;
}

function redact(text, databaseUrl) {
  if (!text) return "";
  let out = String(text);
  if (databaseUrl) {
    out = out.split(databaseUrl).join("[redacted]");
    try {
      const url = new URL(databaseUrl);
      if (url.password) out = out.split(decodeURIComponent(url.password)).join("***");
      if (url.password) out = out.split(url.password).join("***");
    } catch {
      /* URL inválida já foi recusada antes do psql. */
    }
  }
  return out;
}

function runPsql(databaseUrl, script, { tuplesOnly = false } = {}) {
  const args = ["-X", "-v", "ON_ERROR_STOP=1"];
  if (tuplesOnly) args.push("-tA");
  args.push("-f", "-", databaseUrl);
  const result = spawnSync("psql", args, {
    input: script,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    const error = new Error(
      result.error.code === "ENOENT"
        ? "psql não está instalado."
        : redact(result.error.message, databaseUrl),
    );
    error.exitCode = result.error.code === "ENOENT" ? EXIT.USAGE : EXIT.SQL;
    throw error;
  }
  const stdout = redact(result.stdout, databaseUrl);
  const stderr = redact(result.stderr, databaseUrl);
  if (result.status !== 0) {
    const error = new Error((stderr || stdout || `psql saiu com código ${result.status}`).trim());
    error.exitCode = EXIT.SQL;
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  }
  return { stdout, stderr };
}

function readJsonLine(databaseUrl, script) {
  const { stdout } = runPsql(databaseUrl, script, { tuplesOnly: true });
  const line = stdout
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith("{") || item.startsWith("["));
  if (!line) return null;
  return JSON.parse(line);
}

function readDatabase(databaseUrl) {
  const flags = readJsonLine(
    databaseUrl,
    `
SET default_transaction_read_only = on;
SELECT json_build_object(
  'has_state', to_regclass('public.erp_schema_migration_state') IS NOT NULL,
  'has_ledger', to_regclass('public.erp_schema_migrations') IS NOT NULL,
  'has_bank', to_regclass('public.bank_transactions') IS NOT NULL
);
`,
  );
  const snapshot = {
    hasState: Boolean(flags?.has_state),
    hasLedger: Boolean(flags?.has_ledger),
    hasBank: Boolean(flags?.has_bank),
    baseline: null,
    rows: [],
  };
  if (snapshot.hasState) {
    const baseline = readJsonLine(
      databaseUrl,
      `
SET default_transaction_read_only = on;
SELECT json_build_object(
  'baselined_at', baselined_at,
  'baselined_by', baselined_by,
  'file_count', file_count
)
FROM public.erp_schema_migration_state
WHERE id = 1;
`,
    );
    snapshot.baseline = baseline;
  }
  if (snapshot.hasLedger) {
    const rows = readJsonLine(
      databaseUrl,
      `
SET default_transaction_read_only = on;
SELECT coalesce(json_agg(json_build_object(
  'filename', filename,
  'checksum', checksum,
  'source', source
) ORDER BY filename), '[]'::json)
FROM public.erp_schema_migrations;
`,
    );
    snapshot.rows = Array.isArray(rows) ? rows : [];
  }
  return snapshot;
}

function loadMigrations(root, absolutePaths) {
  const seen = new Set();
  return absolutePaths.map((absolutePath) => {
    const filename = relativeName(root, absolutePath);
    if (seen.has(filename)) {
      const error = new Error(`Nome de migração duplicado: ${filename}`);
      error.exitCode = EXIT.USAGE;
      throw error;
    }
    seen.add(filename);
    const bytes = fs.readFileSync(absolutePath);
    const sql = bytes.toString("utf8");
    return {
      filename,
      absolutePath,
      checksum: sha256(bytes),
      classification: classifySql(sql),
    };
  });
}

function checksumOnDisk(root, filename) {
  const absolutePath = path.join(root, filename);
  if (!fs.existsSync(absolutePath)) return null;
  return sha256(fs.readFileSync(absolutePath));
}

function auditLedger(root, files, rows) {
  const issues = [];
  const byFile = new Map(files.map((file) => [file.filename, file]));
  for (const row of rows) {
    const current = byFile.get(row.filename);
    const actual = current ? current.checksum : checksumOnDisk(root, row.filename);
    if (actual == null) {
      issues.push({ type: "missing", filename: row.filename });
    } else if (actual !== row.checksum) {
      issues.push({
        type: "mismatch",
        filename: row.filename,
        expected: row.checksum,
        actual,
      });
    }
  }
  return issues;
}

function decorate(files, rows, allowDestructive) {
  const ledger = new Map(rows.map((row) => [row.filename, row]));
  return files.map((file) => {
    const row = ledger.get(file.filename) || null;
    if (row && row.checksum !== file.checksum) {
      return { ...file, status: "mismatch", ledger: row };
    }
    if (row) return { ...file, status: "applied", ledger: row };
    const blocked = migrationBlocked(file, allowDestructive);
    return { ...file, status: blocked ? "blocked" : "pending", ledger: null };
  });
}

function migrationBlocked(file, allowDestructive) {
  const { classification } = file;
  if (classification.transactionControl && !classification.noTxMarker) return true;
  if (classification.destructive && !(classification.marked && allowDestructive)) return true;
  return false;
}

function blockReason(file, allowDestructive) {
  const { classification } = file;
  if (classification.transactionControl && !classification.noTxMarker) {
    return "BEGIN/COMMIT/ROLLBACK fora de função; marque -- erp-migrate: no-transaction se for intencional";
  }
  if (!classification.destructive) return "";
  const why = classification.reasons.join(",");
  if (!classification.marked) return `${why}; sem -- erp-migrate: allow-destructive`;
  if (!allowDestructive) return `${why}; marcação presente, falta --allow-destructive`;
  return why;
}

function ledgerDdl() {
  return `
CREATE TABLE IF NOT EXISTS public.erp_schema_migrations (
  filename text PRIMARY KEY,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('baseline', 'apply')),
  applied_by text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.erp_schema_migration_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  baselined_at timestamptz NOT NULL DEFAULT now(),
  baselined_by text NOT NULL,
  file_count integer NOT NULL CHECK (file_count >= 0)
);
COMMENT ON TABLE public.erp_schema_migrations IS
  'Ledger de scripts/erp-migrate.mjs. source=baseline registra sem executar o arquivo.';
REVOKE ALL ON TABLE public.erp_schema_migrations FROM PUBLIC;
REVOKE ALL ON TABLE public.erp_schema_migration_state FROM PUBLIC;
ALTER TABLE public.erp_schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_schema_migration_state ENABLE ROW LEVEL SECURITY;
DO $erp_migrate_privs$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.erp_schema_migrations FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE public.erp_schema_migration_state FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.erp_schema_migrations FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE public.erp_schema_migration_state FROM authenticated';
  END IF;
END
$erp_migrate_privs$;
`;
}

function formatPlan(plan, allowDestructive) {
  return plan.map((file) => {
    const short = file.checksum.slice(0, 12);
    if (file.status === "applied") {
      return `${file.filename}  aplicado  ${file.ledger.source}  ${short}`;
    }
    if (file.status === "mismatch") {
      return `${file.filename}  DIVERGENTE  ledger=${file.ledger.checksum.slice(0, 12)} disco=${short}`;
    }
    if (file.status === "blocked") {
      return `${file.filename}  BLOQUEADO  ${blockReason(file, allowDestructive)}`;
    }
    const tx = file.classification.transactional ? "transação" : "sem transação";
    return `${file.filename}  pendente  ${tx}  ${short}`;
  });
}

function summaryLine(command, snapshot, plan, issues) {
  const count = (status) => plan.filter((file) => file.status === status).length;
  return [
    "ERP_MIGRATE_SUMMARY",
    `command=${command}`,
    `baseline=${snapshot.baseline ? "presente" : "ausente"}`,
    `pending=${count("pending")}`,
    `applied=${count("applied")}`,
    `blocked=${count("blocked")}`,
    `mismatch=${issues.filter((issue) => issue.type === "mismatch").length + count("mismatch")}`,
    `missing=${issues.filter((issue) => issue.type === "missing").length}`,
  ].join(" ");
}

function result(exitCode, lines, extra = {}) {
  return { exitCode, lines, ...extra };
}

function fail(exitCode, lines) {
  return result(exitCode, lines);
}

export function run(options) {
  const command = options.command;
  if (command !== "dry-run" && command !== "baseline" && command !== "migrate") {
    return fail(EXIT.USAGE, [
      "Comando inválido. Use dry-run, baseline ou migrate.",
      "dry-run não escreve. baseline só registra. migrate aplica pendentes depois do baseline.",
    ]);
  }
  if (!options.databaseUrl) {
    return fail(EXIT.USAGE, ["Defina MIGRATE_DATABASE_URL ou --database-url. Nada foi conectado."]);
  }
  if (command === "baseline" && options.confirm !== CONFIRM_BASELINE) {
    return fail(EXIT.USAGE, [
      `Baseline recusado. Confirme com exatamente: ${CONFIRM_BASELINE}`,
      "Esse comando não executa SQL. Ele só grava nome e checksum dos arquivos atuais.",
    ]);
  }
  if (command === "migrate" && options.confirm !== CONFIRM_MIGRATE) {
    return fail(EXIT.USAGE, [
      `Migrate recusado. Confirme com exatamente: ${CONFIRM_MIGRATE}`,
      "Sem baseline prévio o migrate também recusa, mesmo com a frase certa.",
    ]);
  }

  try {
    assertDatabaseHost(options.databaseUrl, options.allowRemote);
  } catch (error) {
    return fail(error.exitCode || EXIT.USAGE, [error.message]);
  }

  const root = path.resolve(options.root || process.cwd());
  let files;
  try {
    const absolutePaths = discoverFiles({
      root,
      dir: options.dir || null,
      files: options.files || null,
      includeSchema: options.includeSchema !== false,
    });
    files = loadMigrations(root, absolutePaths);
  } catch (error) {
    return fail(error.exitCode || EXIT.USAGE, [error.message]);
  }
  if (files.length === 0) {
    return fail(EXIT.USAGE, ["Nenhum arquivo .sql para registrar. Nada foi escrito."]);
  }

  let snapshot;
  try {
    snapshot = readDatabase(options.databaseUrl);
  } catch (error) {
    return fail(error.exitCode || EXIT.SQL, [error.message]);
  }

  const issues = auditLedger(root, files, snapshot.rows);
  const plan = decorate(files, snapshot.rows, Boolean(options.allowDestructive));
  const lines = [
    summaryLine(command, snapshot, plan, issues),
    ...formatPlan(plan, Boolean(options.allowDestructive)),
    ...issues
      .filter((issue) => issue.type === "missing")
      .map((issue) => `${issue.filename}  AUSENTE no disco e presente no ledger`),
  ];

  if (issues.length > 0 || plan.some((file) => file.status === "mismatch")) {
    lines.push("Checksum divergente ou arquivo removido. Nada será aplicado. Não edite migração já registrada; crie outra.");
    return result(EXIT.CHECKSUM, lines, { plan, snapshot });
  }

  if (command === "dry-run") {
    if (!snapshot.baseline) {
      lines.push("migrate recusaria: não há baseline. Nenhum arquivo seria executado.");
    } else {
      const pending = plan.filter((file) => file.status === "pending").length;
      const blocked = plan.filter((file) => file.status === "blocked").length;
      lines.push(
        blocked > 0
          ? "migrate recusaria: há arquivo pendente bloqueado. Nenhum pendente seria executado."
          : `migrate aplicaria ${pending} arquivo(s) pendente(s).`,
      );
    }
    lines.push("dry-run não escreveu no banco.");
    return result(EXIT.OK, lines, { plan, snapshot });
  }

  if (command === "baseline") {
    if (options.files && options.files.length > 0) {
      return result(
        EXIT.USAGE,
        [
          ...lines,
          "Baseline parcial recusado. O baseline registra o conjunto inteiro, sem --files.",
        ],
        { plan, snapshot },
      );
    }
    if (snapshot.baseline) {
      return result(
        EXIT.NO_BASELINE,
        [
          ...lines,
          "Baseline já existe. Um segundo baseline não roda e não marca arquivo novo como aplicado.",
        ],
        { plan, snapshot },
      );
    }
    if (!snapshot.hasBank && !options.allowEmptyTarget) {
      return result(
        EXIT.USAGE,
        [
          ...lines,
          "Baseline recusado: public.bank_transactions não existe.",
          "Isso evita marcar um banco vazio como se o histórico já tivesse rodado.",
          "Em produção a tabela precisa existir. O workflow não passa --allow-empty-target.",
        ],
        { plan, snapshot },
      );
    }
    try {
      applyBaseline(options.databaseUrl, files, options.actor || "unknown");
    } catch (error) {
      lines.push(error.message);
      return result(error.exitCode || EXIT.SQL, lines, { plan, snapshot });
    }
    lines.push(
      `Baseline gravado para ${files.length} arquivo(s). Nenhum SQL de migração foi executado.`,
    );
    lines.push("Arquivos destrutivos foram só registrados. Eles não rodaram.");
    return result(EXIT.OK, lines, { plan, snapshot });
  }

  if (!snapshot.baseline) {
    lines.push("Recusado: baseline ausente. Registre o histórico com o comando baseline antes de qualquer migrate.");
    return result(EXIT.NO_BASELINE, lines, { plan, snapshot });
  }

  const blocked = plan.filter((file) => file.status === "blocked");
  if (blocked.length > 0) {
    lines.push("Recusado: arquivo destrutivo ou com controle de transação sem marcação explícita. Nada foi aplicado.");
    return result(EXIT.BLOCKED, lines, { plan, snapshot });
  }

  const pending = plan.filter((file) => file.status === "pending");
  if (pending.length === 0) {
    lines.push("Nada pendente. Nenhuma migração foi executada.");
    return result(EXIT.OK, lines, { plan, snapshot });
  }

  try {
    const applied = applyPending(options.databaseUrl, pending, options.actor || "unknown");
    lines.push(`Aplicados ${applied.length} arquivo(s): ${applied.join(", ") || "(nenhum)"}`);
    return result(EXIT.OK, lines, { plan, snapshot, applied });
  } catch (error) {
    lines.push(error.message);
    return result(error.exitCode || EXIT.SQL, lines, { plan, snapshot });
  }
}

function applyBaseline(databaseUrl, files, actor) {
  const inserts = files
    .map(
      (file) =>
        `INSERT INTO public.erp_schema_migrations (filename, checksum, source, applied_by) VALUES (${sqlLiteral(file.filename)}, ${sqlLiteral(file.checksum)}, 'baseline', ${sqlLiteral(actor)});`,
    )
    .join("\n");
  const script = `
\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '15s';
SET LOCAL search_path TO public;
SELECT ${ADVISORY_XACT_LOCK};
${ledgerDdl()}
DO $erp_migrate_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.erp_schema_migration_state WHERE id = 1) THEN
    RAISE EXCEPTION 'baseline já registrado';
  END IF;
  IF EXISTS (SELECT 1 FROM public.erp_schema_migrations) THEN
    RAISE EXCEPTION 'ledger já contém linhas';
  END IF;
END
$erp_migrate_guard$;
${inserts}
INSERT INTO public.erp_schema_migration_state (id, baselined_by, file_count)
VALUES (1, ${sqlLiteral(actor)}, ${files.length});
COMMIT;
`;
  try {
    runPsql(databaseUrl, script);
  } catch (error) {
    if (/baseline já registrado|ledger já contém linhas/.test(error.message)) {
      const wrapped = new Error("Baseline já existe. Um segundo baseline não roda e não marca arquivo novo.");
      wrapped.exitCode = EXIT.NO_BASELINE;
      throw wrapped;
    }
    throw error;
  }
}

function applyPending(databaseUrl, pending, actor) {
  const chunks = pending.map((file, index) => {
    const variable = `awq_erp_mig_skip_${index}`;
    if (!file.classification.transactional) {
      return `
SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END AS ${variable}
FROM public.erp_schema_migrations
WHERE filename = ${sqlLiteral(file.filename)}
\\gset
\\if :${variable}
\\echo ERP_MIGRATE_SKIP|${file.filename}
\\else
\\echo ERP_MIGRATE_APPLY|${file.filename}
SET search_path TO public;
\\i ${psqlPath(file.absolutePath)}
INSERT INTO public.erp_schema_migrations (filename, checksum, source, applied_by)
VALUES (${sqlLiteral(file.filename)}, ${sqlLiteral(file.checksum)}, 'apply', ${sqlLiteral(actor)});
\\echo ERP_MIGRATE_APPLIED|${file.filename}
\\endif
`;
    }
    return `
BEGIN;
SET LOCAL lock_timeout = '15s';
SET LOCAL search_path TO public;
SELECT ${ADVISORY_XACT_LOCK};
LOCK TABLE public.erp_schema_migrations IN SHARE ROW EXCLUSIVE MODE;
SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END AS ${variable}
FROM public.erp_schema_migrations
WHERE filename = ${sqlLiteral(file.filename)}
\\gset
\\if :${variable}
\\echo ERP_MIGRATE_SKIP|${file.filename}
ROLLBACK;
\\else
\\echo ERP_MIGRATE_APPLY|${file.filename}
\\i ${psqlPath(file.absolutePath)}
INSERT INTO public.erp_schema_migrations (filename, checksum, source, applied_by)
VALUES (${sqlLiteral(file.filename)}, ${sqlLiteral(file.checksum)}, 'apply', ${sqlLiteral(actor)});
COMMIT;
\\echo ERP_MIGRATE_APPLIED|${file.filename}
\\endif
`;
  });
  const script = `
\\set ON_ERROR_STOP on
${chunks.join("\n")}
`;
  const { stdout } = runPsql(databaseUrl, script);
  return stdout
    .split("\n")
    .filter((line) => line.startsWith("ERP_MIGRATE_APPLIED|"))
    .map((line) => line.slice("ERP_MIGRATE_APPLIED|".length).trim());
}

function defaultActor() {
  const who = process.env.GITHUB_ACTOR || process.env.USER || "unknown";
  const sha = process.env.GITHUB_SHA;
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo && sha) return `${who} ${repo}@${sha.slice(0, 12)}`.slice(0, 200);
  return String(who).slice(0, 200);
}

function parseArgs(argv) {
  const options = {
    command: null,
    databaseUrl: process.env.MIGRATE_DATABASE_URL || "",
    root: process.cwd(),
    dir: null,
    files: null,
    confirm: "",
    allowDestructive: process.env.MIGRATE_ALLOW_DESTRUCTIVE === "1",
    allowEmptyTarget: process.env.MIGRATE_ALLOW_EMPTY_TARGET === "1",
    allowRemote: process.env.MIGRATE_ALLOW_REMOTE === "1",
    includeSchema: true,
    actor: defaultActor(),
  };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--database-url") {
      options.databaseUrl = next;
      i += 1;
    } else if (arg === "--root") {
      options.root = next;
      i += 1;
    } else if (arg === "--dir") {
      options.dir = next;
      i += 1;
    } else if (arg === "--files") {
      options.files = String(next)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === "--confirm") {
      options.confirm = next;
      i += 1;
    } else if (arg === "--allow-destructive") {
      options.allowDestructive = true;
    } else if (arg === "--allow-empty-target") {
      options.allowEmptyTarget = true;
    } else if (arg === "--allow-remote") {
      options.allowRemote = true;
    } else if (arg === "--no-schema") {
      options.includeSchema = false;
    } else if (arg === "--help" || arg === "-h") {
      options.command = "help";
    } else {
      rest.push(arg);
    }
  }
  if (!options.command) options.command = rest[0] || "help";
  return options;
}

export function helpText() {
  return [
    "Uso: node scripts/erp-migrate.mjs <dry-run|baseline|migrate> [opções]",
    "",
    "  dry-run     lista o que migrate faria; não escreve",
    "  baseline    grava nome e checksum sem executar SQL",
    `              exige --confirm ${CONFIRM_BASELINE}`,
    "  migrate     aplica cada pendente no máximo uma vez, em transação",
    `              exige --confirm ${CONFIRM_MIGRATE} e um baseline já gravado`,
    "",
    "  --database-url URL     ou MIGRATE_DATABASE_URL",
    "  --root DIR             raiz do repositório (padrão: cwd)",
    "  --dir DIR              diretório de .sql em vez de supabase/migrations",
    "  --files a.sql,b.sql    lista explícita, relativa ao root",
    "  --allow-destructive    só executa destrutivo que tenha a marcação na primeira linha lógica",
    "  --allow-empty-target   só para teste local; o workflow de produção não usa",
    "  --no-schema            não inclui awq_erp_full_schema.sql",
    "",
    "Marcação no arquivo, em uma linha só:",
    "  -- erp-migrate: allow-destructive",
    "  -- erp-migrate: no-transaction",
    "",
    "Destrutivo: DROP TABLE, DROP SCHEMA, DROP DATABASE, TRUNCATE, DELETE FROM, DROP COLUMN.",
    "Arquivos _*.sql (atalho de conciliação) ficam fora do conjunto padrão.",
  ].join("\n");
}

export function runCli(argv) {
  const options = parseArgs(argv);
  if (options.command === "help") {
    console.log(helpText());
    return EXIT.OK;
  }
  const outcome = run(options);
  const stream = outcome.exitCode === EXIT.OK ? console.log : console.error;
  stream(outcome.lines.join("\n"));
  return outcome.exitCode;
}
