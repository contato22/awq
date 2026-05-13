import { NextRequest, NextResponse } from "next/server";
import { listReviews, createReview, deleteReview } from "@/lib/cpm-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listReviews() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createReview(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteReview(id);
  return NextResponse.json({ ok: true });
}
