// ─── Seed AR JACQES — projeta 12 meses de recebíveis dos retainers ──────────
// GET /api/jacqes/seed-jacqes-ar
//
// Para cada um dos 4 retainers JACQES já em ppm_projects, gera 12 parcelas
// mensais em epm_ar (Contas a Receber). Aparece no FP&A interno da JACQES
// e na visão consolidada da Holding.
//
// Idempotente via reference_doc no padrão JACQES-RET-{slug}-{YYYY-MM}.
//
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { listProjects } from "@/lib/ppm-db";
import { getAllAR, addAR } from "@/lib/ap-ar-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWNER_EMAIL = "awqmac@gmail.com";
const OWNER_NAME  = "Danilo Jaques Jacinto";

// Os 4 retainers iniciais — mesma fonte do seed-initial-batch.
const RETAINERS: Array<{ nome: string; ticket: number }> = [
  { nome: "Escola Centro de Ensino Moderno (CEM)", ticket: 3200 },
  { nome: "Tatiana Simões",                         ticket: 1790 },
  { nome: "André Vieira",                           ticket: 2300 },
  { nome: "Dermo Ativo",                            ticket: 1790 },
];

function slug(s: string) {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isoFirstOfMonth(monthsAhead: number) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsAhead);
  return d.toISOString().slice(0, 10);
}

function isoNthOfMonth(monthsAhead: number, day: number) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsAhead);
  d.setUTCDate(day);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    return await run(req);
  } catch (err) {
    return NextResponse.json(
      { ok: false, fatal: String(err), stack: err instanceof Error ? err.stack : undefined },
      { status: 500 },
    );
  }
}

async function run(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || token.email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const diagnostics: Record<string, unknown> = {};
  const results: Array<Record<string, unknown>> = [];

  // ── 1. Snapshot — projetos JACQES + AR existentes ───────────────────────
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  try {
    projects = await listProjects({ bu_code: "JACQES" });
  } catch (err) {
    diagnostics.listProjects = String(err);
  }

  let existingRefs = new Set<string>();
  try {
    const existing = await getAllAR({ bu_code: "JACQES" });
    existingRefs = new Set(
      existing.map((a) => a.reference_doc).filter((r): r is string => !!r),
    );
  } catch (err) {
    diagnostics.getAllAR = String(err);
  }

  // ── 2. Para cada retainer, gera 12 parcelas ─────────────────────────────
  for (const r of RETAINERS) {
    const project = projects.find(
      (p) => p.customer_name?.toLowerCase().trim() === r.nome.toLowerCase().trim(),
    );
    const projectId = project?.project_id;

    const entry: Record<string, unknown> = {
      cliente: r.nome,
      project_id: projectId ?? "(não encontrado)",
      installments: [] as unknown[],
    };

    for (let m = 1; m <= 12; m++) {
      const dueDate = isoNthOfMonth(m, 5);
      const monthTag = isoFirstOfMonth(m).slice(0, 7); // YYYY-MM
      const refDoc = `JACQES-RET-${slug(r.nome)}-${monthTag}`;

      if (existingRefs.has(refDoc)) {
        (entry.installments as unknown[]).push({ ref: refDoc, status: "skipped" });
        continue;
      }

      try {
        const ar = await addAR({
          bu_code:       "JACQES",
          customer_name: r.nome,
          description:   `Retainer ${monthTag} — ${r.nome}`,
          category:      "Serviço Recorrente",
          cost_center:   "JACQES — Retainer",
          reference_doc: refDoc,
          project_id:    projectId,
          account_code:  "1.1.2.1.1.1", // AR — JACQES Tier 1 (per ARItem comment)
          issue_date:    isoFirstOfMonth(m),
          due_date:      dueDate,
          gross_amount:  r.ticket,
          source_system: "seed-jacqes-ar",
          created_by:    OWNER_EMAIL,
        });
        (entry.installments as unknown[]).push({
          ref:        refDoc,
          id:         ar.id,
          due_date:   ar.due_date,
          gross:      ar.gross_amount,
          net:        ar.net_amount,
          iss:        ar.iss_amount,
          pis:        ar.pis_amount,
          cofins:     ar.cofins_amount,
        });
      } catch (err) {
        (entry.installments as unknown[]).push({ ref: refDoc, error: String(err) });
      }
    }

    results.push(entry);
  }

  const created = results.flatMap((e) =>
    (e.installments as Array<{ id?: string }>).filter((i) => !!i.id),
  ).length;
  const skipped = results.flatMap((e) =>
    (e.installments as Array<{ status?: string }>).filter((i) => i.status === "skipped"),
  ).length;
  const errored = results.flatMap((e) =>
    (e.installments as Array<{ error?: string }>).filter((i) => !!i.error),
  ).length;

  return NextResponse.json({
    ok:       true,
    runBy:    token.email,
    runAt:    new Date().toISOString(),
    owner:    OWNER_NAME,
    summary:  { criadas: created, skipped, errored, total_esperado: RETAINERS.length * 12 },
    diagnostics,
    results,
  });
}
