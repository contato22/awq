"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { customerSegments } from "@/lib/data";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-300 rounded-xl p-3 shadow-xl shadow-black/40">
      <div className="flex items-center gap-2 text-xs">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: item.payload.color }}
        />
        <span className="text-gray-400">{item.name}</span>
        <span className="font-semibold text-gray-900 ml-1">{item.value}%</span>
      </div>
    </div>
  );
}

export default function CustomerSegmentChart() {
  return (
    <div className="card p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Customer Segments</h2>
        <p className="text-xs text-gray-500 mt-0.5">Revenue distribution by tier</p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={customerSegments}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={3}
            dataKey="value"
          >
            {customerSegments.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-3 space-y-2">
        {customerSegments.map((seg) => (
          <div key={seg.name} className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-gray-400 flex-1">{seg.name}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${seg.value}%`, backgroundColor: seg.color }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-400 w-8 text-right">
                {seg.value}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
