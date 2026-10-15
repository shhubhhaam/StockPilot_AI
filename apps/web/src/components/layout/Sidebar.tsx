"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Search,
  Sparkles,
  Bookmark,
  Newspaper,
  ShieldCheck,
  Settings,
  TrendingUp,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/stocks", label: "Stock Explorer", icon: Search },
  { href: "/insights", label: "AI Insights", icon: Sparkles },
  { href: "/watchlist", label: "Watchlists", icon: Bookmark },
  { href: "/news", label: "News & Events", icon: Newspaper },
  { href: "/regulatory", label: "Regulatory", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "w-64 border-r border-border bg-card flex flex-col justify-between shrink-0 select-none",
        className
      )}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-primary/20 text-white">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight flex items-center gap-1.5">
              StockPilot <span className="text-primary text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">AI</span>
            </span>
            <span className="text-[10px] text-muted-foreground block -mt-0.5 font-medium">
              NSE / BSE Analytics
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-transform group-hover:scale-110",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Market Status Widget */}
      <div className="p-4 m-3 rounded-xl bg-secondary/50 border border-border/80">
        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            NSE India Live
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">9:15-15:30</span>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div>
            <div className="text-[11px] text-muted-foreground">NIFTY 50 (Est)</div>
            <div className="text-sm font-bold font-mono text-foreground">24,850.40</div>
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            +0.62%
          </span>
        </div>
      </div>
    </aside>
  );
}
