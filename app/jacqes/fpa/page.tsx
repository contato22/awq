import { getBUData, getMonthlyRevenue, getJACQESMRR } from "@/lib/epm-planning-db";
import FpaClient from "./FpaClient";

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
