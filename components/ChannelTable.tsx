import { channelData } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function ChannelTable() {
  const maxRevenue = Math.max(...channelData.map((c) => c.revenue));

  return (
    <div className="card p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-white">Acquisition Channels</h2>
        <p className="text-xs text-gray-500 mt-0.5">Traffic, conversions & revenue by source</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left pb-3 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                Channel
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                Sessions
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                Conv.
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                CVR
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                Revenue
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                CAC
              </th>
            </tr>
          </thead>
          <tbody>
            {channelData.map((ch) => {
              const cvr = ((ch.conversions / ch.sessions) * 100).toFixed(1);
              const barWidth = (ch.revenue / maxRevenue) * 100;

              return (
                <tr
                  key={ch.channel}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-300">{ch.channel}</div>
                    <div className="mt-1 h-1 w-24 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 text-right text-gray-400 tabular-nums">
                    {formatNumber(ch.sessions, true)}
                  </td>
                  <td className="py-3 text-right text-gray-400 tabular-nums">
                    {formatNumber(ch.conversions, true)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    <span className="text-cyan-400 font-medium">{cvr}%</span>
                  </td>
                  <td className="py-3 text-right font-semibold text-white tabular-nums">
                    {formatCurrency(ch.revenue, "USD", true)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {ch.cac === 0 ? (
                      <span className="badge-green badge">Organic</span>
                    ) : (
                      <span className="text-gray-400">${ch.cac}</span>
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
