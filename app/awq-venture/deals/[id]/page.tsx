// Server wrapper — required for static export (output: "export")
// generateStaticParams pre-generates all known deal pages at build time.
// The actual UI lives in DealWorkspacePage.tsx ("use client").
import { dealWorkspaces } from "@/lib/deal-data";
import DealWorkspacePage from "./DealWorkspacePage";

export function generateStaticParams() {
  return dealWorkspaces.map((d) => ({ id: d.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <DealWorkspacePage params={params} />;
}
