// ─── /awq/live-shop/marcas/[brand] — Seção da marca (interna, autenticada) ────
// Hub da marca: dados do contrato, grade de conteúdo (horários/roteiros/
// resultados esperados) e o acesso à sua PÁGINA PÚBLICA. SSR com try/catch.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Header from "@/components/Header";
import { ArrowLeft, ExternalLink, Tag, Calendar, ListChecks, Star, Percent, Users, BarChart3, DollarSign, ShoppingBag } from "lucide-react";
import { authOptions } from "@/lib/auth-options";
import {
  getBrand, BRAND_KIND_LABEL, BRAND_STATUS_LABEL, type Brand,
} from "@/lib/live-shop/brands";
import { getContentGrid, type ContentBlock } from "@/lib/live-shop/content";
import { listGuests } from "@/lib/live-shop/guests";
import { getLiveSessions } from "@/lib/live-shop/db";
import { computeSessionResults } from "@/lib/live-shop/session-results";
import { fmtPct, fmtBRL, toReais, type Money } from "@/lib/live-shop/money";
import LiveShopContentGrid from "@/components/LiveShopContentGrid";
import LiveShopGuestManager, { type GuestRow } from "@/components/LiveShopGuestManager";
import LiveShopSetupButton from "@/components/LiveShopSetupButton";
import LiveShopResultsTrend, { type TrendPoint } from "@/components/LiveShopResultsTrend";

const CAN_MANAGE = new Set(["owner", "admin", "live-shop"]);
const CAN_SETUP = new Set(["owner", "admin"]);

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">{icon} {label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export default async function BrandSectionPage({ params }: { params: { brand: string } }) {
  let brand: Brand | null = null;
  let blocks: ContentBlock[] = [];
  let guests: GuestRow[] = [];
  let loadError: string | null = null;

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const canManage = CAN_MANAGE.has(role);
  const canSetup = CAN_SETUP.has(role);

  // BI da marca (interno — pode mostrar financeiro).
  let bi: {
    gmv: Money; netAwq: Money; orders: number; aov: Money; takeRateBps: number;
    itemsPerOrderMilli: number; lives: number; trend: TrendPoint[];
  } | null = null;

  try {
    brand = await getBrand(params.brand);
    if (brand) blocks = await getContentGrid(params.brand);
    if (brand) {
      const sessions = await getLiveSessions();
      const results = computeSessionResults(sessions, brand.revenueShareBps);
      const gmv = results.reduce((a, r) => a + r.gmv, 0);
      const netAwq = results.reduce((a, r) => a + r.netAwq, 0);
      const orders = results.reduce((a, r) => a + r.paidOrders, 0);
      const items = sessions.reduce((a, s) => a + s.items, 0);
      const feesWeighted = results.reduce((a, r) => a + (r.takeRateBps * r.gmv), 0);
      bi = {
        gmv, netAwq, orders,
        aov: orders ? Math.round(gmv / orders) : 0,
        takeRateBps: gmv ? Math.round(feesWeighted / gmv) : 0,
        itemsPerOrderMilli: orders ? Math.round((items / orders) * 1000) : 0,
        lives: results.length,
        trend: [...results].reverse().map((r) => ({
          name: new Date(r.startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          aov: toReais(r.aov), takeRate: r.takeRateBps / 100,
        })),
      };
    }
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
  const itemsPerOrder = bi ? (Math.round(bi.itemsPerOrderMilli / 10) / 100).toFixed(2) : "—";

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
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <ExternalLink size={14} /> Abrir portal da marca
              </a>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Acesso por login individual, isolado da plataforma · <span className="font-mono">{publicHref}</span>
              </p>
            </section>

            {/* BI da marca (interno) — puxa do que já foi entregue */}
            {bi && (
              <section className="rounded-xl border border-gray-200/80 bg-white p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <BarChart3 size={15} className="text-gray-400" /> BI da marca — resultados acumulados ({bi.lives} lives)
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <KpiCard icon={<DollarSign size={12} />} label="GMV total" value={fmtBRL(bi.gmv)} />
                  <KpiCard icon={<Percent size={12} />} label={`Receita AWQ (${fmtPct(brand.revenueShareBps, 0)})`} value={fmtBRL(bi.netAwq)} sub="revenue share" />
                  <KpiCard icon={<ShoppingBag size={12} />} label="Pedidos" value={String(bi.orders)} />
                  <KpiCard icon={<DollarSign size={12} />} label="AOV" value={fmtBRL(bi.aov)} />
                  <KpiCard icon={<Percent size={12} />} label="Take-rate méd." value={fmtPct(bi.takeRateBps, 1)} sub="plataforma s/ GMV" />
                  <KpiCard icon={<ShoppingBag size={12} />} label="Itens/pedido" value={itemsPerOrder} />
                </div>
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium text-gray-500">Tendência por live — AOV &amp; take-rate</p>
                  <LiveShopResultsTrend points={bi.trend} />
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                  Puxado das lives entregues (Anexo B / ls_live_session). Receita AWQ = revenue share ({fmtPct(brand.revenueShareBps, 0)}) sobre o GMV.
                  <Link href="/awq/live-shop/historico" className="ml-1 text-brand-600 hover:text-brand-700">Ver histórico por live →</Link>
                </p>
              </section>
            )}

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
                {canSetup && <div className="mb-4"><LiveShopSetupButton /></div>}
                <LiveShopGuestManager brandId={brand.id} brandName={brand.name} initialGuests={guests} />
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
