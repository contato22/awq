"use client";

// BankReconciliationBoard — Conta Azul-style side-by-side bank reconciliation
//
// LEFT column  → raw bank statement entry (date, description, bank amount)
// CENTER       → match quality badge + "Conciliar" action
// RIGHT column → system record (counterparty, category, classification note)
//
// TABS:
//   "Conciliações pendentes" → reconciliationStatus ∉ {conciliado, descartado}
//   "Movimentações"          → reconciliationStatus === conciliado
//
// PERSISTENCE: mirrors ReconciliationReviewTable (isStatic → localStorage,
//   otherwise PATCH /api/transactions/[id]).