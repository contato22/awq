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
}
