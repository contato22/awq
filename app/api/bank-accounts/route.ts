import { NextRequest, NextResponse } from "next/server";
import { getBankAccounts, saveBankAccount, deleteBankAccount } from "@/lib/bank-accounts-db";
import type { BankAccount } from "@/lib/bank-accounts-db";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await getBankAccounts());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { action } = body;

  if (action === "save") {
    await saveBankAccount(body.account as BankAccount);
    return NextResponse.json({ success: true });
  }
  if (action === "delete") {
    await deleteBankAccount(body.id as string);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
