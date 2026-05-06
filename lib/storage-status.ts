// ─── AWQ Storage Status — server-only ────────────────────────────────────────
//
// Calculates current storage usage for micro (transactions) and macro
// (documents) data layers and returns a warning level for each.
//
// Limits are soft thresholds — the underlying backend may have different
// hard limits depending on the active adapter (filesystem JSON vs. Neon).

import fs from "fs";
import path from "path";
import { USE_DB } from "./db";

// ─── Limits ──────────────────────────────────────────────────────────────────

export const STORAGE_LIMITS = {
  macro: {
    // Maximum number of financial documents (PDF extratos)
    maxCount: 500,
    // Maximum JSON file size in bytes (filesystem adapter only)
    maxBytes: 5 * 1024 * 1024, // 5 MB
  },
  micro: {
    // Maximum number of bank transactions
    maxCount: 50_000,
    // Maximum JSON file size in bytes (filesystem adapter only)
    maxBytes: 20 * 1024 * 1024, // 20 MB
  },
};

const WARN_THRESHOLD  = 0.80; // 80%
const CRIT_THRESHOLD  = 0.95; // 95%

export type StorageLevel = "ok" | "warning" | "critical";

export interface StorageLayerStatus {
  count: number;
  maxCount: number;
  usedBytes: number | null;   // null when using DB adapter (no file to stat)
  maxBytes: number | null;
  pctCount: number;           // 0-100
  pctBytes: number | null;
  level: StorageLevel;
  label: string;              // "Documentos (macro)" | "Transações (micro)"
}

export interface StorageStatus {
  macro: StorageLayerStatus;
  micro: StorageLayerStatus;
  hasWarning: boolean;
  hasCritical: boolean;
}

function level(pct: number): StorageLevel {
  if (pct >= CRIT_THRESHOLD * 100) return "critical";
  if (pct >= WARN_THRESHOLD * 100) return "warning";
  return "ok";
}

function fileSizeBytes(filePath: string): number | null {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return null;
  }
}

function layerStatus(
  count: number,
  maxCount: number,
  filePath: string | null,
  maxBytes: number,
  label: string,
): StorageLayerStatus {
  const pctCount = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

  let usedBytes: number | null = null;
  let pctBytes: number | null = null;

  if (filePath) {
    usedBytes = fileSizeBytes(filePath);
    if (usedBytes !== null) {
      pctBytes = Math.round((usedBytes / maxBytes) * 100);
    }
  }

  // Use the higher of the two percentages to determine the warning level
  const effectivePct = Math.max(pctCount, pctBytes ?? 0);

  return {
    count,
    maxCount,
    usedBytes,
    maxBytes: filePath ? maxBytes : null,
    pctCount,
    pctBytes,
    level: level(effectivePct),
    label,
  };
}

export async function getStorageStatus(
  docCount: number,
  txnCount: number,
): Promise<StorageStatus> {
  const DATA_DIR  = path.join(process.cwd(), "public", "data", "financial");
  const docsFile  = USE_DB ? null : path.join(DATA_DIR, "documents.json");
  const txnsFile  = USE_DB ? null : path.join(DATA_DIR, "transactions.json");

  const macro = layerStatus(
    docCount,
    STORAGE_LIMITS.macro.maxCount,
    docsFile,
    STORAGE_LIMITS.macro.maxBytes,
    "Documentos (macro)",
  );

  const micro = layerStatus(
    txnCount,
    STORAGE_LIMITS.micro.maxCount,
    txnsFile,
    STORAGE_LIMITS.micro.maxBytes,
    "Transações (micro)",
  );

  return {
    macro,
    micro,
    hasWarning:  macro.level !== "ok" || micro.level !== "ok",
    hasCritical: macro.level === "critical" || micro.level === "critical",
  };
}
