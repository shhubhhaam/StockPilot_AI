"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Bell,
  Menu,
  X,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { apiClient, formatINR } from "@/lib/api";
import { Stock } from "@/types";

export function Navbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Stock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      apiClient
        .get<Stock[]>(`/stocks?search=${encodeURIComponent(query.trim())}`)
        .then((res) => {
          setResults(res.data.slice(0, 6));
          setIsOpen(true);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Global Autocomplete Search */}
        <div ref={searchRef} className="relative w-full">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search Indian stocks (e.g. RELIANCE, TCS, INFY)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length > 0 && setIsOpen(true)}
              className="w-full pl-9 pr-4 py-2 bg-secondary/60 hover:bg-secondary/80 focus:bg-background border border-border focus:border-primary rounded-lg text-sm transition-all outline-none"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {results.length > 0 ? (
                <div className="divide-y divide-border/60">
                  <div className="px-3 py-1.5 bg-secondary/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Equities (NSE)
                  </div>
                  {results.map((stock) => (
                    <button
                      key={stock.id}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery("");
                        router.push(`/stocks/${stock.symbol}`);
                      }}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-secondary/80 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm font-mono text-foreground">
                            {stock.symbol}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary font-mono text-muted-foreground">
                            {stock.exchange}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                          {stock.company_name}
                        </div>
                      </div>
                      {stock.current_price && (
                        <div className="text-right">
                          <div className="text-sm font-semibold font-mono">
                            {formatINR(stock.current_price)}
                          </div>
                          {stock.change_percent_1d !== undefined && (
                            <div
                              className={`text-xs font-mono font-medium ${
                                stock.change_percent_1d >= 0
                                  ? "text-emerald-500"
                                  : "text-red-500"
                              }`}
                            >
                              {stock.change_percent_1d >= 0 ? "+" : ""}
                              {stock.change_percent_1d.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {isSearching ? "Searching NSE listings..." : `No stocks found matching "${query}"`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" />
          )}
        </button>

        {/* User Pill & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">
            {user?.display_name ? user.display_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold leading-tight text-foreground truncate max-w-[120px]">
              {user?.display_name || user?.email?.split("@")[0] || "User"}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Investor
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors ml-1"
            title="Sign out"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
