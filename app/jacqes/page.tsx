import Header from "@/components/Header";
import KPICard from "@/components/KPICard";
import SectionHeader from "@/components/SectionHeader";
import RevenueChart from "@/components/RevenueChart";
import CustomerSegmentChart from "@/components/CustomerSegmentChart";
import TopProductsTable from "@/components/TopProductsTable";
import RegionTable from "@/components/RegionTable";
import AlertBanner from "@/components/AlertBanner";
import { getBUData, getJACQESMRR } from "@/lib/epm-planning-db";
import { Bell } from "lucide-react";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export default async function DashboardPage() {
  const [buData, jacqesMRRData] = await Promise.all([
    getBUData(),
    getJACQESMRR(),
  ]);
  const _jacqes = buData.find((b) => b.id === "jacqes")!;
  const JACQES_MRR = jacqesMRRData.current;

  const kpis = [
    { id: "revenue",   label: "MRR Atual",     value: JACQES_MRR,        previousValue: 0, unit: "currency" as const, icon: "DollarSign", color: "brand"   },
    { id: "customers", label: "Contas Ativas",  value: _jacqes.customers, previousValue: 0, unit: "number"   as const, icon: "Users",      color: "emerald" },
    { id: "nps",       label: "NPS Médio",      value: 0,                 previousValue: 0, unit: "percent"  as const, suffix: "",          icon: "TrendingUp", color: "blue"   },
    { id: "margin",    label: "Margem Bruta",   value: 0,                 previousValue: 0, unit: "percent"  as const, suffix: "%",         icon: "TrendingUp", color: "purple" },
  ];
  const alerts: never[] = [];

  return (
    <>
      <Header
        title="JACQES — Overview"
        subtitle="Agência · AWQ Group · Business Intelligence · Mar 2026"
      />

      <div className="page-container">
        {/* KPI Row */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <KPICard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </section>

        {/* Main charts row */}
        <section>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <RevenueChart />
            </div>
            <CustomerSegmentChart />
          </div>
        </section>

        {/* Products & Alerts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <TopProductsTable />
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <SectionHeader
                icon={<Bell size={14} className="text-red-500" />}
                title="Alertas"
                badge={<span className="badge-red">{alerts.length} ativos</span>}
              />
              <div className="space-y-2.5">
                {alerts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhum alerta ativo</p>
                ) : (
                  alerts.map((alert) => (
                    <AlertBanner key={(alert as { id: string }).id} alert={alert} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Region table */}
        <section>
          <RegionTable />
        </section>
      </div>
    </>
  );
}
