"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard, FileText, BarChart3, LineChart } from "lucide-react";

const ITEMS = [
  { label: "Relatórios",      desc: "Relatórios salvos e compartilhados",    href: "/awq/bi/reports",        icon: FileText,       color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Analytics",       desc: "Análises e KPIs configurados",          href: "/awq/bi/analytics",      icon: BarChart3,      color: "text-blue-600",    bg: "bg-blue-50"    },
  { label: "Visualizações",   desc: "Gráficos e dashboards interativos",     href: "/awq/bi/visualizations", icon: LineChart,      color: "text-violet-600",  bg: "bg-violet-50"  },
];

export default function BiDashboardsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <LayoutDashboard size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">BI</h1>
            <p className="text-xs text-gray-500">Business Intelligence · AWQ Group</p>
          </div>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 hover:border-gray-300 hover:shadow-sm transition-all group">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={item.color} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
