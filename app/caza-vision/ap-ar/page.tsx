"use client";

import Header    from "@/components/Header";
import APARPanel from "@/components/APARPanel";

export default function CazaAPARPage() {
  return (
    <>
      <Header title="AP & AR — Caza Vision" subtitle="Contas a Pagar · Contas a Receber · Caza Vision" />
      <APARPanel buScope="caza" />
    </>
  );
}
