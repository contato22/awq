import { dealWorkspaces } from "@/lib/deal-data";
import HistoryPage from "./HistoryPage";

export function generateStaticParams() {
  return dealWorkspaces.map((d) => ({ id: d.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <HistoryPage params={params} />;
}
