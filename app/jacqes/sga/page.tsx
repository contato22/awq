"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SgaRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/jacqes/fpa");
  }, [router]);
  return null;
}
