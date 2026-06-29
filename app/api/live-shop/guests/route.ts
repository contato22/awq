// /api/live-shop/guests — gestão de convidados da área da marca (criar/listar/revogar)
//
// Cria login individual + libera acesso por marca. SOMENTE owner/admin/live-shop
// (a role é injetada pelo middleware em x-user-role). Convidados (live-guest)
// são bloqueados de todo /api/* pelo middleware.

import { NextRequest, NextResponse } from "next/server";
import { createGuest, listGuests, revokeGuest, GUESTS_DB_AVAILABLE } from "@/lib/live-shop/guests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["owner", "admin", "live-shop"]);

function guard(req: NextRequest): NextResponse | null {
  const role = req.headers.get("x-user-role") ?? "";
  if (!ALLOWED.has(role)) {
    return NextResponse.json({ error: "Sem permissão para gerir acessos." }, { status: 403 });
  }
  if (!GUESTS_DB_AVAILABLE) {
    return NextResponse.json({ error: "Banco não configurado (migration 010)." }, { status: 503 });
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const guests = await listGuests();
  return NextResponse.json({ guests });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const email = String(body.email ?? "").trim();
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");
  const brandIds: string[] = Array.isArray(body.brandIds) ? body.brandIds.map(String) : [];

  if (!email || !email.includes("@")) return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Senha precisa de ≥ 8 caracteres." }, { status: 400 });
  if (brandIds.length === 0) return NextResponse.json({ error: "Libere ao menos uma marca." }, { status: 400 });

  try {
    const guest = await createGuest({ email, name, password, brandIds });
    return NextResponse.json({ guest }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao criar." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ausente." }, { status: 400 });
  try {
    await revokeGuest(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha." }, { status: 500 });
  }
}
