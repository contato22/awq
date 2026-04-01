import { channelData } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function ChannelTable() {
  if (channelData.length === 0) {
    return (
      <div className="card p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-900">Acquisition Channels</h2>
          <p className="text-xs text-gray-500 mt-0.5">Traffic, conversions & revenue by source</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mb-3 opacity-30"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18M3 8h18M3 12h10M3 16h6" /></svg>
          <p className="text-sm font-medium">Sem dados disponíveis</p>
          <p className="text-xs mt-1 opacity-70">Nenhum canal de aquisição registrado</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...channelData.map((c) => c.revenue));

  return (
    <div className="card p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-900">Acquisition Channels</h2>
        <p className="text-xs text-gray-500 mt-0.5">Traffic, conversions & revenue by source</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Channel
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Sessions
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Conv.
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                CVR
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Revenue
              </th>
              <th className="text-right pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
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
                  className="border-b border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-400">{ch.channel}</div>
                    <div className="mt-1 h-1 w-24 bg-gray-100 rounded-full overflow-hidden">
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
                    <span className="text-cyan-700 font-medium">{cvr}%</span>
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-900 tabular-nums">
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
