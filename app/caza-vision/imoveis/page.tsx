// ─── Legacy redirect ──────────────────────────────────────────────────────────
//
// /caza-vision/imoveis was the original route for audiovisual projects.
// The canonical route is now /caza-vision/projetos.
//
// This file exists only for backward compatibility (bookmarks, external links).
// It performs an immediate client-side redirect to the canonical route.
//
// DO NOT add content here. Canonical page: app/caza-vision/projetos/page.tsx
// Registered as status: "redirect" in lib/platform-registry.ts

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ImovelLegacyRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/caza-vision/projetos");
  }, [router]);
  return null;
}
