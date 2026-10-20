import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadCaptureForm } from "./lead-capture-form";

export const metadata: Metadata = {
  title: "Fale com a gente — AWQ Group",
  description: "Formulário público de contato das marcas do Grupo AWQ.",
  robots: { index: false, follow: false },
};

function LeadCaptureFallback() {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true">
      <div className="h-40 bg-gray-200" />
      <div className="mx-auto mt-8 h-96 max-w-md rounded-2xl border border-gray-100 bg-white shadow-lg" />
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
