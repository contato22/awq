"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Entrada de PPM no portal JACQES — reusa o módulo /awq/ppm travado na BU JACQES.
// Para a role `jacqes`, o lock de BU (server + useLockedBU) já força o escopo;
// o ?bu=JACQES garante o filtro inicial também para roles não-travadas (owner/admin).
export default function JacqesPpmRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/awq/ppm?bu=JACQES"); }, [router]);
  return null;
}
