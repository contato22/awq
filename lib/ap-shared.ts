// Client-safe types and pure helpers for the AP module.
// This module has NO server-only imports — safe to use in "use client" components.

import type { ManagerialCategory, EntityLayer } from "@/lib/financial-db";

export type { ManagerialCategory, EntityLayer };

export type APStatus = "pendente" | "aprovado" | "pago" | "vencido" | "cancelado";

export interface APEntry {
  id: string;
  accountCode: string;
  accountDescription: string;
  managerialCategory: ManagerialCategory;
  supplierName: string;
  supplierDocument: string | null;
  entity: EntityLayer;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paymentDate: string | null;
  status: APStatus;
  invoiceNumber: string | null;
  description: string | null;
  notes: string | null;
  bankTransactionId: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface APSummary {
  totalPendente:  number;
  totalAprovado:  number;
  totalVencido:   number;
  totalPago:      number;
  countPendente:  number;
  countAprovado:  number;
  countVencido:   number;
  countPago:      number;
  aging: {
    days0to30:  number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
  byCategory: Array<{ category: ManagerialCategory; total: number; count: number }>;
}

export interface CreateAPEntryInput {
  accountCode: string;
  accountDescription: string;
  managerialCategory: ManagerialCategory;
  supplierName: string;
  supplierDocument?: string;
  entity: EntityLayer;
  amount: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  invoiceNumber?: string;
  description?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateAPEntryInput {
  status?: APStatus;
  paymentDate?: string;
  bankTransactionId?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  amount?: number;
  dueDate?: string;
  invoiceNumber?: string;
  description?: string;
}

export function effectiveStatus(entry: APEntry, today = new Date()): APStatus {
  if (entry.status === "pendente" || entry.status === "aprovado") {
    if (new Date(entry.dueDate) < today) return "vencido";
  }
  return entry.status;
}
