"use client";

import React, { useState } from "react";
import { User, Shield, Moon, Sun, Monitor, Check, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { apiClient } from "@/lib/api";

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [exchange, setExchange] = useState("NSE");
  const [horizon, setHorizon] = useState("5d");
  const [riskTolerance, setRiskTolerance] = useState("Moderate");
  const [savedMessage, setSavedMessage] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await apiClient.patch("/users/me", { display_name: displayName });
      await refreshUser();
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your account preferences, themes, and quantitative defaults
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <span>User Profile</span>
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Email Address (Login ID)
            </label>
            <input
              type="text"
              disabled
              value={user?.email || ""}
              className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg text-sm font-mono text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border focus:border-primary rounded-lg text-sm outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-lg shadow-sm disabled:opacity-50"
          >
            {updating ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Appearance Section */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Moon className="w-4 h-4 text-primary" />
          <span>Theme & Interface</span>
        </h2>

        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${
              theme === "dark"
                ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                : "border-border hover:bg-secondary/60 text-muted-foreground"
            }`}
          >
            <Moon className="w-5 h-5 text-amber-400" />
            <span>Dark Theme</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${
              theme === "light"
                ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                : "border-border hover:bg-secondary/60 text-muted-foreground"
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span>Light Theme</span>
          </button>
        </div>
      </div>

      {/* Quantitative & Trading Defaults */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span>Analytics Preferences</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl text-xs">
          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              Primary Exchange
            </label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none font-mono"
            >
              <option value="NSE">NSE (National Stock Exchange)</option>
              <option value="BSE">BSE (Bombay Stock Exchange)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              Default Horizon
            </label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none font-mono"
            >
              <option value="1d">1 Day (Intraday Posture)</option>
              <option value="5d">5 Days (Swing Outlook)</option>
              <option value="20d">20 Days (Monthly Trend)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              Risk Tolerance
            </label>
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none font-mono"
            >
              <option value="Conservative">Conservative</option>
              <option value="Moderate">Moderate</option>
              <option value="Aggressive">Aggressive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sign Out Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Sign out of StockPilot AI</h3>
          <p className="text-xs text-muted-foreground">End your current session on this device.</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
