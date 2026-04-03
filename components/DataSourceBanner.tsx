import Link from "next/link";
import { Database, HardDrive } from "lucide-react";
import type { DataBridgeResult } from "@/lib/financial-data-bridge";

interface DataSourceBannerProps {
  data: DataBridgeResult;
}

export default function DataSourceBanner({ data }: DataSourceBannerProps) {
  if (data.source === "pipeline") {
    const updated = data.lastUpdated
      ? new Date(data.lastUpdated).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
        <Database size={12} className="shrink-0" />
        <span className="font-medium">Dados do pipeline</span>
        <span className="text-emerald-600">·</span>
        <span>
          {data.documentCount} extrato{data.documentCount !== 1 ? "s" : ""} ·{" "}
          {data.transactionCount} transaç{data.transactionCount !== 1 ? "ões" : "ão"}
        </span>
        {updated && (
          <>
            <span className="text-emerald-600">·</span>
            <span>Atualizado {updated}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
      <HardDrive size={12} className="shrink-0" />
      <span className="font-medium">Dados em snapshot</span>
      <span className="text-amber-600">·</span>
      <span>Nenhum extrato ingerido ainda.</span>
      <Link
        href="/awq/ingest"
        className="font-semibold underline underline-offset-2 hover:text-amber-900 transition-colors"
      >
        Ingerir extratos →
      </Link>
    </div>
  );
}
