import { channelData } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Globe } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

export default function ChannelTable() {
  const maxRevenue = Math.max(...channelData.map((c) => c.revenue));

  return (
    <div className="card p-5 lg:p-6">
      <SectionHeader
        icon={<Globe size={15} />}
        title="Acquisition Channels"
        badge={<span className="text-[11px] text-gray-400 font-medium ml-1">Traffic, conversions & revenue by source</span>}
      />

      <div className="table-scroll">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="table-header">Channel</th>
              <th className="table-header-right">Sessions</th>
              <th className="table-header-right">Conv.</th>
              <th className="table-header-right">CVR</th>
              <th className="table-header-right">Revenue</th>
              <th className="table-header-right">CAC</th>
            </tr>
          </thead>
          <tbody>
            {channelData.map((ch) => {
              const cvr = ((ch.conversions / ch.sessions) * 100).toFixed(1);
              const barWidth = (ch.revenue / maxRevenue) * 100;

              return (
                <tr
                  key={ch.channel}
                  className="table-row"
                >
                  <td className="py-3 px-3">
                    <div className="font-medium text-gray-700 text-sm">{ch.channel}</div>
                    <div className="mt-1.5 h-1 w-24 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-gray-500 tabular-nums text-sm">
                    {formatNumber(ch.sessions, true)}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-500 tabular-nums text-sm">
                    {formatNumber(ch.conversions, true)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span className="text-brand-600 font-medium text-sm">{cvr}%</span>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-900 tabular-nums text-sm">
                    {formatCurrency(ch.revenue, "BRL", true)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {ch.cac === 0 ? (
                      <span className="badge-green">Organic</span>
                    ) : (
                      <span className="text-gray-500 text-sm">R${ch.cac}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
