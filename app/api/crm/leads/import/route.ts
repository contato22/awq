import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  LEAD_CSV_MAX_CHARS,
  isLeadImportBu,
  type LeadImportBu,
} from "@/lib/lead-csv";
import { runLeadImport } from "@/lib/lead-import-run";
import { isLeadImportPersistEnabled, type LeadImportStore } from "@/lib/lead-import-store";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("JSON inválido.");
  }
  if (!body || typeof body !== "object") return err("JSON inválido.");

  const record = body as Record<string, unknown>;
  const csv = record.csv;
  if (typeof csv !== "string" || !csv.trim()) return err("csv obrigatório.");
  if (csv.length > LEAD_CSV_MAX_CHARS) return err("CSV excede 500 KB.");

  const buChoice = resolveBu(record.default_bu, auth.buLock);
  if (!buChoice.ok) return err(buChoice.error);

  const assignee = typeof record.default_assigned_to === "string"
    ? record.default_assigned_to
    : undefined;

  const persist = isLeadImportPersistEnabled();
  const known = await existingEmailsForImport(record.existing_emails, persist);
  if (!known.ok) return err(known.error, known.status);

  const store = persist ? await storeForRequest() : null;
  const report = await runLeadImport(csv, {
    defaultBu: buChoice.bu,
    forcedBu: buChoice.forced,
    defaultAssignedTo: assignee,
    existingEmails: known.emails,
  }, store);
  return ok(report);
}

function clientEmails(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5000);
}

async function existingEmailsForImport(
  value: unknown,
  persist: boolean,
): Promise<{ ok: true; emails: string[] } | { ok: false; error: string; status: number }> {
  if (!persist) return { ok: true, emails: clientEmails(value) };
  try {
    const { listLeads } = await import("@/lib/crm-db");
    const leads = await listLeads();
    return { ok: true, emails: leads.map((lead) => lead.email ?? "").filter(Boolean) };
  } catch {
    return {
      ok: false,
      status: 503,
      error: "Não foi possível conferir os leads já cadastrados.",
    };
  }
}

function resolveBu(
  requested: unknown,
  buLock: string | null,
): { ok: true; bu: LeadImportBu; forced: LeadImportBu | null } | { ok: false; error: string } {
  if (buLock) {
    const locked = buLock.trim().toUpperCase();
    if (!isLeadImportBu(locked)) {
      return { ok: false, error: `A BU ${locked} não entra no cadastro de leads.` };
    }
    return { ok: true, bu: locked, forced: locked };
  }
  const raw = typeof requested === "string" && requested.trim()
    ? requested.trim().toUpperCase()
    : "JACQES";
  if (!isLeadImportBu(raw)) {
    return { ok: false, error: "BU padrão inválida. Use JACQES, CAZA, ADVISOR ou VENTURE." };
  }
  return { ok: true, bu: raw, forced: null };
}

async function storeForRequest(): Promise<LeadImportStore | null> {
  if (!isLeadImportPersistEnabled()) return null;
  const { supabaseLeadImportStore } = await import("@/lib/lead-import-supabase");
  return supabaseLeadImportStore();
}
