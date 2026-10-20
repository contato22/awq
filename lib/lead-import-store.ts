import type { LeadImportDraft } from "./lead-csv";

/** Writes one already-validated lead. The CSV parser never calls this. */
export interface LeadImportStore {
  save(lead: LeadImportDraft): Promise<{ lead_id: string }>;
}

export const LEAD_IMPORT_PERSIST_FLAG = "LEAD_IMPORT_PERSIST";

/**
 * Persistence is off unless LEAD_IMPORT_PERSIST=1.
 * The preview and unit tests validate CSV with no database.
 */
export function isLeadImportPersistEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[LEAD_IMPORT_PERSIST_FLAG] === "1";
}
