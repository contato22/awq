import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadCaptureForm } from "./lead-capture-form";

export const metadata: Metadata = {
  title: "Fale com a gente — AWQ Group",
  description: "Formulário público de contato das marcas do Grupo AWQ.",
  // Fora de links e de sitemap: o envio ainda não grava lead.
  robots: { index: false, follow: false },
};

function LeadCaptureFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-10 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest">AWQ Group</p>
        <h1 className="mb-1 mt-3 text-2xl font-bold">JACQES</h1>
      </div>
      <div className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-gray-100 bg-white px-6 py-6 shadow-lg">
        <h2 className="text-base font-bold text-gray-900">Fale com a gente</h2>
        <p className="mt-1 text-xs text-gray-600">
          <span aria-hidden="true">* </span>obrigatório
        </p>
      </div>
    </div>
  );
}

export default function LeadCapturePage() {
  return (
    <Suspense fallback={<LeadCaptureFallback />}>
      <LeadCaptureForm />
    </Suspense>
  );
}
