// GET /api/monitoring/errors — returns in-memory error ring buffer.
// Restricted to owner and admin roles.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getRecentErrors } from "@/lib/monitoring";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role as string | undefined;

  if (!role || !["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const errors = getRecentErrors();
  return NextResponse.json({
    count: errors.length,
    errors,
    note: "In-memory ring buffer — resets on cold start. Max 100 entries.",
  });
}
