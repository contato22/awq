import { notFound } from "next/navigation";
import { BuCrmProvider } from "@/lib/crm-bu-context";

const BU_MAP: Record<string, string> = {
  jacqes: "JACQES",
  caza: "CAZA",
  advisor: "ADVISOR",
  venture: "VENTURE",
  enrd: "ENRD",
};

export default function BuCrmLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { bu: string };
}) {
  const slug = params.bu.toLowerCase();
  const buValue = BU_MAP[slug];
  if (!buValue) notFound();
  return <BuCrmProvider bu={buValue}>{children}</BuCrmProvider>;
}
