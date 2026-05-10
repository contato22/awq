import { NextRequest, NextResponse } from "next/server";
import {
  getDeals, getDealById, upsertDeal, deleteDeal,
  getDealOverrides, saveDealOverrides,
  getDealClientResponses, saveDealClientResponses,
} from "@/lib/venture-db";
import type { DealWorkspace } from "@/lib/deal-types";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const id       = req.nextUrl.searchParams.get("id");
  const section  = req.nextUrl.searchParams.get("section"); // "overrides" | "responses"

  if (id && section === "overrides") {
    return NextResponse.json(await getDealOverrides(id));
  }
  if (id && section === "responses") {
    return NextResponse.json(await getDealClientResponses(id));
  }
  if (id) {
    const deal = await getDealById(id);
    if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(deal);
  }
  return NextResponse.json(await getDeals());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { action } = body;

  if (action === "upsert") {
    await upsertDeal(body.deal as DealWorkspace, body.isCustom ?? false);
    return NextResponse.json({ success: true });
  }
  if (action === "delete") {
    await deleteDeal(body.id as string);
    return NextResponse.json({ success: true });
  }
  if (action === "save_overrides") {
    await saveDealOverrides(body.id as string, body.overrides as Record<string, unknown>);
    return NextResponse.json({ success: true });
  }
  if (action === "save_responses") {
    await saveDealClientResponses(body.id as string, body.responses as unknown[]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
