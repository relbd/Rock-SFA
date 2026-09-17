"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

const PRESENCE_KEY = "rock_sfa_presence";
const HEARTBEAT_INTERVAL = 30000;
const OFFLINE_THRESHOLD = 120000;

export interface ActiveUser {
  userId: string;
  employeeName: string;
  employeeCode: string;
  position: string;
  area: string;
  territory: string;
  lastSeen: number;
}

function getPresenceStore(): Record<string, ActiveUser> {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setPresenceStore(store: Record<string, ActiveUser>) {
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(store));
}

function broadcastChannel() {
  if (typeof window === "undefined") return null;
  try {
    return new BroadcastChannel("rock_sfa_presence");
  } catch {
    return null;
  }
}

export function usePresence() {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const channelRef = useRef(broadcastChannel());

  const refreshUsers = useCallback(() => {
    const store = getPresenceStore();
    const now = Date.now();
    const users = Object.values(store)
      .filter((u) => now - u.lastSeen < OFFLINE_THRESHOLD)
      .sort((a, b) => b.lastSeen - a.lastSeen);
    setActiveUsers(users);
  }, []);

  useEffect(() => {
    if (!user) return;

    const heartbeat = () => {
      const store = getPresenceStore();
      store[user.userId] = {
        userId: user.userId,
        employeeName: user.employeeName,
        employeeCode: user.employeeCode,
        position: user.position,
        area: user.area,
        territory: user.territory,
        lastSeen: Date.now(),
      };
      setPresenceStore(store);
      channelRef.current?.postMessage({ type: "heartbeat" });
      refreshUsers();
    };

    heartbeat();
    const interval = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === PRESENCE_KEY) refreshUsers();
    };
    window.addEventListener("storage", handleStorage);

    const channel = channelRef.current;
    const handleMessage = () => refreshUsers();
    channel?.addEventListener("message", handleMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      channel?.removeEventListener("message", handleMessage);

      const store = getPresenceStore();
      delete store[user.userId];
      setPresenceStore(store);
      channel?.postMessage({ type: "logout" });
    };
  }, [user, refreshUsers]);

  useEffect(() => {
    refreshUsers();
    const interval = setInterval(refreshUsers, 10000);
    return () => clearInterval(interval);
  }, [refreshUsers]);

  const onlineCount = activeUsers.length;
  const totalCount = activeUsers.length;

  return { activeUsers, onlineCount, totalCount, refreshUsers };
}
