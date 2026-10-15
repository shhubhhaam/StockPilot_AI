"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, ExternalLink, AlertTriangle, FileText, Calendar } from "lucide-react";
import { apiClient } from "@/lib/api";
import { RegulatoryEvent } from "@/types";

export default function RegulatoryPage() {
  const [events, setEvents] = useState<RegulatoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<RegulatoryEvent[]>("/regulatory-events?limit=20")
      .then((res) => setEvents(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Regulatory Intelligence <ShieldCheck className="w-5 h-5 text-primary" />
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Official statutory circulars, surveillance frameworks, and compliance notices from SEBI and RBI
        </p>
      </div>

      <div className="space-y-4">
        {events.map((ev) => {
          let impactColor = "bg-secondary text-muted-foreground";
          if (ev.impact_level === "High") {
            impactColor = "bg-red-500/10 text-red-500 border-red-500/20";
          } else if (ev.impact_level === "Medium") {
            impactColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
          }

          return (
            <div
              key={ev.id}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                    {ev.authority}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {ev.event_type}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${impactColor}`}>
                    {ev.impact_level} Impact
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(ev.published_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <h2 className="text-base font-bold text-foreground leading-snug">
                {ev.document_title}
              </h2>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {ev.summary}
              </p>

              {ev.affected_sector && (
                <div className="text-xs text-muted-foreground">
                  Affected Segment: <span className="font-semibold text-foreground">{ev.affected_sector}</span>
                </div>
              )}

              {ev.document_url && (
                <div className="pt-2">
                  <a
                    href={ev.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                  >
                    <span>Read Official Regulatory Circular</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
