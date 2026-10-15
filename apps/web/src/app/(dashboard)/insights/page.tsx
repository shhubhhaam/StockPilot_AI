"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Filter,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import { apiClient, formatPercent } from "@/lib/api";
import { Prediction, ModelStatus } from "@/types";

export default function InsightsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOutlook, setSelectedOutlook] = useState("All");
  const [selectedSector, setSelectedSector] = useState("All");

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      apiClient.get<Prediction[]>("/predictions"),
      apiClient.get<ModelStatus>("/predictions/status"),
    ])
      .then(([predRes, statusRes]) => {
        if (predRes.status === "fulfilled") setPredictions(predRes.value.data);
        if (statusRes.status === "fulfilled") setModelStatus(statusRes.value.data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filtered = predictions.filter((p) => {
    const matchOutlook = selectedOutlook === "All" || p.decision_support_label.toLowerCase() === selectedOutlook.toLowerCase();
    const matchSector = selectedSector === "All" || p.sector.toLowerCase().includes(selectedSector.toLowerCase());
    return matchOutlook && matchSector;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          AI Quantitative Insights <Sparkles className="w-5 h-5 text-primary" />
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Algorithmic stock-level predictions with supporting feature attributions & uncertainty information
        </p>
      </div>

      {/* Model Transparency & Status Banner */}
      {modelStatus && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  modelStatus.status === "AVAILABLE"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {modelStatus.status === "AVAILABLE" ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>{modelStatus.model_name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground font-semibold">
                    v{modelStatus.model_version}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Framework: <span className="text-foreground font-medium">{modelStatus.framework}</span> • Horizon:{" "}
                  <span className="text-foreground font-mono font-semibold">{modelStatus.prediction_horizon}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  modelStatus.status === "AVAILABLE"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                }`}
              >
                Status: {modelStatus.status}
              </span>
            </div>
          </div>

          {modelStatus.missing_requirements && modelStatus.missing_requirements.length > 0 && (
            <div className="p-3 bg-secondary/40 border border-border/80 rounded-xl text-xs space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" />
                Model Adapter Contract Notice:
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Trained model artifacts are awaiting placement in <code className="text-foreground font-mono">ml/artifacts/</code>. To prevent lookahead leakage and fabricated outputs, predictions are processed in deterministic safety mode.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Filter Outlook:</span>
        {["All", "Positive", "Neutral", "Negative", "Monitor"].map((label) => (
          <button
            key={label}
            onClick={() => setSelectedOutlook(label)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedOutlook === label
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Predictions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p) => {
          let badgeColor = "bg-secondary text-muted-foreground";
          if (p.decision_support_label === "Positive") badgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
          else if (p.decision_support_label === "Negative") badgeColor = "bg-red-500/10 text-red-500 border-red-500/20";
          else if (p.decision_support_label === "Monitor") badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";

          return (
            <div
              key={p.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Link
                      href={`/stocks/${p.symbol}`}
                      className="font-bold font-mono text-base text-foreground hover:text-primary transition-colors"
                    >
                      {p.symbol}
                    </Link>
                    <span className="block text-xs text-muted-foreground truncate max-w-[180px]">
                      {p.company_name}
                    </span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>
                    {p.decision_support_label}
                  </span>
                </div>

                <div className="p-3 bg-secondary/30 rounded-xl border border-border/60 text-xs space-y-1 mb-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Horizon</span>
                    <span className="font-mono font-semibold text-foreground">{p.prediction_horizon}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Sector</span>
                    <span className="text-foreground">{p.sector}</span>
                  </div>
                  {p.predicted_return !== null && p.predicted_return !== undefined && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Expected Return</span>
                      <span className="font-mono font-bold text-emerald-500">
                        {formatPercent(p.predicted_return * 100)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Top Features */}
                {p.top_features && p.top_features.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Contributing Signals:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.top_features.map((f) => (
                        <span
                          key={f.feature_name}
                          className="px-2 py-0.5 rounded bg-secondary text-[11px] font-mono text-muted-foreground"
                        >
                          {f.feature_name}: {f.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Generated {new Date(p.prediction_timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <Link
                  href={`/stocks/${p.symbol}`}
                  className="text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Analysis</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
