"use client";

import Header    from "@/components/Header";
import APARPanel from "@/components/APARPanel";

export default function AdvisorAPARPage() {
  return (
    <>
      <Header title="AP & AR — Advisor" subtitle="Contas a Pagar · Contas a Receber · Advisor" />
      <APARPanel buScope="advisor" />
    </>
  );
}
