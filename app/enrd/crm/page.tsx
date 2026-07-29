"use client";
// ─── /enrd/crm — CRM dedicado da BU ENRD ─────────────────────────────────────
// Mesma base e mesma experiência do CRM Tower (/crm/rfm — matriz RFM), mas
// travado só na BU ENRD: puxa da MESMA fonte (/api/crm/rfm?bu=ENRD, que lê
// crm_accounts/crm_opportunities no ERP), sem o seletor de BU do CRM geral.

import CrmRfmView from "@/components/CrmRfmView";

export default function EnrdCrmPage() {
  return (
    <CrmRfmView
      lockedBu="ENRD"
      title="CRM — ENRD"
      subtitle="Matriz RFM · clientes da Agência Solar (Recência, Frequência, Monetário)"
    />
  );
}
