// ─── /awq/live-shop/publico/[brand] — Portal da marca (login individual) ──────
//
// Acesso por LOGIN individual (convidado 'live-guest' liberado por marca, ou
// usuário interno). Gate no middleware; standalone (LayoutShell bare). Sem links
// para a Plataforma. Seções: BI · GRADE · COMISSÕES. Sem dado financeiro interno
// (GMV/MC/ROIC/Net) — comissões = host/creator (operacional).

import { notFound } from "next/navigation";
import {
  Radio, Eye, Users, Sparkles, Calendar, Clock, BarChart3,
  Package, UserCircle, Target, ClipboardList, Percent,
} from "lucide-react";
import { getPublicBrandPage } from "@/lib/live-shop/public";
import { LIVE_PLAN_STATUS_LABEL } from "@/lib/live-shop/agenda";
import LiveShopPublicBI from "@/components/LiveShopPublicBI";
import LiveShopCalendar from "@/components/LiveShopCalendar";
import LiveShopPortalTabs from "@/components/LiveShopPortalTabs";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export async function generateMetadata({ params }: { params: { brand: string } }) {
  const data = await getPublicBrandPage(params.brand).catch(() => null);
  return {
    title: data ? `${data.brand.name} · AWQ Live Shop` : "AWQ Live Shop",
    description: "Portal da marca — BI, grade e comissões.",
  };
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-center">
      <div className="mb-1 flex justify-center text-pink-400">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40">
      {icon} {children}
    </h2>
  );
}

function Detail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="text-xs text-white/60">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/40">{icon} {label}</p>
      {children}
    </div>
  );
}

export default async function LiveShopPortalPage({ params }: { params: { brand: string } }) {
  const data = await getPublicBrandPage(params.brand).catch(() => null);
  if (!data) notFound();

  const fmtInt = (n: number) => n.toLocaleString("pt-BR");
  const fmtDuration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min}min`);
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  // ── BI ──────────────────────────────────────────────────────────────────────
  const biNode = (
    <div className="space-y-12">
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Sparkles size={18} />} value={String(data.sessionCount)} label="Lives" />
        <Stat icon={<Eye size={18} />} value={fmtInt(data.totalViews)} label="Views" />
        <Stat icon={<Users size={18} />} value={fmtInt(data.peakCcv)} label="Pico ao vivo" />
      </div>
      <section>
        <SectionTitle icon={<BarChart3 size={13} />}>Alcance &amp; engajamento por live</SectionTitle>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <LiveShopPublicBI events={data.events} />
        </div>
        <p className="mt-2 text-center text-[11px] text-white/30">
          Métricas de audiência. Indicadores comerciais internos não são exibidos aqui.
        </p>
      </section>
      <section>
        <SectionTitle icon={<Clock size={13} />}>Histórico de lives</SectionTitle>
        {data.events.length === 0 ? (
          <p className="text-center text-sm text-white/40">Nenhuma live realizada ainda.</p>
        ) : (
          <div className="space-y-2">
            {data.events.map((e) => (
              <div key={e.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-600/20 text-pink-300"><Radio size={15} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{fmtDateTime(e.startedAt)}</p>
                  <p className="flex items-center gap-1.5 text-xs text-white/40"><Clock size={11} /> {fmtDuration(e.durationMin)}</p>
                </div>
                <div className="hidden gap-6 text-right sm:flex">
                  <div><p className="text-sm font-semibold text-white">{fmtInt(e.views)}</p><p className="text-[10px] uppercase tracking-wide text-white/30">views</p></div>
                  <div><p className="text-sm font-semibold text-white">{fmtInt(e.peakCcv)}</p><p className="text-[10px] uppercase tracking-wide text-white/30">pico</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  // ── GRADE (calendário + agenda detalhada) ────────────────────────────────────
  const gradeNode = (
    <div className="space-y-12">
      <section>
        <SectionTitle icon={<Calendar size={13} />}>Calendário</SectionTitle>
        <LiveShopCalendar entries={data.calendar} dark />
      </section>
      {data.agenda.length > 0 && (
        <section>
          <SectionTitle icon={<ClipboardList size={13} />}>Agenda das próximas lives</SectionTitle>
          <div className="space-y-4">
            {data.agenda.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-white/40">{fmtDateTime(p.startsAt)}</p>
                    <p className="text-base font-semibold text-white">{p.title}</p>
                  </div>
                  <span className="rounded-full bg-pink-600/20 px-2.5 py-0.5 text-[11px] font-medium text-pink-200">{LIVE_PLAN_STATUS_LABEL[p.status]}</span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Detail icon={<Package size={12} />} label="Peças"><ul className="space-y-0.5">{p.pecas.map((x, i) => <li key={i}>· {x}</li>)}</ul></Detail>
                  <Detail icon={<UserCircle size={12} />} label="Responsáveis"><ul className="space-y-0.5">{p.responsaveis.map((r, i) => <li key={i}>{r.role}: <span className="text-white/80">{r.name}</span></li>)}</ul></Detail>
                  <Detail icon={<ClipboardList size={12} />} label="Roteiro"><p>{p.roteiro}</p></Detail>
                  <Detail icon={<Target size={12} />} label="Metas"><ul className="space-y-0.5">{p.metas.map((x, i) => <li key={i}>· {x}</li>)}</ul></Detail>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // ── COMISSÕES (por live) ──────────────────────────────────────────────────────
  const comissoesNode = (
    <section>
      <SectionTitle icon={<Percent size={13} />}>Comissões por live</SectionTitle>
      {data.agenda.every((p) => p.comissoes.length === 0) ? (
        <p className="text-center text-sm text-white/40">Sem comissões cadastradas.</p>
      ) : (
        <div className="space-y-3">
          {data.agenda.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-semibold text-white">{p.title}</p>
                <p className="text-[11px] text-white/40">{fmtDateTime(p.startsAt)}</p>
              </div>
              <ul className="divide-y divide-white/5">
                {p.comissoes.map((c, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-white/60">{c.label}</span>
                    <span className="font-medium text-white">{c.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-center text-[11px] text-white/30">
        Comissões de host/creator (operacional). Não representam o resultado financeiro da AWQ.
      </p>
    </section>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] via-[#0d1424] to-[#0a0e1a] text-white">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-pink-600/15 px-4 py-1.5 text-sm font-medium text-pink-300">
            <Radio size={14} /> AWQ Live Shop
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.brand.name}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/50">{data.brand.segment} · {data.brand.kind}</p>
        </div>

        <LiveShopPortalTabs
          tabs={[
            { id: "bi", label: "BI", node: biNode },
            { id: "grade", label: "Grade", node: gradeNode },
            { id: "comissoes", label: "Comissões", node: comissoesNode },
          ]}
        />

        <footer className="mt-16 text-center text-xs text-white/30">© {new Date().getFullYear()} AWQ Group · Live Shop</footer>
      </main>
    </div>
  );
}
