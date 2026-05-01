"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Building2, Users, Target, Activity, Globe,
  Phone, Mail, MapPin, CheckCircle2, AlertTriangle,
} from "lucide-react";
import type { CrmAccount, CrmContact, CrmOpportunity, CrmActivity } from "@/lib/crm-types";
import { SEED_ACCOUNTS, SEED_CONTACTS, SEED_OPPORTUNITIES, SEED_ACTIVITIES } from "@/lib/crm-db";
import { formatBRL, formatDateBR } from "@/lib/utils";

const STAGE_COLORS: Record<string, string> = {
  discovery:"bg-blue-100 text-blue-700", qualification:"bg-violet-100 text-violet-700",
  proposal:"bg-amber-100 text-amber-700", negotiation:"bg-orange-100 text-orange-700",
  closed_won:"bg-emerald-100 text-emerald-700", closed_lost:"bg-red-100 text-red-700",
};
const STAGE_PT: Record<string, string> = {
  discovery:"Discovery", qualification:"Qualification", proposal:"Proposal",
  negotiation:"Negotiation", closed_won:"Ganho", closed_lost:"Perdido",
};
const ACT_ICONS: Record<string, ReactNode> = {
  call:    <Phone    size={13} className="text-emerald-500" />,
  email:   <Mail     size={13} className="text-blue-500" />,
  meeting: <Users    size={13} className="text-violet-500" />,
  task:    <CheckCircle2 size={13} className="text-amber-500" />,
  note:    <Activity size={13} className="text-gray-400" />,
};

export default function AccountDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [account,      setAccount]      = useState<CrmAccount | null>(null);
  const [contacts,     setContacts]     = useState<CrmContact[]>([]);
  const [opportunities,setOpps]         = useState<CrmOpportunity[]>([]);
  const [activities,   setActivities]   = useState<CrmActivity[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/crm/accounts?id=${id}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data.account) {
          setAccount(res.data.account);
          setContacts(res.data.contacts ?? []);
          setOpps(res.data.opportunities ?? []);
          setActivities(res.data.activities ?? []);
        } else {
          const seedOpps = SEED_OPPORTUNITIES.filter(o => o.account_id === id);
          const oppIds   = new Set(seedOpps.map(o => o.opportunity_id));
          setAccount(SEED_ACCOUNTS.find(a => a.account_id === id) ?? null);
          setContacts(SEED_CONTACTS.filter(c => c.account_id === id));
          setOpps(seedOpps);
          setActivities(SEED_ACTIVITIES.filter(a =>
            (a.related_to_type === "account"     && a.related_to_id === id) ||
            (a.related_to_type === "opportunity" && oppIds.has(a.related_to_id))
          ));
        }
      })
      .catch(() => {
        const seedOpps = SEED_OPPORTUNITIES.filter(o => o.account_id === id);
        const oppIds   = new Set(seedOpps.map(o => o.opportunity_id));
        setAccount(SEED_ACCOUNTS.find(a => a.account_id === id) ?? null);
        setContacts(SEED_CONTACTS.filter(c => c.account_id === id));
        setOpps(seedOpps);
        setActivities(SEED_ACTIVITIES.filter(a =>
          (a.related_to_type === "account"     && a.related_to_id === id) ||
          (a.related_to_type === "opportunity" && oppIds.has(a.related_to_id))
        ));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <>
      <Header title="Conta" subtitle="Carregando…" />
      <div className="page-container">
        <div className="card p-8 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
        </div>
      </div>
    </>
  );

  if (!account) return (
    <>
      <Header title="Conta não encontrada" />
      <div className="page-container">
        <EmptyState title="Conta não encontrada" description="Verifique o ID e tente novamente."
          action={<Link href="/crm/accounts" className="text-brand-600 text-sm font-medium">← Voltar para Contas</Link>} />
      </div>
    </>
  );

  const openOpps  = opportunities.filter((o: CrmOpportunity) => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const pipelineValue = openOpps.reduce((s: number, o: CrmOpportunity) => s + o.deal_value, 0);

  return (
    <>
      <Header title={account.trade_name ?? account.account_name} subtitle={`${account.account_code} · ${account.account_type}`} />
      <div className="page-container">

        <div className="flex items-center gap-2 text-xs text-gray-500 -mt-2">
          <Link href="/crm/accounts" className="hover:text-brand-600 transition-colors">Contas</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{account.account_name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left — Profile */}
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-brand-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-base leading-snug">{account.account_name}</h2>
                  {account.trade_name && account.trade_name !== account.account_name && (
                    <p className="text-xs text-gray-500">{account.trade_name}</p>
                  )}
                  <span className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    account.account_type === "customer" ? "bg-emerald-50 text-emerald-700" :
                    account.account_type === "prospect" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {{"customer":"Cliente","prospect":"Prospect","partner":"Parceiro","former_customer":"Ex-Cliente"}[account.account_type] ?? account.account_type}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {account.document_number && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium text-gray-500 w-14 shrink-0">CNPJ</span>
                    {account.document_number}
                  </div>
                )}
                {account.industry && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium text-gray-500 w-14 shrink-0">Setor</span>
                    {{"tech":"Tecnologia","finance":"Finanças","education":"Educação","health":"Saúde","media":"Mídia","retail":"Varejo","other":"Outro"}[account.industry] ?? account.industry}
                  </div>
                )}
                {account.company_size && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium text-gray-500 w-14 shrink-0">Porte</span>
                    {account.company_size} funcionários
                  </div>
                )}
                {account.owner && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium text-gray-500 w-14 shrink-0">Owner</span>
                    {account.owner}
                  </div>
                )}
                {(account.address_city || account.address_state) && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin size={11} className="text-gray-400 shrink-0" />
                    {[account.address_city, account.address_state].filter(Boolean).join(", ")}
                  </div>
                )}
                {account.website && (
                  <a href={account.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-brand-600 hover:underline">
                    <Globe size={11} className="shrink-0" /> {account.website}
                  </a>
                )}
              </div>
            </div>

            {/* Health */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">Saúde da Conta</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">{account.health_score}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  account.health_score >= 80 ? "bg-emerald-50 text-emerald-700" :
                  account.health_score >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                }`}>
                  {account.health_score >= 80 ? "Saudável" : account.health_score >= 60 ? "Atenção" : "Em Risco"}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  account.health_score >= 80 ? "bg-emerald-500" : account.health_score >= 60 ? "bg-amber-500" : "bg-red-500"
                }`} style={{ width: `${account.health_score}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>Churn Risk: <span className={`font-medium ${account.churn_risk === "high" ? "text-red-600" : account.churn_risk === "medium" ? "text-amber-600" : "text-emerald-600"}`}>{{"low":"Baixo","medium":"Médio","high":"Alto"}[account.churn_risk] ?? account.churn_risk}</span></span>
                {account.renewal_date && <span>Renova: {formatDateBR(account.renewal_date)}</span>}
              </div>
            </div>
          </div>

          {/* Right — Details */}
          <div className="lg:col-span-2 space-y-5">

            {/* Contacts */}
            <div className="card p-5">
              <SectionHeader icon={<Users size={14} />} title={`Contatos (${contacts.length})`}
                linkLabel="+ Adicionar" linkHref={`/crm/contacts/add?account_id=${id}`} />
              {contacts.length === 0
                ? <EmptyState compact title="Nenhum contato cadastrado" />
                : (
                  <div className="space-y-3">
                    {contacts.map(c => (
                      <div key={c.contact_id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                          {c.full_name.split(" ").slice(0,2).map(n=>n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-gray-900">{c.full_name}</p>
                            {c.is_primary_contact && <span className="text-[9px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">Principal</span>}
                          </div>
                          <p className="text-[11px] text-gray-500">{c.job_title ?? "—"}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {c.email && <a href={`mailto:${c.email}`} className="text-gray-400 hover:text-blue-500"><Mail size={14} /></a>}
                          {c.phone && <a href={`tel:${c.phone}`} className="text-gray-400 hover:text-emerald-500"><Phone size={14} /></a>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Opportunities */}
            <div className="card p-5">
              <SectionHeader icon={<Target size={14} />} title={`Oportunidades (${opportunities.length})`} />
              {opportunities.length === 0
                ? <EmptyState compact title="Nenhuma oportunidade" />
                : (
                  <div className="space-y-2">
                    {opportunities.map(o => (
                      <div key={o.opportunity_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{o.opportunity_name}</p>
                          <p className="text-[10px] text-gray-500">{o.owner} · {formatDateBR(o.expected_close_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatBRL(o.deal_value)}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STAGE_COLORS[o.stage] ?? "bg-gray-100 text-gray-600"}`}>
                            {STAGE_PT[o.stage] ?? o.stage}
                          </span>
                        </div>
                      </div>
                    ))}
                    {openOpps.length > 0 && (
                      <div className="pt-1 text-xs text-gray-500 font-medium">
                        Pipeline aberto: <span className="text-gray-900 font-bold">{formatBRL(pipelineValue)}</span>
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Activity Timeline */}
            <div className="card p-5">
              <SectionHeader icon={<Activity size={14} />} title="Atividades" />
              {activities.length === 0
                ? <EmptyState compact title="Sem atividades registradas" />
                : (
                  <div className="space-y-3">
                    {activities.slice(0, 8).map(a => (
                      <div key={a.activity_id} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          {ACT_ICONS[a.activity_type] ?? <Activity size={13} className="text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900">{a.subject}</p>
                          {a.description && <p className="text-[11px] text-gray-500 line-clamp-1">{a.description}</p>}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{formatDateBR(a.completed_at ?? a.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
