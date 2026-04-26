"use client";

import Header    from "@/components/Header";
import APARPanel from "@/components/APARPanel";

export default function JacqesAPARPage() {
  return (
    <>
      <Header title="AP & AR — JACQES" subtitle="Contas a Pagar · Contas a Receber · JACQES" />
      <APARPanel buScope="jacqes" />
    </>
  );
}
