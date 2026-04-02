// ─── Source Metadata Types ─────────────────────────────────────────────────────
// Defines how every piece of data in the AWQ platform is classified
// regarding its origin, reliability, and lifecycle.

/** Where the data actually comes from */
export type DataOrigin =
  | "mock"            // Hardcoded placeholder data
  | "static-json"     // JSON file in public/data/
  | "notion-api"      // Live Notion database
  | "derived"         // Calculated/aggregated from other sources
  | "manual-entry"    // Manually entered by a user
  | "external-api";   // Third-party API integration

/** How reliable/trustworthy the data is */
export type DataReliability =
  | "verified"        // Audited and confirmed
  | "estimated"       // Best estimate, not confirmed
  | "provisional"     // Temporary, awaiting confirmation
  | "mock"            // Not real data at all
  | "stale";          // Was real but may be outdated

/** Current lifecycle stage of the data */
export type DataLifecycle =
  | "active"          // Currently in use and maintained
  | "deprecated"      // Being phased out
  | "archived"        // No longer updated
  | "planned";        // Structure exists, data not yet available

/** Metadata attached to any data source */
export interface SourceMeta {
  /** Unique identifier for this data source */
  sourceId: string;
  /** Human-readable description */
  description: string;
  /** Where the data comes from */
  origin: DataOrigin;
  /** How reliable it is */
  reliability: DataReliability;
  /** Lifecycle stage */
  lifecycle: DataLifecycle;
  /** Which BU owns this data (null = AWQ holding) */
  buOwner: string | null;
  /** File path of the original data (for traceability) */
  filePath: string;
  /** Last known update date (ISO string) */
  lastUpdated: string;
  /** Notes for maintainers */
  notes?: string;
}

/** Wraps any data payload with its source metadata */
export interface DataEnvelope<T> {
  data: T;
  meta: SourceMeta;
  /** Timestamp when this envelope was created */
  retrievedAt: string;
}

/** Creates a DataEnvelope for a given payload and metadata */
export function createEnvelope<T>(data: T, meta: SourceMeta): DataEnvelope<T> {
  return {
    data,
    meta,
    retrievedAt: new Date().toISOString(),
  };
}
