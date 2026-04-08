// Server wrapper — required for static export (output: "export")
// generateStaticParams pre-generates all known deal share pages at build time.
// The actual UI lives in SharePage.tsx ("use client").
import { dealWorkspaces } from "@/lib/deal-data";
import SharePage from "./SharePage";

export function generateStaticParams() {
  return dealWorkspaces.map((d) => ({ id: d.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <SharePage params={params} />;
}
