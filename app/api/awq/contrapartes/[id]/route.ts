// ─── /api/awq/contrapartes/[id] — Update / Soft-delete ───────────────────────
import { NextRequest, NextResponse } from "next/server";
import { sql, initDB } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await initDB();
  const { id } = await params;
  const d = await req.json();
  const rows = await sql`
    UPDATE awq_contrapartes SET
      razao_social     = COALESCE(${d.razaoSocial     ?? null}, razao_social),
      nome_fantasia    = COALESCE(${d.nomeFantasia    ?? null}, nome_fantasia),
      cnpj_cpf         = COALESCE(${d.cnpjCpf         ?? null}, cnpj_cpf),
      papel            = COALESCE(${d.papel            ?? null}, papel),
      bu               = COALESCE(${d.bu               ?? null}, bu),
      status           = COALESCE(${d.status           ?? null}, status),
      email_financeiro = COALESCE(${d.emailFinanceiro  ?? null}, email_financeiro),
      telefone         = COALESCE(${d.telefone         ?? null}, telefone),
      endereco         = COALESCE(${d.endereco         ?? null}, endereco),
      observacoes      = COALESCE(${d.observacoes      ?? null}, observacoes),
      updated_at       = NOW()
    WHERE id = ${id}
    RETURNING id, razao_social AS "razaoSocial", nome_fantasia AS "nomeFantasia",
              cnpj_cpf AS "cnpjCpf", papel, bu, status,
              email_financeiro AS "emailFinanceiro", telefone, endereco, observacoes,
              deleted_at::text AS "deletedAt",
              created_at::text AS "createdAt", updated_at::text AS "updatedAt"
  `;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await initDB();
  const { id } = await params;
  await sql`
    UPDATE awq_contrapartes
    SET deleted_at = NOW(), status = 'inativo', updated_at = NOW()
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
