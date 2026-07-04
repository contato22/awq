// /api/jacqes/guests — gestão de convidados da área /jacqes (criar/listar/revogar)
//
// Cria login individual para /jacqes. SOMENTE owner/admin/jacqes (role injetada
// pelo middleware em x-user-role). Convidados (jacqes-guest) são bloqueados de
// todo /api/* pelo middleware.

import { NextRequest, NextResponse } from "next/server";
import {
  createJacqesGuest, listJacqesGuests, revokeJacqesGuest, JACQES_GUESTS_DB_AVAILABLE,
} from "@/lib/jacqes/guests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["owner", "admin", "jacqes"]);

function guard(req: NextRequest): NextResponse | null {
  const role = req.headers.get("x-user-role") ?? "";
  if (!ALLOWED.has(role)) {
    return NextResponse.json({ error: "Sem permissão para gerir acessos." }, { status: 403 });
  }
  if (!JACQES_GUESTS_DB_AVAILABLE) {
    return NextResponse.json({ error: "Banco não configurado (migration 012)." }, { status: 503 });
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const guests = await listJacqesGuests();
  return NextResponse.json({ guests });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const login = String(body.login ?? body.email ?? "").trim();
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");

  if (!login) return NextResponse.json({ error: "Informe um usuário (login)." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Senha precisa de ≥ 8 caracteres." }, { status: 400 });

  try {
    const guest = await createJacqesGuest({ login, name, password });
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
    await revokeJacqesGuest(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha." }, { status: 500 });
  }
}
