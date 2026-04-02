"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { customerSegments } from "@/lib/data";

const COLORS = ["#1e293b", "#10b981", "#C9A84C", "#6366f1"];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-elevated">
      <div className="flex items-center gap-2 text-xs">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: item.payload.color }}
        />
        <span className="text-gray-500 font-medium">{item.name}</span>
        <span className="font-bold text-slate-800 ml-1">{item.value}%</span>
      </div>
    </div>
  );
}

export default function CustomerSegmentChart() {
  return (
    <div className="card-elevated p-6">
      <div className="mb-4">
        <h2 className="section-title">Customer Segments</h2>
        <p className="section-subtitle">Revenue distribution by tier</p>
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
            {customerSegments.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2.5">
        {customerSegments.map((seg, i) => (
          <div key={seg.name} className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs text-slate-700 font-medium flex-1">{seg.name}</span>
            <div className="flex items-center gap-2.5">
              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${seg.value}%`, backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
              <span className="text-xs font-bold text-slate-800 w-8 text-right tabular-nums">
                {seg.value}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
