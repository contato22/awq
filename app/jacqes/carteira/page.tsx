"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Carteira consolidada no CRM — /jacqes/crm/carteira
export default function CarteiraRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/jacqes/crm/carteira"); }, [router]);
  return null;
}
