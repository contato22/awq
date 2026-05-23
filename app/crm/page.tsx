"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLockedBU } from "@/lib/use-locked-bu";
import Header from "@/components/Header";
import CrmDashboardView from "@/components/CrmDashboardView";
import { Target, Users, UserPlus, ArrowUpRight, TrendingUp, Zap, Briefcase } from "lucide-react";

const BU_CARDS = [
  { slug: "jacqes",  label: "JACQES",       desc: "Agência",        icon: Target,     color: "bg-blue-600",    border: "border-blue-100",    bg: "bg-blue-50/60",    accent: "text-blue-700"    },
  { slug: "caza",    label: "Caza Vision",   desc: "Produtora",      icon: Users,      color: "bg-emerald-600", border: "border-emerald-100", bg: "bg-emerald-50/60", accent: "text-emerald-700" },
  { slug: "advisor", label: "Advisor",       desc: "Consultoria",    icon: Briefcase,  color: "bg-violet-600",  border: "border-violet-100",  bg: "bg-violet-50/60",  accent: "text-violet-700"  },
  { slug: "venture", label: "AWQ Venture",   desc: "Investimentos",  icon: TrendingUp, color: "bg-amber-600",   border: "border-amber-100",   bg: "bg-amber-50/60",   accent: "text-amber-700"   },
  { slug: "enrd",    label: "ENRD",          desc: "Energia Solar",  icon: Zap,        color: "bg-orange-600",  border: "border-orange-100",  bg: "bg-orange-50/60",  accent: "text-orange-700"  },
];

const BU_SLUG_MAP: Record<string, string> = {
  JACQES: "jacqes", CAZA: "caza", ADVISOR: "advisor", VENTURE: "venture", ENRD: "enrd",
};

export default function CrmHubPage() {
  const { lockedBU, sessionLoading } = useLockedBU();
  const router = useRouter();

  useEffect(() => {
    if (!sessionLoading && lockedBU) {
      router.replace(`/crm/${BU_SLUG_MAP[lockedBU] ?? lockedBU.toLowerCase()}`);
    }
  }, [lockedBU, sessionLoading, router]);

  if (sessionLoading || lockedBU) return null;

  return (
    <>
      <Header title="CRM Hub" subtitle="Controle de pipeline e vendas · AWQ Group" />
      <div className="page-container">

        {/* BU selector cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {BU_CARDS.map(bu => {
            const Icon = bu.icon;
            return (
              <Link key={bu.slug} href={`/crm/${bu.slug}`}
                className={`group card p-5 border ${bu.border} ${bu.bg} hover:shadow-md transition-all hover:-translate-y-0.5`}>
                <div className={`w-9 h-9 rounded-xl ${bu.color} flex items-center justify-center mb-3 shadow-sm`}>
                  <Icon size={16} className="text-white" />
                </div>
                <div className={`text-sm font-bold ${bu.accent}`}>{bu.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{bu.desc}</div>
                <div className={`mt-3 text-[11px] font-semibold ${bu.accent} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Abrir CRM <ArrowUpRight size={11} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Consolidated global view */}
        <CrmDashboardView />

      </div>
    </>
  );
}
