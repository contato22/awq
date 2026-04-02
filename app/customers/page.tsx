import Header from "@/components/Header";
import { customers } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { UserCheck, UserX, AlertTriangle, Users } from "lucide-react";

const statusConfig = {
  active: {
    label: "Active",
    classes: "badge-green",
    Icon: UserCheck,
  },
  "at-risk": {
    label: "At Risk",
    classes: "badge-yellow",
    Icon: AlertTriangle,
  },
  churned: {
    label: "Churned",
    classes: "badge-red",
    Icon: UserX,
  },
};

const segmentConfig = {
  Enterprise: "badge-blue",
  SMB: "badge-green",
  Startup: "badge-yellow",
};

const activeCount = customers.filter((c) => c.status === "active").length;
const atRiskCount = customers.filter((c) => c.status === "at-risk").length;
const churnedCount = customers.filter((c) => c.status === "churned").length;
const totalLTV = customers.reduce((sum, c) => sum + c.ltv, 0);

export default function CustomersPage() {
  return (
    <>
      <Header
        title="Customers"
        subtitle="Customer directory, health scores, and lifetime value"
      />

      <div className="px-8 py-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-brand-600">
              <Users size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{customers.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total Accounts</div>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-emerald-600">
              <UserCheck size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{activeCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Active</div>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-amber-700">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{atRiskCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">At Risk</div>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-red-600">
              <UserX size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{churnedCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Churned</div>
            </div>
          </div>
        </div>

        {/* Total LTV highlight */}
        <div className="card-elevated p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
              Portfolio Lifetime Value
            </div>
            <div className="text-3xl font-bold text-emerald-600 mt-1 tabular-nums">
              {formatCurrency(totalLTV)}
            </div>
          </div>
          <div className="text-xs text-gray-500 text-right">
            <div>Avg LTV per account</div>
            <div className="text-lg font-bold text-emerald-600 mt-1">
              {formatCurrency(Math.round(totalLTV / customers.length))}
            </div>
          </div>
        </div>

        {/* Customer table */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Customer Directory</h2>
              <p className="text-xs text-gray-500 mt-0.5">All accounts with health status</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800">
                  {["Customer", "Company", "Segment", "LTV", "Last Order", "Country", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left pb-3 pr-4 text-[10px] font-semibold text-white uppercase tracking-wider py-2 px-3"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => {
                  const status = statusConfig[c.status];
                  const segClass = segmentConfig[c.segment];

                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-gray-100 hover:bg-gray-100 transition-colors ${idx % 2 === 1 ? "bg-gray-50/60" : ""}`}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-[10px] font-bold text-slate-800 shrink-0">
                            {c.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{c.name}</div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{c.company}</td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${segClass}`}>{c.segment}</span>
                      </td>
                      <td className="py-3 pr-4 font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(c.ltv, "USD", true)}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 tabular-nums">
                        {formatDate(c.lastOrder)}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 font-mono text-xs">
                        {c.country}
                      </td>
                      <td className="py-3">
                        <span className={`badge ${status.classes}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
