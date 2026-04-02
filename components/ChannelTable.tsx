import { channelData } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function ChannelTable() {
  const maxRevenue = Math.max(...channelData.map((c) => c.revenue));

  return (
    <div className="card-elevated p-6">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-slate-800">Acquisition Channels</h2>
        <p className="text-xs text-gray-500 mt-0.5">Traffic, conversions & revenue by source</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800">
              <th className="text-left py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider">
                Channel
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider">
                Sessions
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider">
                Conv.
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider">
                CVR
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider">
                Revenue
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider">
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
                  className="even:bg-gray-50/60 hover:bg-gray-100/60 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-700">{ch.channel}</div>
                    <div className="mt-1 h-1 w-24 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-slate-700 to-slate-500 rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 tabular-nums">
                    {formatNumber(ch.sessions, true)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 tabular-nums">
                    {formatNumber(ch.conversions, true)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span className="text-cyan-700 font-medium">{cvr}%</span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600 tabular-nums">
                    {formatCurrency(ch.revenue, "USD", true)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {ch.cac === 0 ? (
                      <span className="badge-green badge">Organic</span>
                    ) : (
                      <span className="text-gray-500">${ch.cac}</span>
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
