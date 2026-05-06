// ─── /api/awq/contrapartes — Contrapartes CRUD ───────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { sql, initDB } from "@/lib/db";

async function ensureTable() {
  await initDB();
}

export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json([], { status: 200 });
  await ensureTable();
  const { searchParams } = new URL(req.url);
  const q      = searchParams.get("q")?.toLowerCase() ?? "";
  const papel  = searchParams.get("papel") ?? "all";
  const bu     = searchParams.get("bu")    ?? "all";
  const status = searchParams.get("status") ?? "all";

  const rows = await sql`
    SELECT id, razao_social AS "razaoSocial", nome_fantasia AS "nomeFantasia",
           cnpj_cpf AS "cnpjCpf", papel, bu, status,
           email_financeiro AS "emailFinanceiro", telefone, endereco, observacoes,
           deleted_at::text AS "deletedAt",
           created_at::text AS "createdAt", updated_at::text AS "updatedAt"
    FROM awq_contrapartes
    WHERE deleted_at IS NULL
      AND (${papel} = 'all' OR papel = ${papel})
      AND (${bu}    = 'all' OR bu    = ${bu})
      AND (${status} = 'all' OR status = ${status})
      AND (
        ${q} = '' OR
        LOWER(razao_social) LIKE ${'%' + q + '%'} OR
        LOWER(nome_fantasia) LIKE ${'%' + q + '%'} OR
        LOWER(cnpj_cpf) LIKE ${'%' + q + '%'} OR
        LOWER(email_financeiro) LIKE ${'%' + q + '%'}
      )
    ORDER BY razao_social ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await ensureTable();
  const d = await req.json();
  const [row] = await sql`
    INSERT INTO awq_contrapartes
      (id, razao_social, nome_fantasia, cnpj_cpf, papel, bu, status,
       email_financeiro, telefone, endereco, observacoes)
    VALUES
      (${d.id}, ${d.razaoSocial}, ${d.nomeFantasia ?? ""},
       ${d.cnpjCpf ?? ""}, ${d.papel ?? "fornecedor"}, ${d.bu ?? ""},
       ${d.status ?? "ativo"}, ${d.emailFinanceiro ?? ""},
       ${d.telefone ?? ""}, ${d.endereco ?? ""}, ${d.observacoes ?? ""})
    RETURNING id, razao_social AS "razaoSocial", nome_fantasia AS "nomeFantasia",
              cnpj_cpf AS "cnpjCpf", papel, bu, status,
              email_financeiro AS "emailFinanceiro", telefone, endereco, observacoes,
              deleted_at::text AS "deletedAt",
              created_at::text AS "createdAt", updated_at::text AS "updatedAt"
  `;
  return NextResponse.json(row, { status: 201 });
}
