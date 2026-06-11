// ─── Conciliação Inteligente — tipos do schema (migration 003) ───────────────
// Mapeiam 1:1 as tabelas de supabase/migrations/003_conciliacao_inteligente.sql.
// Nomes de colunas em snake_case (como no Postgres); o app converte quando preciso.

export type BU = "AWQ" | "ENRD";

export type ReconStatus = "unmatched" | "partial" | "matched" | "ignored";
export type TxSource    = "cora_api" | "ofx" | "csv";

/** Linha de bank_transaction. value_date e direction são colunas GERADAS no DB. */
export interface BankTxRow {
  id?: string;
  bu: BU;
  account_id: string;
  posted_at: string;            // timestamptz ISO
  amount: number;               // + crédito / - débito (sinalizado)
  counterparty: string | null;
  counter_doc: string | null;
  e2e_id: string | null;        // chave determinística de dedupe (UNIQUE por bu)
  txid: string | null;
  raw_descr: string | null;
  source: TxSource;
  recon_status?: ReconStatus;
}

/** Entrada normalizada da ingestão (antes de virar BankTxRow). */
export interface ReconBankTxInput {
  accountId: string;
  postedAt: string;             // ISO timestamptz (preferir noon BRT p/ value_date estável)
  amount: number;               // sinalizado: + crédito / - débito
  counterparty: string | null;
  counterDoc: string | null;
  e2eId: string | null;         // Pix endToEndId real, quando houver
  txid: string | null;
  rawDescr: string | null;
  source: TxSource;
  /** Id de origem (movimento Cora, FITID OFX, linha CSV) — surrogate de dedupe quando não há e2eId. */
  sourceId: string;
}

export interface IngestResult {
  synced: number;
  skipped: number;
  total: number;
}
