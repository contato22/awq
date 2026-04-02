import Header from "@/components/Header";
import KPICard from "@/components/KPICard";
import RevenueChart from "@/components/RevenueChart";
import CustomerSegmentChart from "@/components/CustomerSegmentChart";
import TopProductsTable from "@/components/TopProductsTable";
import RegionTable from "@/components/RegionTable";
import AlertBanner from "@/components/AlertBanner";
import { kpis, alerts } from "@/lib/data";

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Overview"
        subtitle="JACQES · Business Intelligence Dashboard · March 2026"
      />

      <div className="px-8 py-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>

        {/* Main charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <RevenueChart />
          </div>
          <CustomerSegmentChart />
        </div>

        {/* Products & Alerts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <TopProductsTable />
          </div>

          <div className="space-y-4">
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800">Alerts</h2>
                <span className="badge badge-red">{alerts.length} active</span>
              </div>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertBanner key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Region table */}
        <RegionTable />
      </div>
    </>
  );
}
