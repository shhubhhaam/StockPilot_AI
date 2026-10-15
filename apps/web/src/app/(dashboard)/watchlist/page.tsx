"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  X,
  ExternalLink,
} from "lucide-react";
import { apiClient, formatINR, formatPercent } from "@/lib/api";
import { Watchlist, Stock } from "@/types";

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isNewWlOpen, setIsNewWlOpen] = useState(false);
  const [newWlName, setNewWlName] = useState("");

  // Stock search
  const [stockSearch, setStockSearch] = useState("");
  const [availableStocks, setAvailableStocks] = useState<Stock[]>([]);

  const fetchWatchlists = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Watchlist[]>("/watchlists");
      setWatchlists(res.data);
      if (res.data.length > 0 && !activeWatchlistId) {
        setActiveWatchlistId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load watchlists", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlists();
    apiClient.get<Stock[]>("/stocks").then((r) => setAvailableStocks(r.data)).catch(() => {});
  }, []);

  const currentWl = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWlName.trim()) return;
    try {
      const res = await apiClient.post<Watchlist>("/watchlists", { name: newWlName.trim() });
      setNewWlName("");
      setIsNewWlOpen(false);
      await fetchWatchlists();
      setActiveWatchlistId(res.data.id);
    } catch (err) {
      console.error("Failed to create watchlist", err);
    }
  };

  const handleDeleteWatchlist = async (wlId: string) => {
    if (watchlists.length <= 1) {
      alert("You must keep at least one watchlist.");
      return;
    }
    try {
      await apiClient.delete(`/watchlists/${wlId}`);
      await fetchWatchlists();
    } catch (err) {
      console.error("Failed to delete watchlist", err);
    }
  };

  const handleAddStock = async (stock: Stock) => {
    if (!currentWl) return;
    try {
      await apiClient.post(`/watchlists/${currentWl.id}/items`, {
        symbol: stock.symbol,
        exchange: stock.exchange,
      });
      setIsAddStockOpen(false);
      setStockSearch("");
      await fetchWatchlists();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add to watchlist");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!currentWl) return;
    try {
      await apiClient.delete(`/watchlists/${currentWl.id}/items/${itemId}`);
      await fetchWatchlists();
    } catch (err) {
      console.error("Failed to remove item", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Watchlists <Bookmark className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor selected Indian stocks with real-time price changes & AI postures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewWlOpen(true)}
            className="px-3.5 py-2 border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Watchlist</span>
          </button>
          <button
            onClick={() => setIsAddStockOpen(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Watchlist Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        {watchlists.map((wl) => (
          <div
            key={wl.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              currentWl?.id === wl.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
            onClick={() => setActiveWatchlistId(wl.id)}
          >
            <span>{wl.name}</span>
            <span className="text-[10px] opacity-75 font-mono">({wl.items?.length || 0})</span>
            {watchlists.length > 1 && currentWl?.id === wl.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWatchlist(wl.id);
                }}
                className="opacity-70 hover:opacity-100 p-0.5"
                title="Delete Watchlist"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Watchlist Items Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {currentWl && currentWl.items && currentWl.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Equity</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4 text-right">LTP (₹)</th>
                  <th className="py-3 px-4 text-right">24h Change</th>
                  <th className="py-3 px-4 text-center">AI Signal</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {currentWl.items.map((it) => {
                  const s = it.stock;
                  const isUp = (s.change_1d || 0) >= 0;
                  return (
                    <tr key={it.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/stocks/${s.symbol}`} className="font-bold font-mono text-sm text-foreground hover:text-primary">
                          {s.symbol}
                        </Link>
                        <span className="block text-[11px] text-muted-foreground truncate max-w-[200px]">
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
                      <td className="py-3 px-4 text-center">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-secondary text-muted-foreground">
                          {s.ai_outlook || "Neutral"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRemoveItem(it.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <p>No stocks currently in this watchlist.</p>
            <button
              onClick={() => setIsAddStockOpen(true)}
              className="px-3.5 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs"
            >
              Add Stock to Watchlist
            </button>
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {isAddStockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsAddStockOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-foreground">Add to Watchlist</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search stocks to add..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border focus:border-primary rounded-lg text-sm outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border/60 border border-border/80 rounded-xl">
              {availableStocks
                .filter(
                  (s) =>
                    s.symbol.toLowerCase().includes(stockSearch.toLowerCase()) ||
                    s.company_name.toLowerCase().includes(stockSearch.toLowerCase())
                )
                .map((stock) => (
                  <div
                    key={stock.id}
                    className="p-3 flex items-center justify-between hover:bg-secondary/50 transition-colors text-xs"
                  >
                    <div>
                      <span className="font-bold font-mono text-foreground">{stock.symbol}</span>
                      <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                        {stock.company_name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddStock(stock)}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded-md font-semibold text-xs shadow-sm hover:bg-primary/90"
                    >
                      Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* New Watchlist Modal */}
      {isNewWlOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsNewWlOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-foreground">Create New Watchlist</h2>
            <form onSubmit={handleCreateWatchlist} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Watchlist Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IT Leaders, High Beta"
                  value={newWlName}
                  onChange={(e) => setNewWlName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border focus:border-primary rounded-lg text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewWlOpen(false)}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
