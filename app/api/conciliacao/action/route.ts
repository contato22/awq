// ─── POST /api/conciliacao/action ────────────────────────────────────────────
// Ações da subseção Conciliação Inteligente. Toda escrita em recon_* passa por
// função server-side (lib/recon-db.ts).
//
// Body: { action, ... }
//   approve   { groupId }                         → grupo → state='manual'
//   reject    { groupId }                         → reverte (append-only)
//   memorize  { bu, counterpartyKey, kind, categoria, conta } → grava memória
//   rule.save { rule }                            → upsert recon_rule
//   rule.del  { id }
//   mem.del   { bu, counterpartyKey }

import { NextRequest, NextResponse } from "next/server";
import {
  approveGroup, revertGroup, upsertPayeeMemory, upsertRule, deleteRule, deleteMemory,
} from "@/lib/recon-db";
import type { BU } from "@/lib/recon-types";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as any;
  const action = body.action as string;

  try {
    switch (action) {
      case "approve":
        await approveGroup(body.groupId, userEmail);
        break;
      case "reject":
        await revertGroup(body.groupId, userEmail);
        break;
      case "memorize":
        await upsertPayeeMemory(body.bu as BU, body.counterpartyKey, {
          kind: body.kind ?? null,
          categoria: body.categoria ?? null,
          conta_contabil: body.conta ?? null,
        });
        break;
      case "rule.save":
        await upsertRule(body.rule);
        break;
      case "rule.del":
        await deleteRule(body.id);
        break;
      case "mem.del":
        await deleteMemory(body.bu as BU, body.counterpartyKey);
        break;
      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
