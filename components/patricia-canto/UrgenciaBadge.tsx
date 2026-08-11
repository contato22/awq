"use client";

import type { Urgencia } from "@/lib/patricia-canto/rfm";
import { URGENCIA_LABEL } from "@/lib/patricia-canto/rfm";

const URGENCIA_STYLE: Record<Urgencia, string> = {
  alta: "bg-rose-50 text-rose-700",
  media: "bg-amber-50 text-amber-700",
  baixa: "bg-canto-100 text-canto-500",
};

export default function UrgenciaBadge({ urgencia }: { urgencia: Urgencia }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${URGENCIA_STYLE[urgencia]}`}
    >
      {URGENCIA_LABEL[urgencia]}
    </span>
  );
}
