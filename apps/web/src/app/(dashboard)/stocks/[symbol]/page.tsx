"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Bookmark,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  Activity,
  BarChart2,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { apiClient, formatINR, formatPercent } from "@/lib/api";
import {
  Stock,
  Candle,
  TechnicalIndicators,
  Fundamentals,
  Prediction,
  NewsEvent,
} from "@/types";
import { FinancialChart } from "@/components/charts/FinancialChart";

export default function StockDetailPage() {
  const params = useParams();
  const rawSymbol = params?.symbol as string;
  const symbol = rawSymbol?.toUpperCase() || "";

  const [stock, setStock] = useState<Stock | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(180);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);

    Promise.allSettled([
      apiClient.get<Stock>(`/stocks/${symbol}`),
      apiClient.get<Candle[]>(`/stocks/${symbol}/candles?days=${days}`),
      apiClient.get<TechnicalIndicators>(`/stocks/${symbol}/indicators`),
      apiClient.get<Fundamentals>(`/stocks/${symbol}/fundamentals`),
      apiClient.get<Prediction>(`/predictions/stocks/${symbol}`),
      apiClient.get<NewsEvent[]>(`/stocks/${symbol}/news`),
    ])
      .then(([stockRes, candlesRes, indRes, fundRes, predRes, newsRes]) => {
        if (stockRes.status === "fulfilled") setStock(stockRes.value.data);
        if (candlesRes.status === "fulfilled") setCandles(candlesRes.value.data);
        if (indRes.status === "fulfilled") setIndicators(indRes.value.data);
        if (fundRes.status === "fulfilled") setFundamentals(fundRes.value.data);
        if (predRes.status === "fulfilled") setPrediction(predRes.value.data);
        if (newsRes.status === "fulfilled") setNews(newsRes.value.data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [symbol, days]);

  if (loading && !stock) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-secondary rounded" />
        <div className="h-24 bg-card border border-border rounded-2xl" />
        <div className="h-96 bg-card border border-border rounded-2xl" />
      </div>
    );
  }

  const isUp = (stock?.change_1d || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/stocks"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Stock Explorer</span>
        </Link>
      </div>

      {/* Stock Overview Header Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
              {stock?.symbol}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-secondary font-mono text-muted-foreground font-semibold">
              {stock?.exchange}
            </span>
            {stock?.is_owned && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                In Portfolio
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground font-medium mt-1">
            {stock?.company_name} • <span className="text-foreground">{stock?.sector}</span>
          </div>
        </div>

        {/* Pricing block */}
        <div className="flex items-center gap-6 self-start md:self-auto">
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-foreground">
              {formatINR(stock?.current_price)}
            </div>
            <div className="flex items-center justify-end gap-1.5 text-xs font-mono mt-0.5">
              <span className={`font-semibold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                {isUp ? "+" : ""}
                {stock?.change_1d ? `₹${stock.change_1d.toFixed(2)}` : "—"}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                }`}
              >
                {formatPercent(stock?.change_percent_1d)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Candlestick Financial Chart */}
      <div>
        <FinancialChart
          candles={candles}
          symbol={symbol}
          onRangeChange={(d) => setDays(d)}
          activeDays={days}
        />
      </div>

      {/* Technical Indicators & AI Outlook Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technical Indicators Summary */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Technical Indicators</h2>
          </div>

          {indicators ? (
            <div className="space-y-3 text-xs">
              {/* RSI */}
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-muted-foreground font-medium">RSI (14 Periods)</span>
                  <span className="font-mono font-bold text-foreground">{indicators.rsi_14 ?? "—"}</span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, indicators.rsi_14 || 50))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>30 Oversold</span>
                  <span>70 Overbought</span>
                </div>
              </div>

              {/* MACD */}
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">MACD (12, 26, 9)</span>
                  <span className="font-mono font-bold text-foreground">{indicators.macd ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Histogram</span>
                  <span
                    className={`font-mono font-semibold ${
                      (indicators.macd_histogram || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {indicators.macd_histogram ?? "—"}
                  </span>
                </div>
              </div>

              {/* Bollinger Bands & Volatility */}
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bollinger Upper</span>
                  <span className="font-mono text-foreground">₹{indicators.bb_upper?.toFixed(2) ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bollinger Lower</span>
                  <span className="font-mono text-foreground">₹{indicators.bb_lower?.toFixed(2) ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ATR (14)</span>
                  <span className="font-mono text-foreground">₹{indicators.atr_14 ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">20D Volatility (Ann.)</span>
                  <span className="font-mono text-foreground">
                    {indicators.volatility_20d ? `${(indicators.volatility_20d * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
              </div>

              {/* Detected Candlestick Patterns */}
              {indicators.detected_patterns && indicators.detected_patterns.length > 0 && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <span className="text-[11px] font-semibold text-primary block mb-1">
                    Detected Candlestick Formations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {indicators.detected_patterns.map((pat) => (
                      <span
                        key={pat}
                        className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium"
                      >
                        {pat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-6 text-center">
              Calculating technical indicators...
            </div>
          )}
        </div>

        {/* Company Fundamentals */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Company Fundamentals</h2>
          </div>

          {fundamentals ? (
            <div className="space-y-2 text-xs divide-y divide-border/60">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Period Reported</span>
                <span className="font-mono font-bold text-foreground">{fundamentals.fiscal_period}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">TTM Revenue</span>
                <span className="font-mono text-foreground">{formatINR(fundamentals.revenue, 0)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Revenue Growth (YoY)</span>
                <span className="font-mono text-emerald-500 font-semibold">
                  {formatPercent((fundamentals.revenue_growth_yoy || 0) * 100)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Net Profit</span>
                <span className="font-mono text-foreground">{formatINR(fundamentals.net_profit, 0)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">EPS (TTM)</span>
                <span className="font-mono text-foreground">₹{fundamentals.eps?.toFixed(2) ?? "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">P/E Ratio</span>
                <span className="font-mono font-semibold text-foreground">{fundamentals.pe_ratio ?? "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">P/B Ratio</span>
                <span className="font-mono text-foreground">{fundamentals.pb_ratio ?? "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Debt to Equity</span>
                <span className="font-mono text-foreground">{fundamentals.debt_to_equity ?? "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">ROE</span>
                <span className="font-mono text-foreground">{fundamentals.roe ? `${fundamentals.roe}%` : "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">ROCE</span>
                <span className="font-mono text-foreground">{fundamentals.roce ? `${fundamentals.roce}%` : "—"}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-6 text-center">
              Loading financial fundamentals...
            </div>
          )}
        </div>

        {/* AI Outlook & Decision Support */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">AI Outlook Analysis</h2>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              v{prediction?.model_version || "1.0.0"}
            </span>
          </div>

          {prediction ? (
            <div className="space-y-3.5 text-xs">
              {/* Decision Support Badge */}
              <div className="p-4 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Decision Support Signal</span>
                  <span className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                    {prediction.decision_support_label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Horizon</span>
                  <span className="text-sm font-bold font-mono text-primary">
                    {prediction.prediction_horizon}
                  </span>
                </div>
              </div>

              {/* Status Notice if Model Unavailable */}
              {prediction.model_status !== "AVAILABLE" && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Model Adapter Status: {prediction.model_status}</span>
                  </div>
                  <p className="text-muted-foreground">
                    Model weights awaiting upload in <code className="text-foreground">ml/artifacts/</code>. To prevent false guarantees, predictions are held in transparent inspection mode.
                  </p>
                </div>
              )}

              {/* Top Feature Contributions */}
              {prediction.top_features && prediction.top_features.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Key Influencing Factors
                  </span>
                  <div className="space-y-2">
                    {prediction.top_features.map((feat) => (
                      <div
                        key={feat.feature_name}
                        className="p-2.5 rounded-lg border border-border/80 bg-secondary/20 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-semibold text-foreground block">
                            {feat.feature_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Calculated value: {feat.value}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-primary">
                          {(feat.importance * 100).toFixed(0)}% weight
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground leading-relaxed">
                Disclaimer: AI outlooks are algorithmic quantitative signals calculated from time-series features. They are not personalized financial advice or guaranteed returns.
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-6 text-center">
              Evaluating quantitative signals...
            </div>
          )}
        </div>
      </div>

      {/* Stock Specific News */}
      {news.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Recent Announcements & Media for {symbol}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {news.map((n) => (
              <div key={n.id} className="p-3.5 rounded-xl border border-border hover:bg-secondary/30 transition-colors space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-primary">{n.source}</span>
                  <span>{new Date(n.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                <div className="text-xs font-bold text-foreground">{n.title}</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{n.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
