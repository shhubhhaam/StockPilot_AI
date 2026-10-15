"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { User, AuthResponse } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Rehydrate auth session from localStorage
    const storedToken = localStorage.getItem("stockpilot_token");
    const storedUser = localStorage.getItem("stockpilot_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify with /auth/me in background
        apiClient
          .get<User>("/auth/me")
          .then((res) => {
            setUser(res.data);
            localStorage.setItem("stockpilot_user", JSON.stringify(res.data));
          })
          .catch(() => {
            // Token expired or invalid
            logout();
          })
          .finally(() => {
            setIsLoading(false);
          });
        return;
      } catch {
        localStorage.removeItem("stockpilot_token");
        localStorage.removeItem("stockpilot_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<AuthResponse>("/auth/login", {
        email,
        password,
      });
      const authToken = res.data.access_token;
      setToken(authToken);
      localStorage.setItem("stockpilot_token", authToken);

      // Fetch user profile
      const userRes = await apiClient.get<User>("/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(userRes.data);
      localStorage.setItem("stockpilot_user", JSON.stringify(userRes.data));

      router.push("/overview");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<AuthResponse>("/auth/register", {
        email,
        password,
        display_name: displayName,
      });
      const authToken = res.data.access_token;
      setToken(authToken);
      localStorage.setItem("stockpilot_token", authToken);

      // Fetch profile
      const userRes = await apiClient.get<User>("/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(userRes.data);
      localStorage.setItem("stockpilot_user", JSON.stringify(userRes.data));

      router.push("/overview");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      apiClient.post("/auth/logout").catch(() => {});
    } catch {}
    setToken(null);
    setUser(null);
    localStorage.removeItem("stockpilot_token");
    localStorage.removeItem("stockpilot_user");
    router.push("/login");
  };

  const refreshUser = async () => {
    try {
      const res = await apiClient.get<User>("/auth/me");
      setUser(res.data);
      localStorage.setItem("stockpilot_user", JSON.stringify(res.data));
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
