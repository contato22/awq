"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function BiReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/bi" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Relatórios</h1>
            <p className="text-xs text-gray-500">BI · Relatórios</p>
          </div>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-6 py-16 flex flex-col items-center gap-3 text-center">
        <FileText size={32} className="text-gray-200" />
        <p className="text-sm font-medium text-gray-500">Nenhum relatório disponível</p>
      </div>
    </div>
  );
}
