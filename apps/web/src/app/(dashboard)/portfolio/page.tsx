"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
  Search,
  Check,
} from "lucide-react";
import { apiClient, formatINR, formatPercent } from "@/lib/api";
import { Holding, PortfolioSummary, Stock } from "@/types";

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete stocks
  const [stockList, setStockList] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const [holdingsRes, summaryRes] = await Promise.all([
        apiClient.get<Holding[]>("/portfolio/holdings"),
        apiClient.get<PortfolioSummary>("/portfolio"),
      ]);
      setHoldings(holdingsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error("Failed to fetch portfolio", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    // Load stock universe for autocomplete
    apiClient.get<Stock[]>("/stocks").then((res) => setStockList(res.data)).catch(() => {});
  }, []);

  const handleSearchSymbol = (val: string) => {
    setSymbol(val.toUpperCase());
    if (val.trim().length > 0) {
      const match = stockList.filter(
        (s) =>
          s.symbol.toLowerCase().includes(val.toLowerCase()) ||
          s.company_name.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredStocks(match.slice(0, 5));
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const selectStock = (s: Stock) => {
    setSymbol(s.symbol);
    if (s.current_price) {
      setPrice(s.current_price.toString());
    }
    setShowDropdown(false);
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (!symbol.trim()) {
      setFormError("Please select a stock symbol.");
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setFormError("Quantity must be a positive number.");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("Purchase price must be positive.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/portfolio/holdings", {
        symbol: symbol.toUpperCase(),
        exchange: "NSE",
        quantity: qtyNum,
        average_purchase_price: priceNum,
      });
      setIsAddOpen(false);
      setSymbol("");
      setQuantity("");
      setPrice("");
      await fetchPortfolio();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to add holding.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHolding) return;
    setFormError(null);

    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setFormError("Quantity must be greater than 0.");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("Price must be positive.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.patch(`/portfolio/holdings/${editingHolding.id}`, {
        quantity: qtyNum,
        average_purchase_price: priceNum,
      });
      setEditingHolding(null);
      await fetchPortfolio();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to update holding.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHolding = async (holdingId: string) => {
    try {
      await apiClient.delete(`/portfolio/holdings/${holdingId}`);
      setDeleteConfirmId(null);
      await fetchPortfolio();
    } catch (err) {
      console.error("Failed to delete holding", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Portfolio Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track holdings, purchase costs, current valuation, and sector exposure
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setSymbol("");
            setQuantity("");
            setPrice("");
            setIsAddOpen(true);
          }}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Holding</span>
        </button>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div>
            <div className="text-xs text-muted-foreground">Total Invested</div>
            <div className="text-xl font-bold font-mono text-foreground mt-1">
              {formatINR(summary.total_invested_value)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Market Value</div>
            <div className="text-xl font-bold font-mono text-foreground mt-1">
              {formatINR(summary.total_market_value)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Unrealized P&L</div>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                summary.unrealized_pnl >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {summary.unrealized_pnl >= 0 ? "+" : ""}
              {formatINR(summary.unrealized_pnl)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Overall Return</div>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                summary.total_return_percentage >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {formatPercent(summary.total_return_percentage)}
            </div>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Current Holdings ({holdings.length})
          </h2>
        </div>

        {holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Symbol / Company</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Avg Cost</th>
                  <th className="py-3 px-4 text-right">LTP</th>
                  <th className="py-3 px-4 text-right">Invested</th>
                  <th className="py-3 px-4 text-right">Current Value</th>
                  <th className="py-3 px-4 text-right">P&L</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {holdings.map((h) => {
                  const isUp = (h.unrealized_pnl || 0) >= 0;
                  return (
                    <tr key={h.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/stocks/${h.symbol}`} className="font-bold text-foreground hover:text-primary">
                          {h.symbol}
                        </Link>
                        <span className="block text-[11px] text-muted-foreground truncate max-w-[160px]">
                          {h.company_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{h.sector}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">{h.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatINR(h.average_purchase_price)}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">{formatINR(h.current_price)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatINR(h.invested_value)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatINR(h.current_market_value)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className={`font-semibold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                          {isUp ? "+" : ""}
                          {formatINR(h.unrealized_pnl)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatPercent(h.return_percentage)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingHolding(h);
                              setQuantity(h.quantity.toString());
                              setPrice(h.average_purchase_price.toString());
                              setFormError(null);
                            }}
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit Holding"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(h.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            title="Delete Holding"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <p>Your portfolio is currently empty.</p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs"
            >
              Add Your First Holding
            </button>
          </div>
        )}
      </div>

      {/* Add Holding Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-foreground mb-1">Add New Holding</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Enter Indian stock symbol, quantity, and purchase price.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddHolding} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Stock Symbol (NSE)
                </label>
                <input
                  type="text"
                  placeholder="e.g. RELIANCE, TCS, INFY"
                  value={symbol}
                  onChange={(e) => handleSearchSymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border focus:border-primary rounded-lg text-sm font-mono outline-none"
                />

                {showDropdown && filteredStocks.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-10 divide-y divide-border/60 overflow-hidden">
                    {filteredStocks.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectStock(s)}
                        className="w-full px-3 py-2 text-left hover:bg-secondary/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold font-mono text-foreground">{s.symbol}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">{s.company_name}</span>
                        </div>
                        <span className="font-mono text-muted-foreground">{formatINR(s.current_price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 25"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border focus:border-primary rounded-lg text-sm font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Average Purchase Price (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 2750.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border focus:border-primary rounded-lg text-sm font-mono outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add to Portfolio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Holding Modal */}
      {editingHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingHolding(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-foreground mb-1">
              Edit {editingHolding.symbol} Holding
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Update quantity or average acquisition cost.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateHolding} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border focus:border-primary rounded-lg text-sm font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Average Purchase Price (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border focus:border-primary rounded-lg text-sm font-mono outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingHolding(null)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Remove Holding?</h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to remove this stock holding from your portfolio? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteHolding(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Delete Holding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
