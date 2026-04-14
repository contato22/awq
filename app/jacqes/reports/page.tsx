import Header from "@/components/Header";
import { FileBarChart, Download, Calendar, TrendingUp, Users, Globe } from "lucide-react";

interface ReportCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  lastGenerated: string;
  type: string;
  color: string;
  [extra: string]: unknown;
}

function ReportCard({ icon: Icon, title, description, lastGenerated, type, color }: ReportCardProps) {
  return (
    <div className="card card-hover p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <span className="badge badge-blue">{type}</span>
      </div>
      <div>
        <div className="font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <span className="text-xs text-gray-500">Generated: {lastGenerated}</span>
        <button className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-500 font-medium transition-colors">
          <Download size={12} />
          Export
        </button>
      </div>
    </div>
  );
}

const reports: ReportCardProps[] = [
  {
    icon: TrendingUp,
    title: "Monthly Revenue Report",
    description:
      "Comprehensive breakdown of revenue, expenses, and profit margins with YoY comparisons and segment analysis.",
    lastGenerated: "Mar 18, 2026",
    type: "Financial",
    color: "bg-brand-50 border border-brand-200 text-brand-600",
  },
  {
    icon: Users,
    title: "Customer Health Report",
    description:
      "NPS scores, churn risk scoring, LTV cohort analysis, and at-risk account action plans.",
    lastGenerated: "Mar 15, 2026",
    type: "Customer",
    color: "bg-emerald-50 border border-emerald-200 text-emerald-600",
  },
  {
    icon: Globe,
    title: "Regional Performance Report",
    description:
      "Geographic revenue distribution, market penetration rates, and expansion opportunity scoring by territory.",
    lastGenerated: "Mar 12, 2026",
    type: "Strategy",
    color: "bg-cyan-50 border border-cyan-200 text-cyan-700",
  },
  {
    icon: FileBarChart,
    title: "Product Analytics Report",
    description:
      "Usage metrics, feature adoption, revenue by SKU, and product line growth trajectory analysis.",
    lastGenerated: "Mar 10, 2026",
    type: "Product",
    color: "bg-purple-500/10 border border-purple-500/20 text-purple-400",
  },
  {
    icon: Calendar,
    title: "Q1 2026 Board Report",
    description:
      "Executive summary for AWQ Group board — KPI dashboard, strategic milestones, and forward guidance.",
    lastGenerated: "Mar 5, 2026",
    type: "Executive",
    color: "bg-amber-50 border border-amber-200 text-amber-700",
  },
  {
    icon: TrendingUp,
    title: "Acquisition Channel Audit",
    description:
      "CAC breakdown, channel ROI, attribution modelling, and budget allocation recommendations.",
    lastGenerated: "Mar 1, 2026",
    type: "Marketing",
    color: "bg-pink-500/10 border border-pink-500/20 text-pink-400",
  },
];

export default function ReportsPage() {
  return (
    <>
      <Header
        title="Reports"
        subtitle="Generated reports and data exports for JACQES stakeholders"
      />

      <div className="page-container">
        {/* Quick action bar */}
        <div className="card p-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">
            Generate:
          </span>
          {["Monthly Summary", "Customer Cohort", "Revenue Forecast", "Custom Report"].map(
            (label) => (
              <button
                key={label}
                className={label === "Custom Report" ? "btn-primary" : "btn-secondary"}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Report cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map((report) => (
            <ReportCard key={report.title} {...report} />
          ))}
        </div>

        {/* Scheduled reports */}
        <div className="card p-5 lg:p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Scheduled Reports</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Automatic delivery to AWQ Group stakeholders
            </p>
          </div>

          <div className="space-y-0">
            {[
              {
                name: "Weekly Revenue Digest",
                freq: "Every Monday at 09:00",
                recipients: "board@awqgroup.com, cfo@jacqes.com",
                active: true,
              },
              {
                name: "Daily KPI Pulse",
                freq: "Daily at 07:00",
                recipients: "analytics@jacqes.com",
                active: true,
              },
              {
                name: "Monthly Board Pack",
                freq: "1st of each month",
                recipients: "board@awqgroup.com",
                active: true,
              },
              {
                name: "Quarterly Investor Update",
                freq: "1st Jan, Apr, Jul, Oct",
                recipients: "investors@awqgroup.com",
                active: false,
              },
            ].map((sched) => (
              <div
                key={sched.name}
                className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    sched.active ? "bg-emerald-400 animate-pulse" : "bg-gray-200"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-400">{sched.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {sched.freq} · {sched.recipients}
                  </div>
                </div>
                <span className={`badge ${sched.active ? "badge-green" : "badge-red"}`}>
                  {sched.active ? "Active" : "Paused"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
