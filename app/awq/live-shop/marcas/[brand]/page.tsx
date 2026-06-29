// ─── /awq/live-shop/marcas/[brand] — Seção da marca (interna, autenticada) ────
// Hub da marca: dados do contrato, grade de conteúdo (horários/roteiros/
// resultados esperados) e o acesso à sua PÁGINA PÚBLICA. SSR com try/catch.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Header from "@/components/Header";
import { ArrowLeft, ExternalLink, Tag, Calendar, ListChecks, Star, Percent, Users } from "lucide-react";
import { authOptions } from "@/lib/auth-options";
import {
  getBrand, BRAND_KIND_LABEL, BRAND_STATUS_LABEL, type Brand,
} from "@/lib/live-shop/brands";
import { getContentGrid, type ContentBlock } from "@/lib/live-shop/content";
import { listGuests } from "@/lib/live-shop/guests";
import { fmtPct } from "@/lib/live-shop/money";
import LiveShopContentGrid from "@/components/LiveShopContentGrid";
import LiveShopGuestManager, { type GuestRow } from "@/components/LiveShopGuestManager";

const CAN_MANAGE = new Set(["owner", "admin", "live-shop"]);

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export default async function BrandSectionPage({ params }: { params: { brand: string } }) {
  let brand: Brand | null = null;
  let blocks: ContentBlock[] = [];
  let guests: GuestRow[] = [];
  let loadError: string | null = null;

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const canManage = CAN_MANAGE.has(role);

  try {
    brand = await getBrand(params.brand);
    if (brand) blocks = await getContentGrid(params.brand);
    if (brand && canManage) {
      guests = (await listGuests()).map((g) => ({
        id: g.id, email: g.email, name: g.name, brandIds: g.brandIds, status: g.status,
      }));
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }
  if (!brand && !loadError) notFound();

  const publicHref = `/awq/live-shop/publico/${params.brand}`;

  return (
    <>
      <Header title={brand ? `Live Shop · ${brand.name}` : "Live Shop · Marca"} subtitle="Seção da marca" />
      <main className="px-6 lg:px-8 py-6 space-y-5">
        <Link href="/awq/live-shop/marcas" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
          <ArrowLeft size={13} /> Voltar às marcas
        </Link>

        {loadError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            Erro ao ler a marca. <span className="font-mono">{loadError}</span>
          </div>
        )}

        {brand && (
          <>
            {/* Cabeçalho da marca */}
            <section className="rounded-xl border border-gray-200/80 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{brand.name}</h2>
                {brand.isPilot && <Star size={14} className="text-amber-500" fill="currentColor" />}
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">{BRAND_STATUS_LABEL[brand.status]}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{brand.segment} · {BRAND_KIND_LABEL[brand.kind]}</p>
              <dl className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <div className="flex items-center gap-1.5"><Percent size={13} className="text-gray-400" /> Revenue share: {fmtPct(brand.revenueShareBps, 0)} do GMV</div>
                <div className="flex items-center gap-1.5"><Tag size={13} className="text-gray-400" /> {brand.dealModel}</div>
                {brand.firstLiveAt && (
                  <div className="flex items-center gap-1.5"><Calendar size={13} className="text-gray-400" /> 1ª live: {new Date(brand.firstLiveAt + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                )}
              </dl>
              {brand.notes && <p className="mt-2 text-xs text-gray-400">{brand.notes}</p>}

              <a
                href={publicHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-pink-600 px-3 py-2 text-sm font-medium text-white hover:bg-pink-700"
              >
                <ExternalLink size={14} /> Abrir página pública
              </a>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Acesso sem login, isolado da plataforma · <span className="font-mono">{publicHref}</span>
              </p>
            </section>

            {/* Grade de conteúdo */}
            <section className="rounded-xl border border-gray-200/80 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ListChecks size={15} className="text-gray-400" /> Grade de conteúdo
              </div>
              <LiveShopContentGrid blocks={blocks} />
              <p className="mt-3 text-[11px] text-gray-400">
                Horários, roteiros e resultados esperados por bloco. Editável via dados (seed/ls_content_block).
              </p>
            </section>

            {/* Gerir usuários e permissões (acesso ao portal da marca) */}
            {canManage && (
              <section className="rounded-xl border border-gray-200/80 bg-white p-5">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Users size={15} className="text-gray-400" /> Usuários &amp; permissões
                </div>
                <p className="mb-4 text-xs text-gray-400">
                  Crie um login individual e libere o acesso ao portal desta marca. O portal exige login
                  (não é mais aberto). Convidados só enxergam {brand.name} — nada da Plataforma.
                </p>
                <LiveShopGuestManager brandId={brand.id} brandName={brand.name} initialGuests={guests} />
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
