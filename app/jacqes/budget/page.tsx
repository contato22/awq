"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Rota consolidada — hub canônico FP&A
export default function Redirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/jacqes/fpa"); }, [router]);
  return null;
}
