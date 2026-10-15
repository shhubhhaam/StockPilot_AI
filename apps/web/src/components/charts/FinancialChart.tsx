"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  Cell,
  CartesianGrid,
} from "recharts";
import { formatINR } from "@/lib/api";
import { Candle } from "@/types";

interface FinancialChartProps {
  candles: Candle[];
  symbol: string;
  onRangeChange?: (days: number) => void;
  activeDays?: number;
}

// Custom Candlestick SVG Bar Shape
const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;

  const { open, high, low, close } = payload;
  const isUp = close >= open;
  const color = isUp ? "#10B981" : "#EF4444";

  // Center coordinate of the candle bar
  const cx = x + width / 2;

  // Compute pixel positions relative to chart coordinate scaling
  const scale = height / Math.max(0.001, Math.abs(high - low));
  const openY = y + (high - open) * scale;
  const closeY = y + (high - close) * scale;
  const highY = y;
  const lowY = y + height;

  const bodyTop = Math.min(openY, closeY);
  const bodyHeight = Math.max(2, Math.abs(openY - closeY));
  const bodyWidth = Math.max(3, width * 0.75);
  const bodyLeft = cx - bodyWidth / 2;

  return (
    <g stroke={color}>
      {/* High-Low Wick */}
      <line x1={cx} y1={highY} x2={cx} y2={lowY} strokeWidth={1.5} />
      {/* Candle Body */}
      <rect
        x={bodyLeft}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={isUp ? color : color}
        stroke={color}
        strokeWidth={1}
        rx={1}
      />
    </g>
  );
};

export function FinancialChart({
  candles,
  symbol,
  onRangeChange,
  activeDays = 180,
}: FinancialChartProps) {
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showEMA20, setShowEMA20] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  if (!candles || candles.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
        <p>No historical candles available for {symbol}</p>
      </div>
    );
  }

  // Precompute SMA/EMA overlays on chart data
  const chartData = candles.map((c, idx) => {
    // Format date: "12 Oct"
    const d = new Date(c.timestamp);
    const dateLabel = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

    // 20-period SMA
    let sma20 = null;
    if (idx >= 19) {
      const slice = candles.slice(idx - 19, idx + 1);
      sma20 = slice.reduce((acc, curr) => acc + curr.close, 0) / 20;
    }

    // 50-period SMA
    let sma50 = null;
    if (idx >= 49) {
      const slice = candles.slice(idx - 49, idx + 1);
      sma50 = slice.reduce((acc, curr) => acc + curr.close, 0) / 50;
    }

    // 20-period EMA
    let ema20 = null;
    if (idx >= 19) {
      const slice = candles.slice(idx - 19, idx + 1);
      const sma = slice.reduce((acc, curr) => acc + curr.close, 0) / 20;
      ema20 = sma; // Approximate
    }

    return {
      ...c,
      dateLabel,
      range: [c.low, c.high], // for candlestick bounding
      sma20: sma20 ? Math.round(sma20 * 100) / 100 : null,
      sma50: sma50 ? Math.round(sma50 * 100) / 100 : null,
      ema20: ema20 ? Math.round(ema20 * 100) / 100 : null,
    };
  });

  const minPrice = Math.min(...candles.map((c) => c.low)) * 0.98;
  const maxPrice = Math.max(...candles.map((c) => c.high)) * 1.02;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg border border-border/60">
          {[
            { label: "1M", days: 30 },
            { label: "3M", days: 90 },
            { label: "6M", days: 180 },
            { label: "1Y", days: 365 },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onRangeChange?.(item.days)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeDays === item.days
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Technical Overlays Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setShowSMA20(!showSMA20)}
            className={`px-2.5 py-1 rounded-md border transition-all ${
              showSMA20
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold"
                : "border-border text-muted-foreground"
            }`}
          >
            SMA 20
          </button>
          <button
            onClick={() => setShowSMA50(!showSMA50)}
            className={`px-2.5 py-1 rounded-md border transition-all ${
              showSMA50
                ? "bg-blue-500/10 border-blue-500/30 text-blue-500 font-semibold"
                : "border-border text-muted-foreground"
            }`}
          >
            SMA 50
          </button>
          <button
            onClick={() => setShowEMA20(!showEMA20)}
            className={`px-2.5 py-1 rounded-md border transition-all ${
              showEMA20
                ? "bg-purple-500/10 border-purple-500/30 text-purple-500 font-semibold"
                : "border-border text-muted-foreground"
            }`}
          >
            EMA 20
          </button>
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2.5 py-1 rounded-md border transition-all ${
              showVolume
                ? "bg-secondary border-border text-foreground font-semibold"
                : "border-border text-muted-foreground"
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Main Candlestick Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              minTickGap={25}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => `₹${Math.round(v)}`}
              orientation="right"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                const isUp = d.close >= d.open;
                return (
                  <div className="bg-card/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl text-xs space-y-1 font-mono">
                    <div className="font-sans font-bold text-foreground border-b border-border/60 pb-1 mb-1">
                      {new Date(d.timestamp).toLocaleDateString("en-IN", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      <span className="text-muted-foreground">Open:</span>
                      <span className="text-right text-foreground font-semibold">₹{d.open.toFixed(2)}</span>
                      <span className="text-muted-foreground">High:</span>
                      <span className="text-right text-emerald-500 font-semibold">₹{d.high.toFixed(2)}</span>
                      <span className="text-muted-foreground">Low:</span>
                      <span className="text-right text-red-500 font-semibold">₹{d.low.toFixed(2)}</span>
                      <span className="text-muted-foreground">Close:</span>
                      <span className={`text-right font-bold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                        ₹{d.close.toFixed(2)}
                      </span>
                      {d.volume && (
                        <>
                          <span className="text-muted-foreground">Volume:</span>
                          <span className="text-right text-foreground">{(d.volume / 100000).toFixed(2)} Lakh</span>
                        </>
                      )}
                      {d.sma20 && (
                        <>
                          <span className="text-amber-500">SMA 20:</span>
                          <span className="text-right text-amber-500">₹{d.sma20}</span>
                        </>
                      )}
                      {d.sma50 && (
                        <>
                          <span className="text-blue-500">SMA 50:</span>
                          <span className="text-right text-blue-500">₹{d.sma50}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            {/* Candlestick glyphs */}
            <Bar dataKey="range" shape={<CandlestickBar />} isAnimationActive={false} />

            {/* Moving Average Overlays */}
            {showSMA20 && (
              <Line
                type="monotone"
                dataKey="sma20"
                stroke="#F59E0B"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {showSMA50 && (
              <Line
                type="monotone"
                dataKey="sma50"
                stroke="#3B82F6"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {showEMA20 && (
              <Line
                type="monotone"
                dataKey="ema20"
                stroke="#A855F7"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Synchronized Volume Subchart */}
      {showVolume && (
        <div className="h-20 w-full pt-1 border-t border-border/50">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <YAxis
                tickLine={false}
                axisLine={false}
                orientation="right"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
              />
              <Bar dataKey="volume" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.close >= entry.open ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
