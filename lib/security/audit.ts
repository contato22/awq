// ─── AWQ Cyber Security Core — Posture Calculator & Aggregators ──────────────

import type { SecurityKPIs, PostureScore } from "./types";
import {
  dataSourceRegistry,
  secretRegistry,
  accessRegistry,
  riskRegister,
} from "./registry";

// ── KPI Aggregator ───────────────────────────────────────────────────────────

export function computeSecurityKPIs(): SecurityKPIs {
  const criticalRisks = riskRegister.filter((r) => r.severity === "critical").length;
  const highRisks = riskRegister.filter((r) => r.severity === "high").length;
  const mediumRisks = riskRegister.filter((r) => r.severity === "medium").length;
  const lowRisks = riskRegister.filter((r) => r.severity === "low").length;
  const openRisks = riskRegister.filter((r) => r.status === "open" || r.status === "in_progress").length;
  const resolvedRisks = riskRegister.filter((r) => r.status === "resolved" || r.status === "mitigated").length;

  const secureDS = dataSourceRegistry.filter(
    (d) => !d.secretExposed && !d.fallbackInsecure && !d.mockInProduction && d.trustLevel === "confirmed"
  ).length;
  const ambiguousDS = dataSourceRegistry.filter(
    (d) => d.trustLevel === "ambiguous" || d.trustLevel === "probable"
  ).length;
  const exposedSecrets = secretRegistry.filter(
    (s) => s.exposureRisk === "client_risk" || s.exposureRisk === "hardcoded"
  ).length;
  const serverOnlySecrets = secretRegistry.filter(
    (s) => s.exposureRisk === "server_only"
  ).length;
  const modulesWithoutAuth = accessRegistry.filter(
    (a) => !a.hasAuthentication || (!a.hasAuthorization && a.severity !== "info")
  ).length;
  const externalDeps = dataSourceRegistry.filter((d) => d.hasExternalDependency).length;

  const posture = computePostureScore();

  return {
    totalRisks: riskRegister.length,
    criticalRisks,
    highRisks,
    mediumRisks,
    lowRisks,
    openRisks,
    resolvedRisks,
    totalDataSources: dataSourceRegistry.length,
    secureDataSources: secureDS,
    ambiguousDataSources: ambiguousDS,
    totalSecrets: secretRegistry.length,
    exposedSecrets,
    serverOnlySecrets,
    totalModulesWithoutAuth: modulesWithoutAuth,
    externalDependencies: externalDeps,
    postureScore: posture.overall,
  };
}

// ── Posture Score Calculator ─────────────────────────────────────────────────
// Methodology: weighted average of sub-scores, each 0-100
// Deductions based on confirmed findings in the repository

export function computePostureScore(): PostureScore {
  // Authentication: starts at 100, deduct for gaps
  let auth = 100;
  if (accessRegistry.some((a) => !a.hasAuthentication && a.severity !== "info")) auth -= 30;
  // API routes without auth
  if (riskRegister.some((r) => r.id === "RISK001" && r.status === "open")) auth -= 20;

  // Authorization: starts at 100, deduct for RBAC gaps
  let authz = 100;
  if (accessRegistry.some((a) => !a.rbacEnforced)) authz -= 40;
  if (riskRegister.some((r) => r.id === "RISK004" && r.status === "open")) authz -= 20;

  // Secret Management: starts at 100, deduct for exposure
  let secrets = 100;
  const exposedCount = secretRegistry.filter(
    (s) => s.exposureRisk === "client_risk" || s.exposureRisk === "hardcoded"
  ).length;
  secrets -= exposedCount * 20;
  if (riskRegister.some((r) => r.id === "RISK009" && r.status === "open")) secrets -= 10;

  // Data Protection: starts at 100
  let dataProtection = 100;
  const exposedDS = dataSourceRegistry.filter((d) => d.secretExposed).length;
  dataProtection -= exposedDS * 15;

  // BU Isolation: starts at 100
  let buIsolation = 100;
  if (accessRegistry.some((a) => !a.buIsolation)) buIsolation -= 50;

  // Dependency Health: starts at 100
  let depHealth = 100;
  const extDeps = dataSourceRegistry.filter((d) => d.hasExternalDependency).length;
  depHealth -= extDeps * 5; // minor deduction per external dep
  const nofallback = dataSourceRegistry.filter((d) => d.hasExternalDependency && !d.hasFallback).length;
  depHealth -= nofallback * 10;

  // Configuration Hygiene: starts at 100
  let configHygiene = 100;
  if (riskRegister.some((r) => r.id === "RISK010" && r.status !== "resolved")) configHygiene -= 15;
  if (riskRegister.some((r) => r.id === "RISK003" && r.status === "open")) configHygiene -= 15;

  // Clamp all to 0-100
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  auth = clamp(auth);
  authz = clamp(authz);
  secrets = clamp(secrets);
  dataProtection = clamp(dataProtection);
  buIsolation = clamp(buIsolation);
  depHealth = clamp(depHealth);
  configHygiene = clamp(configHygiene);

  // Weighted average
  const weights = {
    authentication: 0.20,
    authorization: 0.15,
    secretManagement: 0.20,
    dataProtection: 0.15,
    buIsolation: 0.10,
    dependencyHealth: 0.10,
    configurationHygiene: 0.10,
  };

  const overall = Math.round(
    auth * weights.authentication +
    authz * weights.authorization +
    secrets * weights.secretManagement +
    dataProtection * weights.dataProtection +
    buIsolation * weights.buIsolation +
    depHealth * weights.dependencyHealth +
    configHygiene * weights.configurationHygiene
  );

  return {
    overall,
    authentication: auth,
    authorization: authz,
    secretManagement: secrets,
    dataProtection: dataProtection,
    buIsolation: buIsolation,
    dependencyHealth: depHealth,
    configurationHygiene: configHygiene,
    methodology:
      "Score calculado por média ponderada de sub-scores (autenticação 20%, segredos 20%, autorização 15%, " +
      "proteção de dados 15%, isolamento BU 10%, dependências 10%, configuração 10%). " +
      "Deduções baseadas em findings confirmados no repositório. " +
      "Este score reflete o que é verificável estaticamente — não substitui pentest ou auditoria externa.",
    lastAssessed: "2026-04-02",
    trustLevel: "confirmed",
  };
}

// ── Risk by BU ───────────────────────────────────────────────────────────────

export function getRisksByBu(bu: string) {
  return riskRegister.filter((r) => r.bu === bu || r.bu === "AWQ");
}

export function getDataSourcesByBu(bu: string) {
  return dataSourceRegistry.filter((d) => d.bu === bu || d.bu === "AWQ");
}

// ── Summary by Severity ──────────────────────────────────────────────────────

export function getRiskCountBySeverity() {
  return {
    critical: riskRegister.filter((r) => r.severity === "critical").length,
    high: riskRegister.filter((r) => r.severity === "high").length,
    medium: riskRegister.filter((r) => r.severity === "medium").length,
    low: riskRegister.filter((r) => r.severity === "low").length,
    info: riskRegister.filter((r) => r.severity === "info").length,
  };
}
