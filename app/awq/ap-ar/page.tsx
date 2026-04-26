"use client";

import Header     from "@/components/Header";
import APARPanel  from "@/components/APARPanel";

export default function APARGroupPage() {
  return (
    <>
      <Header title="AP & AR — Grupo" subtitle="Contas a Pagar · Contas a Receber · Consolidado AWQ Group" />
      <APARPanel buScope="all" />
    </>
  );
}
