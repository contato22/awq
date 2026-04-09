import { dealWorkspaces } from "@/lib/deal-data";
import ProposalPDFPage from "./ProposalPDFPage";

export function generateStaticParams() {
  return dealWorkspaces.map((d) => ({ id: d.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <ProposalPDFPage params={params} />;
}
