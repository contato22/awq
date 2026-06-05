"use client";

// ─── BuildSHAGuard ───────────────────────────────────────────────────────────
// Mounted no RootLayout. A cada navegação inicial:
//   1) Compara o SHA embutido no bundle (NEXT_PUBLIC_BUILD_SHA, baked at build
//      time pelo next.config.mjs a partir de VERCEL_GIT_COMMIT_SHA) com o SHA
//      que /api/health reporta do servidor (build.commitSha, injetado em
//      runtime pelo mesmo system env var).
//   2) Se divergirem, o cliente está com bundle stale: desregistra qualquer
//      service worker zumbi, esvazia a Cache API, marca sessionStorage e dá
//      UM reload. A flag em sessionStorage impede loop infinito.
//   3) Independente de match, sempre tenta unregister de service workers
//      órfãos (de deploys antigos com PWA experimental, por exemplo) numa
//      tentativa silenciosa — efeito colateral nulo se não houver SW.
//
// Não usa state nem render — efeito puro, devolve null.

import { useEffect } from "react";

const RESET_FLAG = "awq:build-sha-reset";

async function nukeStaleClient(): Promise<void> {
  // Desregistra TODOS os service workers registrados nesse origin
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    } catch { /* SW API indisponível ou bloqueada — segue */ }
  }
  // Esvazia Cache API (caches que SW criou ou que código antigo populou)
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    } catch { /* Cache API indisponível — segue */ }
  }
}

export default function BuildSHAGuard(): null {
  useEffect(() => {
    // SSR-safe: useEffect só roda no client
    const bundleSha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "";
    if (!bundleSha || bundleSha === "dev") return;

    // Cleanup proativo de SW zumbi (sem reload) — silencioso, idempotente
    void nukeStaleClient().catch(() => undefined);

    // Verifica match com o servidor
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 8000);

    fetch("/api/health", { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then(async (data: { build?: { commitSha?: string | null } }) => {
        const serverSha = data?.build?.commitSha ?? "";
        if (!serverSha) return;
        if (serverSha === bundleSha) return;

        // Mismatch: bundle stale. Evita loop com flag em sessionStorage.
        const alreadyReset = sessionStorage.getItem(RESET_FLAG);
        if (alreadyReset === serverSha) {
          // Já tentamos resetar pra esse SHA e ainda divergem — para de tentar
          // (provavelmente bug no env injection, não cache; reportar e seguir)
          // eslint-disable-next-line no-console
          console.warn(`[BuildSHAGuard] bundle=${bundleSha} server=${serverSha} — reset não resolveu, parando.`);
          return;
        }

        // eslint-disable-next-line no-console
        console.warn(`[BuildSHAGuard] bundle stale (bundle=${bundleSha} server=${serverSha}). Limpando SW/caches e recarregando.`);
        sessionStorage.setItem(RESET_FLAG, serverSha);
        await nukeStaleClient();
        // Cache-bust o reload — Chrome às vezes serve a mesma navigation
        // response do disk cache mesmo após Clear Site Data; o param força
        // a edge a entregar bytes frescos.
        const url = new URL(window.location.href);
        url.searchParams.set("_b", serverSha.slice(0, 7));
        window.location.replace(url.toString());
      })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(t));
  }, []);

  return null;
}
