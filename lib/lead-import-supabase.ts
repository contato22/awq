import { createLead } from "@/lib/crm-db";
import type { LeadImportDraft } from "@/lib/lead-csv";
import type { LeadImportStore } from "@/lib/lead-import-store";

/** Supabase writer. Only constructed when LEAD_IMPORT_PERSIST=1. */
export function supabaseLeadImportStore(): LeadImportStore {
  return {
    async save(lead: LeadImportDraft) {
      const row = await createLead({
        ...lead,
        status: "new",
        created_by: "import",
      });
      return { lead_id: row.lead_id };
    },
  };
}
