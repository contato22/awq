import { dealWorkspaces } from "@/lib/deal-data";
import NegotiationPage from "./NegotiationPage";

export const dynamicParams = process.env.STATIC_EXPORT !== "1";

export function generateStaticParams() {
  return dealWorkspaces.map((d) => ({ id: d.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <NegotiationPage params={params} />;
}
