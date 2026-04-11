"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// CS Ops consolidado no CRM Health — /jacqes/crm/health
export default function CsOpsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/jacqes/crm/health"); }, [router]);
  return null;
}
