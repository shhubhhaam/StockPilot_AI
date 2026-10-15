"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Compass, AlertCircle, ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Invalid email or password. Please verify your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = async () => {
    setEmail("investor@stockpilot.ai");
    setPassword("StockPilot2026!");
    setError(null);
    setLoading(true);

    try {
      // Try login first, if user doesn't exist yet, auto-register
      try {
        await login("investor@stockpilot.ai", "StockPilot2026!");
      } catch (e: any) {
        if (e.response?.status === 401 || e.response?.status === 400) {
          await register("investor@stockpilot.ai", "StockPilot2026!", "Aarav Sharma");
        } else {
          throw e;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to initialize demo account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-xl shadow-primary/25 text-white mb-3">
            <Compass className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            StockPilot <span className="text-primary text-xs font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">AI</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indian Equity Portfolio & Decision-Support System
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-foreground mb-1">Sign in to your account</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Access real-time Indian equities analysis, portfolio metrics, and AI signals.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border focus:border-primary focus:bg-background rounded-lg text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border focus:border-primary focus:bg-background rounded-lg text-sm outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-lg shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <div className="mt-6 pt-5 border-t border-border">
            <button
              type="button"
              onClick={fillDemoAccount}
              disabled={loading}
              className="w-full py-2 px-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>One-Click Demo Account (Instant Login)</span>
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
}
