"use client";

import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, type LoginUser, type LoginResponse } from "@/services/api";

export type AuthUser = LoginUser;

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "rock_sfa_user";
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser(parsed);
        const loginTime = parsed as unknown as Record<string, unknown>;
        const ts = (loginTime as { _loginTs?: number })?._loginTs;
        if (ts && Date.now() - ts > SESSION_TIMEOUT_MS) {
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      logout();
    }, SESSION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [user, logout]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (res.success && res.user) {
      const userWithTs = { ...res.user, _loginTs: Date.now() };
      setUser(userWithTs as unknown as AuthUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithTs));
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
