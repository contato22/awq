export interface ImportedTransaction {
  id: string;
  date: string;        // YYYY-MM-DD
  description: string;
  amount: number;      // positive = credit, negative = debit
  type: "credit" | "debit" | "unknown";
  source: "csv" | "pdf";
  raw: string;
}

export interface ImportResult {
  transactions: ImportedTransaction[];
  rejectedRows: string[];
  warnings: string[];
  fileName: string;
  fileType: "csv" | "pdf";
  /** Bank name detected from file content or filename (e.g. "Cora", "Itaú"). Null if not detected. */
  detectedBank: string | null;
  /** Lowercase keywords found in the statement that help disambiguate the specific account (e.g. ["jacqes"], ["holding"]). */
  detectedAccountHints: string[];
}
