"use client";

import type { Lead, Channel } from "./leads";
import type { CaseItem } from "./cases";
import type { Lancamento } from "./financeiro";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    window.location.href = "/patricia-canto/login";
    throw new Error("Não autenticado");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data as T;
}

export const pcApi = {
  getLeads: () => req<{ leads: Lead[] }>("/api/patricia-canto/leads").then((d) => d.leads),
  createLead: (lead: Lead) => req("/api/patricia-canto/leads", { method: "POST", body: JSON.stringify(lead) }),
  updateLead: (lead: Lead) =>
    req(`/api/patricia-canto/leads/${lead.id}`, { method: "PATCH", body: JSON.stringify(lead) }),
  deleteLead: (id: string) => req(`/api/patricia-canto/leads/${id}`, { method: "DELETE" }),

  getCases: () => req<{ cases: CaseItem[] }>("/api/patricia-canto/cases").then((d) => d.cases),
  createCase: (item: CaseItem) => req("/api/patricia-canto/cases", { method: "POST", body: JSON.stringify(item) }),
  updateCase: (item: CaseItem) =>
    req(`/api/patricia-canto/cases/${item.id}`, { method: "PATCH", body: JSON.stringify(item) }),
  deleteCase: (id: string) => req(`/api/patricia-canto/cases/${id}`, { method: "DELETE" }),

  getLancamentos: () =>
    req<{ lancamentos: Lancamento[] }>("/api/patricia-canto/lancamentos").then((d) => d.lancamentos),
  createLancamento: (item: Lancamento) =>
    req("/api/patricia-canto/lancamentos", { method: "POST", body: JSON.stringify(item) }),
  updateLancamento: (item: Lancamento) =>
    req(`/api/patricia-canto/lancamentos/${item.id}`, { method: "PATCH", body: JSON.stringify(item) }),
  deleteLancamento: (id: string) => req(`/api/patricia-canto/lancamentos/${id}`, { method: "DELETE" }),

  getInvestment: () =>
    req<{ investment: Partial<Record<Channel, number>> }>("/api/patricia-canto/settings").then((d) => d.investment),
  setInvestment: (investment: Partial<Record<Channel, number>>) =>
    req("/api/patricia-canto/settings", { method: "PUT", body: JSON.stringify(investment) }),

  logout: () => req("/api/patricia-canto/auth/logout", { method: "POST" }),
};
