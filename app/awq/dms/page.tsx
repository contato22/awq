"use client";

import Link from "next/link";
import { ArrowLeft, FileText, FolderOpen, GitBranch, Users2 } from "lucide-react";

const ITEMS = [
  { label: "Arquivos",        desc: "Documentos e arquivos do grupo",          href: "/awq/dms/files",         icon: FolderOpen,  color: "text-amber-600",   bg: "bg-amber-50"   },
  { label: "Colaboração",     desc: "Revisão e aprovação de documentos",       href: "/awq/dms/collaboration", icon: Users2,      color: "text-blue-600",    bg: "bg-blue-50"    },
  { label: "Versionamento",   desc: "Histórico e controle de versões",         href: "/awq/dms/versioning",    icon: GitBranch,   color: "text-violet-600",  bg: "bg-violet-50"  },
];

export default function DocumentosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <FileText size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">DMS</h1>
            <p className="text-xs text-gray-500">Gestão de Documentos · AWQ Group</p>
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
