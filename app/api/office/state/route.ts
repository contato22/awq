/**
 * /api/office/state — estado durável do simulador Office.
 * GET            → { chaves: { head, missions, events, policies } } (as que existirem)
 * PUT {key, value, base} → grava com concorrência otimista; 409 devolve o estado atual.
 * Acesso: mesma regra dos agentes (camada "ai"); papéis de BU não alcançam /api/office (middleware).
 * Se a tabela ainda não existe, responde 503 STORAGE_NOT_READY e o cliente segue só no navegador.
 */
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { apiGuard } from "@/lib/api-guard";
import { CHAVES_OFFICE, gravarEstado, lerEstado, type ChaveOffice } from "@/lib/office-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const negado = await apiGuard(req, "view", "ai", "Estado do Office");
  if (negado) return negado;
  const r = await lerEstado();
  if (!r.ok) return NextResponse.json({ code: r.codigo, error: r.mensagem }, { status: 503 });
  return NextResponse.json({ chaves: r.dados });
}

export async function PUT(req: NextRequest) {
  const negado = await apiGuard(req, "update", "ai", "Estado do Office");
  if (negado) return negado;
  let corpo: { key?: string; value?: unknown; base?: number };
  try { corpo = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const chave = corpo.key as ChaveOffice;
  if (!CHAVES_OFFICE.includes(chave) || corpo.value === undefined || typeof corpo.base !== "number") {
    return NextResponse.json({ error: "Informe key (head, missions, events, policies), value e base (versão conhecida, 0 se nova)." }, { status: 400 });
  }
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const r = await gravarEstado(chave, corpo.value, corpo.base, (token?.email as string | undefined) ?? "desconhecido");
  if (r.ok) return NextResponse.json({ version: r.version });
  if (r.conflito) return NextResponse.json({ code: "VERSION_CONFLICT", atual: r.atual }, { status: 409 });
  return NextResponse.json({ code: r.codigo, error: r.mensagem }, { status: r.codigo === "STORAGE_NOT_READY" ? 503 : 500 });
}
