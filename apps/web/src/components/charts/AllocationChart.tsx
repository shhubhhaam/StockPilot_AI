"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { SectorAllocation } from "@/types";
import { formatINR } from "@/lib/api";

const COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6366F1", // Indigo
];

export function AllocationChart({
  allocations,
}: {
  allocations: SectorAllocation[];
}) {
  if (!allocations || allocations.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground">
        No holdings available to compute sector allocation.
      </div>
    );
  }

  const chartData = allocations.map((a) => ({
    name: a.sector,
    value: a.value,
    percentage: a.percentage,
  }));

  return (
    <div className="h-64 w-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-card border border-border px-3 py-2 rounded-lg shadow-lg text-xs space-y-0.5">
                  <div className="font-semibold text-foreground">{d.name}</div>
                  <div className="font-mono text-muted-foreground">{formatINR(d.value)}</div>
                  <div className="font-mono text-primary font-bold">{d.percentage}%</div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
        {chartData.slice(0, 5).map((item, idx) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="truncate max-w-[100px]">{item.name}</span>
            <span className="font-mono font-medium text-foreground">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
