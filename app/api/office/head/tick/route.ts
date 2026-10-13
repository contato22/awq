/**
 * /api/office/head/tick — um ciclo do Head de CS no servidor (fase 2 do backend do Office).
 * Chamada por um agendador externo (ex.: workflow do GitHub Actions) com
 *   Authorization: Bearer <OFFICE_TICK_SECRET>
 * Sem OFFICE_HEAD_TICK=1, sem segredo, sem chave da Anthropic ou com o modo autônomo desligado
 * no painel, a rota não faz nada e não gasta créditos. A rota está fora do login do middleware
 * (precisa de segredo próprio), por isso a verificação do segredo é obrigatória.
 */
import { NextRequest, NextResponse } from "next/server";
import { executarTick } from "@/lib/office-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function autorizado(req: NextRequest): boolean {
  const segredo = process.env.OFFICE_TICK_SECRET;
  if (!segredo) return false;
  return req.headers.get("authorization") === `Bearer ${segredo}`;
}

async function tratar(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    return NextResponse.json(await executarTick());
  } catch (e) {
    return NextResponse.json({ status: "erro", mensagem: e instanceof Error ? e.message.slice(0, 200) : "erro" }, { status: 500 });
  }
}

export const GET = tratar;
export const POST = tratar;
