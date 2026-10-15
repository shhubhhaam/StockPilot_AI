"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Layers,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
} from "lucide-react";
import { apiClient, formatINR, formatPercent } from "@/lib/api";
import { DashboardOverview } from "@/types";
import { AllocationChart } from "@/components/charts/AllocationChart";

export default function OverviewPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DashboardOverview>("/dashboard/overview");
      setData(res.data);
    } catch (err: any) {
      setError("Failed to load dashboard overview. Please check server status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-secondary/80 rounded-lg w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-card border border-border rounded-xl" />
          <div className="h-72 bg-card border border-border rounded-xl" />
        </div>
      </div>
    );
  }

  const p = data?.portfolio;
  const isPnlPositive = (p?.unrealized_pnl || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Portfolio Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Indian Equity Holdings & AI Intelligence Snapshot
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/portfolio"
            className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Holdings</span>
          </Link>
        </div>
      </div>

      {/* Concentration / Risk Alert Banner if any */}
      {p?.concentration_alert && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{p.concentration_alert}</span>
        </div>
      )}

      {/* Top Financial KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Market Value */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>Total Market Value</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatINR(p?.total_market_value)}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Invested:</span>
            <span className="font-mono font-medium text-foreground">
              {formatINR(p?.total_invested_value)}
            </span>
          </div>
        </div>

        {/* Unrealized PnL */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>Total Unrealized P&L</span>
            {isPnlPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              isPnlPositive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {isPnlPositive ? "+" : ""}
            {formatINR(p?.unrealized_pnl)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <span
              className={`font-semibold font-mono px-1.5 py-0.5 rounded text-[11px] ${
                isPnlPositive
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              {formatPercent(p?.total_return_percentage)}
            </span>{" "}
            overall return
          </div>
        </div>

        {/* Today's Daily PnL */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>Day's P&L</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              NSE Today
            </span>
          </div>
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              (p?.daily_pnl || 0) >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {(p?.daily_pnl || 0) >= 0 ? "+" : ""}
            {formatINR(p?.daily_pnl)}
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-mono">
            {formatPercent(p?.daily_return_percentage)} change today
          </div>
        </div>

        {/* Holdings Count */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>Active Holdings</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {p?.holdings_count || 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {p?.sector_allocations?.length || 0} sectors represented
          </div>
        </div>
      </div>

      {/* Middle Row: Active Holdings & Sector Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Portfolio Holdings</h2>
                <p className="text-xs text-muted-foreground">Individual equity stakes and current valuation</p>
              </div>
              <Link
                href="/portfolio"
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.holdings && data.holdings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground font-medium">
                      <th className="pb-2">Stock</th>
                      <th className="pb-2">Qty</th>
                      <th className="pb-2">Avg Price</th>
                      <th className="pb-2">LTP</th>
                      <th className="pb-2 text-right">Market Val</th>
                      <th className="pb-2 text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.holdings.slice(0, 5).map((h) => {
                      const isUp = (h.unrealized_pnl || 0) >= 0;
                      return (
                        <tr key={h.id} className="hover:bg-secondary/40 transition-colors">
                          <td className="py-2.5">
                            <Link href={`/stocks/${h.symbol}`} className="font-semibold text-foreground hover:text-primary">
                              {h.symbol}
                            </Link>
                            <span className="block text-[10px] text-muted-foreground truncate max-w-[140px]">
                              {h.company_name}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono">{h.quantity}</td>
                          <td className="py-2.5 font-mono">{formatINR(h.average_purchase_price)}</td>
                          <td className="py-2.5 font-mono font-medium">{formatINR(h.current_price)}</td>
                          <td className="py-2.5 text-right font-mono font-semibold">
                            {formatINR(h.current_market_value)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-medium">
                            <span className={isUp ? "text-emerald-500" : "text-red-500"}>
                              {isUp ? "+" : ""}
                              {formatINR(h.unrealized_pnl)}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {formatPercent(h.return_percentage)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                <p>No holdings added yet.</p>
                <Link
                  href="/portfolio"
                  className="mt-2 inline-block px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg"
                >
                  Add First Holding
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sector Allocation Donut */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Sector Breakdown</h2>
            <p className="text-xs text-muted-foreground mb-2">Exposure by industry segment</p>
            <AllocationChart allocations={p?.sector_allocations || []} />
          </div>
        </div>
      </div>

      {/* Bottom Row: AI Signals & Market Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Stock Signals */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">AI Outlook Signals</h2>
            </div>
            <Link href="/insights" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
              <span>All Insights</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.top_predictions?.map((pred) => {
              const label = pred.decision_support_label;
              let badgeColor = "bg-secondary text-muted-foreground";
              if (label === "Positive") badgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
              else if (label === "Negative") badgeColor = "bg-red-500/10 text-red-500 border-red-500/20";
              else if (label === "Monitor") badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";

              return (
                <div
                  key={pred.id}
                  className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/stocks/${pred.symbol}`} className="font-bold text-sm font-mono text-foreground hover:text-primary">
                        {pred.symbol}
                      </Link>
                      <span className="text-[10px] text-muted-foreground">{pred.sector}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Horizon: <span className="font-mono font-medium text-foreground">{pred.prediction_horizon}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {label}
                    </span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Model v{pred.model_version}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Corporate News & SEBI Circulars */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Market & Regulatory Feed</h2>
            <Link href="/news" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
              <span>View Feed</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recent_news?.slice(0, 3).map((news) => (
              <div key={news.id} className="p-3 rounded-xl border border-border/80 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span className="font-semibold text-primary">{news.symbol || "Market"}</span>
                  <span>{new Date(news.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                <div className="text-xs font-medium text-foreground line-clamp-1">{news.title}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{news.summary}</div>
              </div>
            ))}

            {data?.regulatory_alerts?.slice(0, 1).map((reg) => (
              <div key={reg.id} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-amber-500">{reg.authority} Circular</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-medium">
                    {reg.impact_level} Impact
                  </span>
                </div>
                <div className="text-xs font-medium text-foreground line-clamp-1">{reg.document_title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
