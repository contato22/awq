import Header from "@/components/Header";
import KPICard from "@/components/KPICard";
import SectionHeader from "@/components/SectionHeader";
import RevenueChart from "@/components/RevenueChart";
import CustomerSegmentChart from "@/components/CustomerSegmentChart";
import TopProductsTable from "@/components/TopProductsTable";
import RegionTable from "@/components/RegionTable";
import AlertBanner from "@/components/AlertBanner";
import { kpis, alerts } from "@/lib/data";
import { Bell } from "lucide-react";

export default function DashboardPage() {
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
                    <AlertBanner key={alert.id} alert={alert} />
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
