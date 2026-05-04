import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, createLead } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

// Public endpoint — no auth required (excluded in middleware matcher).
// Accepts leads from web forms and landing pages.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contact_name, company_name, email, phone, job_title,
      bu, message, utm_source, utm_medium, utm_campaign,
    } = body as Record<string, string>;

    if (!contact_name?.trim()) return err("Nome obrigatório");
    if (!company_name?.trim()) return err("Empresa obrigatória");
    if (!email?.trim()) return err("E-mail obrigatório");

    // Map UTM source to lead_source
    const sourceMap: Record<string, string> = {
      google: "paid", meta: "paid", instagram: "paid", facebook: "paid",
      referral: "referral", email: "inbound", organic: "organic",
    };
    const rawSource = utm_medium?.toLowerCase() ?? utm_source?.toLowerCase() ?? "inbound";
    const lead_source = sourceMap[rawSource] ?? "inbound";

    const qualification_notes = [
      message ? `Mensagem: ${message}` : null,
      utm_campaign ? `Campanha: ${utm_campaign}` : null,
      utm_source ? `UTM Source: ${utm_source}` : null,
      utm_medium ? `UTM Medium: ${utm_medium}` : null,
    ].filter(Boolean).join(" | ") || null;

    const validBU = ["JACQES", "CAZA", "ADVISOR", "VENTURE"];
    const buVal = validBU.includes(bu?.toUpperCase()) ? bu.toUpperCase() : "JACQES";

    await initCrmDB();

    const lead = await createLead({
      contact_name: contact_name.trim(),
      company_name: company_name.trim(),
      email:        email.trim(),
      phone:        phone?.trim() || null,
      job_title:    job_title?.trim() || null,
      bu:           buVal as "JACQES" | "CAZA" | "ADVISOR" | "VENTURE",
      lead_source:  lead_source as "organic" | "paid" | "referral" | "inbound" | "manual",
      status:       "new",
      lead_score:   0,
      assigned_to:  "Miguel",
      qualification_notes,
      created_by:   "web_form",
    });

    return ok({ lead_id: lead.lead_id, message: "Lead recebido com sucesso!" });
  } catch (e) {
    return err(String(e), 500);
  }
}

// Allow preflight for forms hosted on external domains
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
