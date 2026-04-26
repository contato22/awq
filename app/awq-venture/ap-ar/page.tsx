"use client";

import Header    from "@/components/Header";
import APARPanel from "@/components/APARPanel";

export default function VentureAPARPage() {
  return (
    <>
      <Header title="AP & AR — AWQ Venture" subtitle="Contas a Pagar · Contas a Receber · AWQ Venture" />
      <APARPanel buScope="venture" />
    </>
  );
}
