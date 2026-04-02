import { channelData } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function ChannelTable() {
  const maxRevenue = Math.max(...channelData.map((c) => c.revenue));

  return (
    <div className="card p-4 lg:p-6">
      <div className="mb-4 lg:mb-5">
        <h2 className="text-sm font-semibold text-gray-900">Acquisition Channels</h2>
        <p className="text-xs text-gray-500 mt-0.5">Traffic, conversions & revenue by source</p>
      </div>

      {/* Desktop: full table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Channel</th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sessions</th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Conv.</th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">CVR</th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Revenue</th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">CAC</th>
            </tr>
          </thead>
          <tbody>
            {channelData.map((ch) => {
              const cvr = ((ch.conversions / ch.sessions) * 100).toFixed(1);
              const barWidth = (ch.revenue / maxRevenue) * 100;
              return (
                <tr key={ch.channel} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-400">{ch.channel}</div>
                    <div className="mt-1 h-1 w-24 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${barWidth}%` }} />
                    </div>
                  </td>
                  <td className="py-3 text-right text-gray-400 tabular-nums">{formatNumber(ch.sessions, true)}</td>
                  <td className="py-3 text-right text-gray-400 tabular-nums">{formatNumber(ch.conversions, true)}</td>
                  <td className="py-3 text-right tabular-nums"><span className="text-cyan-700 font-medium">{cvr}%</span></td>
                  <td className="py-3 text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(ch.revenue, "USD", true)}</td>
                  <td className="py-3 text-right tabular-nums">
                    {ch.cac === 0 ? <span className="badge-green badge">Organic</span> : <span className="text-gray-400">${ch.cac}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="lg:hidden space-y-2">
        {channelData.map((ch) => {
          const cvr = ((ch.conversions / ch.sessions) * 100).toFixed(1);
          const barWidth = (ch.revenue / maxRevenue) * 100;
          return (
            <div key={ch.channel} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{ch.channel}</span>
                {ch.cac === 0 ? (
                  <span className="badge-green badge text-[10px]">Organic</span>
                ) : (
                  <span className="text-[10px] text-gray-400">CAC ${ch.cac}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Rev </span>
                  <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(ch.revenue, "USD", true)}</span>
                </div>
                <div>
                  <span className="text-gray-400">CVR </span>
                  <span className="font-medium text-cyan-700 tabular-nums">{cvr}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Conv </span>
                  <span className="tabular-nums text-gray-600">{formatNumber(ch.conversions, true)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${barWidth}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
