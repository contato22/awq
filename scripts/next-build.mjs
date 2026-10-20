/**
 * Wrapper de `next build`.
 *
 * STATIC_EXPORT=1 (GitHub Pages): `output: "export"` não serve
 * route handlers. `export const dynamic = "force-dynamic"` — exigido no SSR
 * para sessão, CRON_SECRET e PROBE_SECRET — derruba o collect de page data
 * (ex.: /api/balance-snapshots/backfill). Escondemos `app/api` só durante
 * esse build. O handler em si não muda.
 *
 * Deploy Vercel: vercel.json chama `next build` direto, sem este script.
 * `npm run build` sem STATIC_EXPORT (harness, vercel-deploy.yml) também
 * só delega para `next build`.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const stashRoot = path.join(root, ".static-export-stash");

/** Fora de `app/` e `pages/` — o scanner do Next não pode enxergar route.ts. */
const STASHES = [{ rel: "app/api", key: "app-api" }];

/** @type {{ from: string, to: string }[]} */
let active = [];

function recoverOrphans() {
  for (const { rel, key } of STASHES) {
    const abs = path.join(root, rel);
    const hidden = path.join(stashRoot, key);
    if (!existsSync(abs) && existsSync(hidden)) {
      mkdirSync(path.dirname(abs), { recursive: true });
      renameSync(hidden, abs);
      console.error(`Restaurado stash órfão: ${rel}`);
    }
  }
}

function stashAll() {
  mkdirSync(stashRoot, { recursive: true });
  for (const { rel, key } of STASHES) {
    const abs = path.join(root, rel);
    const hidden = path.join(stashRoot, key);
    if (!existsSync(abs)) continue;
    if (existsSync(hidden)) {
      throw new Error(`Stash já existe e o original também: ${hidden}`);
    }
    renameSync(abs, hidden);
    active.push({ from: hidden, to: abs });
  }
}

function restore() {
  const pending = active.splice(0).reverse();
  for (const item of pending) {
    if (!existsSync(item.from)) continue;
    if (existsSync(item.to)) {
      console.error(`Restore abortado; destino existe. Stash preservado em ${item.from}`);
      continue;
    }
    mkdirSync(path.dirname(item.to), { recursive: true });
    renameSync(item.from, item.to);
  }
  try {
    rmdirSync(stashRoot);
  } catch {
    // Ausente, ou ainda com arquivos se o restore não devolveu tudo.
  }
}

recoverOrphans();

const isStatic = process.env.STATIC_EXPORT === "1";
let code = 1;

function onSignal(sig) {
  restore();
  process.exit(sig === "SIGINT" ? 130 : 143);
}
process.on("SIGINT", () => onSignal("SIGINT"));
process.on("SIGTERM", () => onSignal("SIGTERM"));

try {
  if (isStatic) {
    console.log("STATIC_EXPORT=1: omitindo app/api do export estático. As rotas seguem no deploy Vercel.");
    stashAll();
  }
  const result = spawnSync(process.execPath, [nextBin, "build", ...process.argv.slice(2)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error);
    code = 1;
  } else {
    code = result.status === null ? 1 : result.status;
  }
} finally {
  restore();
}

process.exit(code);
