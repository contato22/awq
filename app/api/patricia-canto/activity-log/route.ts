// GET /api/patricia-canto/activity-log — exclusivo do master (aba Equipe:
// atividades e performance por pessoa de acesso). Admin e Ana (mkt) não
// têm acesso a essa rota.
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { getActivityLog } from "@/lib/patricia-canto/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (role !== "master") return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  try {
    const activityLog = await getActivityLog();
    return NextResponse.json({ activityLog });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
