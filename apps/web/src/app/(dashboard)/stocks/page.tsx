"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Bookmark,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Filter,
  Sparkles,
} from "lucide-react";
import { apiClient, formatINR, formatPercent } from "@/lib/api";
import { Stock, Watchlist } from "@/types";

const SECTORS = [
  "All",
  "Information Technology",
  "Financial Services",
  "Energy & Petrochemicals",
  "Fast Moving Consumer Goods",
  "Automobile & Ancillary",
  "Capital Goods & Construction",
  "Healthcare & Pharmaceuticals",
  "Telecommunications",
];

export default function StockExplorerPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [togglingWatchlist, setTogglingWatchlist] = useState<string | null>(null);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const [stocksRes, wlRes] = await Promise.all([
        apiClient.get<Stock[]>("/stocks"),
        apiClient.get<Watchlist[]>("/watchlists").catch(() => ({ data: [] })),
      ]);
      setStocks(stocksRes.data);
      setWatchlists(wlRes.data);
    } catch (err) {
      console.error("Failed to load stocks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleToggleWatchlist = async (stock: Stock) => {
    if (!watchlists.length) return;
    const primaryWl = watchlists[0];
    setTogglingWatchlist(stock.id);

    try {
      if (stock.is_in_watchlist) {
        // Find item ID
        const item = primaryWl.items?.find((i) => i.stock_id === stock.id);
        if (item) {
          await apiClient.delete(`/watchlists/${primaryWl.id}/items/${item.id}`);
        }
      } else {
        await apiClient.post(`/watchlists/${primaryWl.id}/items`, {
          symbol: stock.symbol,
          exchange: stock.exchange,
        });
      }
      await fetchStocks();
    } catch (err) {
      console.error("Failed to toggle watchlist", err);
    } finally {
      setTogglingWatchlist(null);
    }
  };

  const filteredStocks = stocks.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.company_name.toLowerCase().includes(search.toLowerCase());
    const matchesSector =
      selectedSector === "All" || s.sector.toLowerCase().includes(selectedSector.toLowerCase());
    return matchesSearch && matchesSector;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Stock Explorer
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Directory of liquid NSE/BSE equities with technical postures & ML outlooks
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by symbol or company name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Sector Select */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-xs font-medium outline-none focus:border-primary text-foreground"
          >
            {SECTORS.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stocks Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-4">Equity</th>
                <th className="py-3 px-4">Sector</th>
                <th className="py-3 px-4 text-right">LTP (₹)</th>
                <th className="py-3 px-4 text-right">24h Change</th>
                <th className="py-3 px-4 text-right">52W Range</th>
                <th className="py-3 px-4 text-center">AI Outlook</th>
                <th className="py-3 px-4 text-center">Watchlist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStocks.map((s) => {
                const isUp = (s.change_1d || 0) >= 0;
                let badgeClass = "bg-secondary text-muted-foreground border-border";
                if (s.ai_outlook === "Positive") {
                  badgeClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                } else if (s.ai_outlook === "Negative") {
                  badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
                }

                return (
                  <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/stocks/${s.symbol}`}
                          className="font-bold font-mono text-sm text-foreground hover:text-primary transition-colors"
                        >
                          {s.symbol}
                        </Link>
                        {s.is_owned && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                            Owned
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground block truncate max-w-[180px]">
                        {s.company_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{s.sector}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      {formatINR(s.current_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className={`font-semibold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                        {isUp ? "+" : ""}
                        {s.change_1d ? `₹${s.change_1d.toFixed(2)}` : "—"}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {formatPercent(s.change_percent_1d)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      <div>H: {s.high_52w ? `₹${s.high_52w}` : "—"}</div>
                      <div className="text-[10px]">L: {s.low_52w ? `₹${s.low_52w}` : "—"}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                        {s.ai_outlook || "Neutral"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleWatchlist(s)}
                        disabled={togglingWatchlist === s.id}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          s.is_in_watchlist
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                        title={s.is_in_watchlist ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Bookmark className="w-3.5 h-3.5" fill={s.is_in_watchlist ? "currentColor" : "none"} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
