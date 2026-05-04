import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, createLead } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

// Expected CSV columns (case-insensitive):
// nome,empresa,email,telefone,cargo,bu,fonte,budget,necessidade,timeline,responsavel,notas
const COLUMN_MAP: Record<string, string> = {
  nome:        "contact_name",
  name:        "contact_name",
  contact_name:"contact_name",
  empresa:     "company_name",
  company:     "company_name",
  company_name:"company_name",
  email:       "email",
  telefone:    "phone",
  phone:       "phone",
  cargo:       "job_title",
  job_title:   "job_title",
  bu:          "bu",
  fonte:       "lead_source",
  source:      "lead_source",
  lead_source: "lead_source",
  budget:      "bant_budget",
  bant_budget: "bant_budget",
  necessidade: "bant_need",
  need:        "bant_need",
  bant_need:   "bant_need",
  timeline:    "bant_timeline",
  bant_timeline:"bant_timeline",
  decisor:     "bant_authority",
  authority:   "bant_authority",
  bant_authority:"bant_authority",
  responsavel: "assigned_to",
  assigned_to: "assigned_to",
  notas:       "qualification_notes",
  notes:       "qualification_notes",
  qualification_notes: "qualification_notes",
};

const VALID_BU = ["JACQES", "CAZA", "ADVISOR", "VENTURE"];
const VALID_SOURCE = ["organic", "paid", "referral", "inbound", "manual", "outbound", "event"];
const VALID_NEED = ["low", "medium", "high"];

function calcScore(row: Record<string, string>): number {
  let score = 0;
  const budget = parseFloat(row.bant_budget ?? "0") || 0;
  if (budget >= 50000) score += 30;
  else if (budget >= 20000) score += 20;
  else if (budget >= 10000) score += 10;
  const auth = row.bant_authority?.toLowerCase();
  if (auth === "sim" || auth === "yes" || auth === "true" || auth === "1") score += 20;
  if (row.bant_need === "high") score += 25;
  else if (row.bant_need === "medium") score += 15;
  else if (row.bant_need === "low") score += 5;
  if (row.bant_timeline) {
    const days = Math.ceil((new Date(row.bant_timeline).getTime() - Date.now()) / 86400000);
    if (days <= 30) score += 15;
    else if (days <= 60) score += 10;
    else if (days <= 90) score += 5;
  }
  return Math.min(score, 100);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));

  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      const mapped = COLUMN_MAP[h];
      if (mapped) raw[mapped] = values[i] ?? "";
    });
    return raw;
  }).filter(r => r.contact_name || r.company_name);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csv, default_bu, default_assigned_to } = body as {
      csv: string;
      default_bu?: string;
      default_assigned_to?: string;
    };

    if (!csv?.trim()) return err("csv content required");

    const rows = parseCSV(csv);
    if (!rows.length) return err("Nenhuma linha válida encontrada no CSV");

    await initCrmDB();

    const results: { success: boolean; row: number; name?: string; error?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      try {
        const bu = VALID_BU.includes(raw.bu?.toUpperCase()) ? raw.bu.toUpperCase() : default_bu ?? "JACQES";
        const source = VALID_SOURCE.includes(raw.lead_source?.toLowerCase()) ? raw.lead_source.toLowerCase() : "manual";
        const need = VALID_NEED.includes(raw.bant_need?.toLowerCase()) ? raw.bant_need.toLowerCase() : null;
        const auth = ["sim", "yes", "true", "1"].includes(raw.bant_authority?.toLowerCase() ?? "");
        const budget = raw.bant_budget ? parseFloat(raw.bant_budget) : null;
        const timeline = raw.bant_timeline ? raw.bant_timeline : null;

        const lead = await createLead({
          contact_name:        raw.contact_name?.trim() || "—",
          company_name:        raw.company_name?.trim() || "—",
          email:               raw.email?.trim() || null,
          phone:               raw.phone?.trim() || null,
          job_title:           raw.job_title?.trim() || null,
          bu:                  bu as "JACQES" | "CAZA" | "ADVISOR" | "VENTURE",
          lead_source:         source as "organic" | "paid" | "referral" | "inbound" | "manual",
          bant_budget:         budget ?? undefined,
          bant_authority:      auth,
          bant_need:           need as "low" | "medium" | "high" | null ?? undefined,
          bant_timeline:       timeline ?? undefined,
          assigned_to:         raw.assigned_to?.trim() || default_assigned_to || "Miguel",
          qualification_notes: raw.qualification_notes?.trim() || null,
          lead_score:          calcScore({ ...raw, bant_need: need ?? "", bant_authority: auth ? "yes" : "no" }),
          status:              "new",
          created_by:          "import",
        });
        results.push({ success: true, row: i + 2, name: lead.company_name });
      } catch (e) {
        results.push({ success: false, row: i + 2, error: String(e) });
      }
    }

    const ok_count = results.filter(r => r.success).length;
    const err_count = results.filter(r => !r.success).length;

    return ok({ imported: ok_count, errors: err_count, results });
  } catch (e) {
    return err(String(e), 500);
  }
}
