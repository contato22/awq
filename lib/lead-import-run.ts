import { parseLeadCsv, type LeadCsvParseResult, type ParseLeadCsvOptions } from "./lead-csv";
import type { LeadImportStore } from "./lead-import-store";

export type LeadImportRowReport = {
  success: boolean;
  row: number;
  name?: string;
  score?: number;
  error?: string;
  persisted: boolean;
};

export type LeadImportReport = {
  /** "off" means the store was not called. Validation still ran. */
  persistence: "on" | "off";
  saved: number;
  valid: number;
  errors: number;
  fileErrors: string[];
  results: LeadImportRowReport[];
};

export async function runLeadImport(
  csv: string,
  options: ParseLeadCsvOptions,
  store: LeadImportStore | null,
): Promise<LeadImportReport> {
  const parsed = parseLeadCsv(csv, options);
  return applyStore(parsed, store);
}

async function applyStore(parsed: LeadCsvParseResult, store: LeadImportStore | null): Promise<LeadImportReport> {
  const persistence = store ? "on" : "off";
  if (parsed.fileErrors.length) {
    return {
      persistence,
      saved: 0,
      valid: 0,
      errors: 0,
      fileErrors: parsed.fileErrors,
      results: [],
    };
  }

  const results: LeadImportRowReport[] = [];
  let saved = 0;
  for (const row of parsed.rows) {
    if (!row.ok || !row.lead) {
      results.push({
        success: false,
        row: row.row,
        name: row.name,
        persisted: false,
        error: row.errors.join("; "),
      });
      continue;
    }
    if (!store) {
      results.push({
        success: true,
        row: row.row,
        name: row.lead.company_name,
        score: row.lead.lead_score,
        persisted: false,
      });
      continue;
    }
    try {
      await store.save(row.lead);
      saved += 1;
      results.push({
        success: true,
        row: row.row,
        name: row.lead.company_name,
        score: row.lead.lead_score,
        persisted: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha ao gravar";
      results.push({
        success: false,
        row: row.row,
        name: row.lead.company_name,
        score: row.lead.lead_score,
        persisted: false,
        error: message,
      });
    }
  }

  const valid = results.filter((row) => row.success).length;
  return {
    persistence,
    saved,
    valid,
    errors: results.length - valid,
    fileErrors: [],
    results,
  };
}
