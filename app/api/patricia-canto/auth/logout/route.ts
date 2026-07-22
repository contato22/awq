import { NextResponse } from "next/server";
import { PC_SESSION_COOKIE } from "@/lib/patricia-canto/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PC_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
