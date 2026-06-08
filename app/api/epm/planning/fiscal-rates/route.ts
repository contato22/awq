import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getFiscalRates, upsertFiscalRate, type SupplierType } from "@/lib/epm-planning-db";

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "financeiro", "EPM Planning Fiscal Rates");
  if (denied) return denied;

  const data = await getFiscalRates();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "financeiro", "EPM Planning Fiscal Rates");
  if (denied) return denied;

  const body = await req.json();
  const { supplierType, ...rates } = body as { supplierType: SupplierType } & Record<string, unknown>;
  await upsertFiscalRate(supplierType, {
    irrf_rate:   Number(rates.irrf_rate ?? 0),
    inss_rate:   Number(rates.inss_rate ?? 0),
    iss_rate:    Number(rates.iss_rate ?? 0),
    pis_rate:    Number(rates.pis_rate ?? 0),
    cofins_rate: Number(rates.cofins_rate ?? 0),
  });
  return NextResponse.json({ ok: true });
}
