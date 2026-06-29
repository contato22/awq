// ─── /awq/live-shop/publico → redireciona para a página pública da marca-piloto ─
// A página pública agora é POR MARCA (/awq/live-shop/publico/[brand]). Esta rota
// raiz manda para a marca-piloto (Bless Rio) por conveniência. Pública (sem login).

import { redirect } from "next/navigation";
import { getPilotBrandId } from "@/lib/live-shop/brands";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export default async function LiveShopPublicRootPage() {
  const pilot = (await getPilotBrandId().catch(() => null)) ?? "bless-rio";
  redirect(`/awq/live-shop/publico/${pilot}`);
}
