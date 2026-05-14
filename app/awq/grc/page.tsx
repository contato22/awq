"use client";

import Link from "next/link";
import { ShieldCheck, AlertTriangle, FileText, ClipboardList, Lock } from "lucide-react";

const MODULES = [
  {
    href: "/awq/grc/risks",
    label: "Riscos",
    description: "Identifique, avalie e trate riscos corporativos",
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-50 group-hover:bg-orange-100",
  },
  {
    href: "/awq/grc/controls",
    label: "Controles",
    description: "Gerencie controles internos preventivos e detectivos",
    icon: Lock,
    color: "text-blue-500",
    bg: "bg-blue-50 group-hover:bg-blue-100",
  },
  {
    href: "/awq/grc/policies",
    label: "Políticas",
    description: "Centralize políticas corporativas e versões vigentes",
    icon: FileText,
    color: "text-purple-500",
    bg: "bg-purple-50 group-hover:bg-purple-100",
  },
  {
    href: "/awq/grc/audits",
    label: "Auditorias",
    description: "Planeje e acompanhe auditorias internas e externas",
    icon: ClipboardList,
    color: "text-green-500",
    bg: "bg-green-50 group-hover:bg-green-100",
  },
];

export default function GrcHubPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <ShieldCheck size={20} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">GRC</h1>
            <p className="text-xs text-gray-500">Governance · Risk · Compliance</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODULES.map(({ href, label, description, icon: Icon, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all flex flex-col gap-4"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${bg}`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
