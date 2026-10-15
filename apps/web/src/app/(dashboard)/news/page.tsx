"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Newspaper, ExternalLink, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { NewsEvent } from "@/types";

export default function NewsPage() {
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<NewsEvent[]>("/news?limit=30")
      .then((res) => setNews(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = news.filter(
    (n) =>
      n.title.toLowerCase().includes(filter.toLowerCase()) ||
      n.summary.toLowerCase().includes(filter.toLowerCase()) ||
      (n.symbol && n.symbol.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Financial News & Corporate Events <Newspaper className="w-5 h-5 text-primary" />
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time curated announcements and sentiment intelligence across Indian markets
        </p>
      </div>

      {/* Search Input */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Filter news by company or keyword..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:border-primary"
        />
      </div>

      {/* News Feed List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => {
          let sentimentBadge = "bg-secondary text-muted-foreground";
          if (item.sentiment_label === "Positive") {
            sentimentBadge = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
          } else if (item.sentiment_label === "Negative") {
            sentimentBadge = "bg-red-500/10 text-red-500 border-red-500/20";
          }

          return (
            <div
              key={item.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <div className="flex items-center gap-2">
                    {item.symbol ? (
                      <Link
                        href={`/stocks/${item.symbol}`}
                        className="font-bold font-mono text-primary hover:underline"
                      >
                        {item.symbol}
                      </Link>
                    ) : (
                      <span className="font-semibold text-primary">Market Wide</span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary">
                      {item.event_type}
                    </span>
                  </div>
                  <span>
                    {new Date(item.published_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-foreground leading-snug mb-2">
                  {item.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sentimentBadge}`}>
                  Sentiment: {item.sentiment_label || "Neutral"}
                </span>

                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium"
                  >
                    <span>{item.source}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
