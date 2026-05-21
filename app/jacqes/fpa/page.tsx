import { getBUData, getMonthlyRevenue, getJACQESMRR } from "@/lib/epm-planning-db";
import FpaClient from "./FpaClient";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export default async function FpaPage() {
  const [buData, monthlyRevenue, jacqesMRR] = await Promise.all([
    getBUData(),
    getMonthlyRevenue(),
    getJACQESMRR(),
  ]);
  return (
    <FpaClient
      buData={buData}
      monthlyRevenue={monthlyRevenue}
      jacqesMRR={jacqesMRR.current}
    />
  );
}
