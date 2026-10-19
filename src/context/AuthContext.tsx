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
const PRESENCE_KEY = "rock_sfa_presence";
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
const HEARTBEAT_INTERVAL = 30000;

function reportPresence(user: AuthUser) {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    const store: Record<string, unknown> = raw ? JSON.parse(raw) : {};
    store[user.userId] = {
      userId: user.userId,
      employeeName: user.employeeName,
      employeeCode: user.employeeCode,
      position: user.position,
      area: user.area,
      territory: user.territory,
      lastSeen: Date.now(),
    };
    localStorage.setItem(PRESENCE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function removePresence(userId: string) {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    const store: Record<string, unknown> = raw ? JSON.parse(raw) : {};
    delete store[userId];
    localStorage.setItem(PRESENCE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    if (user) removePresence(user.userId);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [user]);

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

  useEffect(() => {
    if (!user) return;
    api.prefetchData();
    reportPresence(user);
    const interval = setInterval(() => reportPresence(user), HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string) => {
    const cleanEmail = String(email || "").trim();
    const cleanPass = String(password || "").trim();
    const res = await api.login(cleanEmail, cleanPass);
    if (res.success && res.user) {
      const userWithTs = { ...res.user, _loginTs: Date.now() };
      setUser(userWithTs as unknown as AuthUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithTs));
      api.prefetchData();
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
