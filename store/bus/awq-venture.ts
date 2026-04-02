// ─── AWQ Venture — BU Data Module ──────────────────────────────────────────────
// AWQ Venture data comes from two sources:
//   1. BuData entry in lib/awq-group-data.ts (portfolio summary)
//   2. Venture sales data via lib/notion-fetch.ts (Enerdy sales)
// This module organizes both under a single interface.

import { buData } from "@/lib/awq-group-data";
import type { BuData } from "@/lib/awq-group-data";
import { fetchVentureSales } from "@/lib/notion-fetch";
import type { VentureSalesData } from "@/lib/notion-fetch";
import { createEnvelope } from "../types/source-meta";
import { SOURCE_CATALOG } from "../meta";

// ─── Extract Venture data from AWQ Group BuData ───────────────────────────────

const ventureBuData = buData.find((bu) => bu.id === "venture");

if (!ventureBuData) {
  throw new Error("[store/bus/awq-venture] Venture BU entry not found in buData");
}

export const ventureData: BuData = ventureBuData;

// ─── Governed data access ─────────────────────────────────────────────────────

export function getVentureData() {
  return createEnvelope<BuData>(ventureData, SOURCE_CATALOG["awq:bu-data"]);
}

export async function getVentureSales() {
  const data = await fetchVentureSales();
  return createEnvelope<VentureSalesData>(data, SOURCE_CATALOG["venture:sales"]);
}

// ─── BU-level summary ─────────────────────────────────────────────────────────

export const VENTURE_BU_ID = "awq-venture" as const;

export function getVentureSummary() {
  return {
    buId: VENTURE_BU_ID,
    status: "structuring" as const,
    dryPowder: ventureData.cashBalance,
    portfolioCompanies: ventureData.customers,
    totalReturn: ventureData.roic,
    capitalAllocated: ventureData.capitalAllocated,
    exitProceeds: ventureData.netIncome,
    ftes: ventureData.ftes,
  };
}
