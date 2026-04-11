"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Customers consolidado no CRM Clientes — /jacqes/crm/clientes
export default function CustomersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/jacqes/crm/clientes"); }, [router]);
  return null;
}
