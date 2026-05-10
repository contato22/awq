// Server wrapper — required for static export (output: "export")
// generateStaticParams pre-generates all known portco pages at build time.
// In SSR (Vercel): dynamic params resolved at runtime via Neon.
// In static export (GitHub Pages): only seed portcos pre-generated.
import { SEED_PORTCOS } from "@/lib/ma-db";
import PortcoDetailClient from "./PortcoDetailClient";

export function generateStaticParams() {
  return SEED_PORTCOS.map(p => ({ portco_id: p.portco_id }));
}

export default function PortcoDetailPage({ params }: { params: { portco_id: string } }) {
  return <PortcoDetailClient params={params} />;
}
