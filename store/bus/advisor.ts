// ─── Advisor — BU Data Module ──────────────────────────────────────────────────
// Advisor currently does NOT have its own dedicated data file.
// Its data comes from the BuData entry in lib/awq-group-data.ts.
// This module extracts and organizes Advisor-specific data,
// and provides a clear interface for future expansion.

import { buData } from "@/lib/awq-group-data";
import type { BuData } from "@/lib/awq-group-data";
import { createEnvelope } from "../types/source-meta";
import { SOURCE_CATALOG } from "../meta";

// ─── Extract Advisor data from AWQ Group BuData ───────────────────────────────

const advisorBuData = buData.find((bu) => bu.id === "advisor");

if (!advisorBuData) {
  throw new Error("[store/bus/advisor] Advisor BU entry not found in buData");
}

export const advisorData: BuData = advisorBuData;

// ─── Governed data access ─────────────────────────────────────────────────────

export function getAdvisorData() {
  return createEnvelope<BuData>(advisorData, SOURCE_CATALOG["awq:bu-data"]);
}

// ─── BU-level summary ─────────────────────────────────────────────────────────

export const ADVISOR_BU_ID = "advisor" as const;

export function getAdvisorSummary() {
  return {
    buId: ADVISOR_BU_ID,
    revenue: advisorData.revenue,
    grossProfit: advisorData.grossProfit,
    ebitda: advisorData.ebitda,
    netIncome: advisorData.netIncome,
    customers: advisorData.customers,
    ftes: advisorData.ftes,
    roic: advisorData.roic,
    cashBalance: advisorData.cashBalance,
  };
}
