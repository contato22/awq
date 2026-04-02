// ─── Advisor — BU Data Module ──────────────────────────────────────────────────
// Wraps lib/advisor-data.ts + lib/awq-group-data.ts (BuData entry) with metadata.
// Now has its own dedicated data file with KPIs, clients, financials, and alerts.

import { buData } from "@/lib/awq-group-data";
import type { BuData } from "@/lib/awq-group-data";

import {
  advisorKpis,
  advisorClients,
  advisorFeeIncome,
  advisorDRE,
  advisorStrategies,
  advisorAlerts,
  advisorTypeConfig,
  advisorRiscoConfig,
  advisorStatusConfig,
} from "@/lib/advisor-data";

import type {
  AdvisorKPI,
  AdvisorClient,
  AdvisorFeeIncome,
  AdvisorDRERow,
  AdvisorStrategy,
  AdvisorAlert,
} from "@/lib/advisor-data";

import { createEnvelope } from "../types/source-meta";
import { SOURCE_CATALOG } from "../meta";

// ─── Raw re-exports ───────────────────────────────────────────────────────────
export {
  advisorKpis,
  advisorClients,
  advisorFeeIncome,
  advisorDRE,
  advisorStrategies,
  advisorAlerts,
  advisorTypeConfig,
  advisorRiscoConfig,
  advisorStatusConfig,
};

// ─── Type re-exports ──────────────────────────────────────────────────────────
export type {
  AdvisorKPI,
  AdvisorClient,
  AdvisorFeeIncome,
  AdvisorDRERow,
  AdvisorStrategy,
  AdvisorAlert,
};

// ─── Extract Advisor data from AWQ Group BuData ───────────────────────────────

const advisorBuData = buData.find((bu) => bu.id === "advisor");

if (!advisorBuData) {
  throw new Error("[store/bus/advisor] Advisor BU entry not found in buData");
}

export const advisorData: BuData = advisorBuData;

// ─── Governed data access (with metadata envelopes) ───────────────────────────

export function getAdvisorData() {
  return createEnvelope<BuData>(advisorData, SOURCE_CATALOG["awq:bu-data"]);
}

export function getAdvisorKpis() {
  return createEnvelope<AdvisorKPI[]>(advisorKpis, SOURCE_CATALOG["advisor:kpis"]);
}

export function getAdvisorClients() {
  return createEnvelope<AdvisorClient[]>(advisorClients, SOURCE_CATALOG["advisor:clients"]);
}

export function getAdvisorFeeIncome() {
  return createEnvelope<AdvisorFeeIncome[]>(advisorFeeIncome, SOURCE_CATALOG["advisor:fee-income"]);
}

export function getAdvisorDRE() {
  return createEnvelope<AdvisorDRERow[]>(advisorDRE, SOURCE_CATALOG["advisor:dre"]);
}

export function getAdvisorStrategies() {
  return createEnvelope<AdvisorStrategy[]>(advisorStrategies, SOURCE_CATALOG["advisor:strategies"]);
}

export function getAdvisorAlerts() {
  return createEnvelope<AdvisorAlert[]>(advisorAlerts, SOURCE_CATALOG["advisor:alerts"]);
}

// ─── BU-level summary ─────────────────────────────────────────────────────────

export const ADVISOR_BU_ID = "advisor" as const;

export function getAdvisorSummary() {
  const activeClients = advisorClients.filter((c) => c.status === "Ativo").length;
  const totalAum = advisorClients.reduce((s, c) => s + c.aum, 0);
  const avgReturn = advisorClients.reduce((s, c) => s + c.retorno, 0) / advisorClients.length;
  const avgNps = Math.round(advisorClients.reduce((s, c) => s + c.nps, 0) / advisorClients.length);

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
    activeClients,
    totalAum,
    avgReturn,
    avgNps,
    activeAlerts: advisorAlerts.length,
  };
}
