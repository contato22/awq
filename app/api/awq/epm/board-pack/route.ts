import { NextResponse } from "next/server";
import {
  getInitiatives,
  getRisks,
  upsertInitiative,
  deleteInitiative,
  upsertRisk,
  deleteRisk,
} from "@/lib/epm-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [initiatives, risks] = await Promise.all([getInitiatives(), getRisks()]);
    return NextResponse.json({ success: true, initiatives, risks });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === "upsert_initiative") {
      await upsertInitiative(body.data);
      return NextResponse.json({ success: true });
    }
    if (body.action === "delete_initiative") {
      await deleteInitiative(body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "upsert_risk") {
      await upsertRisk(body.data);
      return NextResponse.json({ success: true });
    }
    if (body.action === "delete_risk") {
      await deleteRisk(body.id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
