"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wifi, WifiOff, RefreshCw, Search, MapPin, Briefcase, Clock, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { usePresence, type ActiveUser } from "@/hooks/usePresence";

function formatLastSeen(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function UserCard({ user }: { user: ActiveUser }) {
  const [expanded, setExpanded] = useState(false);
  const initials = user.employeeName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      className="bg-white border border-gray-100 rounded-xl p-3 card-shadow cursor-pointer active:scale-[0.98] transition-all"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
            {initials}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.employeeName}</p>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 font-semibold px-1.5 py-0.5 rounded-full shrink-0">
              Online
            </span>
          </div>
          <p className="text-[11px] text-gray-500 truncate">
            {user.employeeCode} | {user.position}
          </p>
        </div>
        <div className="shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] text-gray-600">
              <span className="font-medium">Area:</span> {user.area}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[11px] text-gray-600">
              <span className="font-medium">Territory:</span> {user.territory}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] text-gray-600">
              <span className="font-medium">Last active:</span> {formatLastSeen(user.lastSeen)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] text-gray-600">
              <span className="font-medium">ID:</span> {user.userId}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelContent() {
  const { activeUsers, onlineCount, refreshUsers } = usePresence();
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshUsers();
      setLastRefresh(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshUsers]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return activeUsers;
    const q = search.toLowerCase();
    return activeUsers.filter(
      (u) =>
        u.employeeName.toLowerCase().includes(q) ||
        u.employeeCode.toLowerCase().includes(q) ||
        u.area.toLowerCase().includes(q) ||
        u.territory.toLowerCase().includes(q) ||
        u.position.toLowerCase().includes(q)
    );
  }, [activeUsers, search]);

  const handleRefresh = () => {
    refreshUsers();
    setLastRefresh(Date.now());
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="gradient-header text-white p-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-xs font-medium">CMS Panel</p>
            <h1 className="text-xl font-bold mt-1">User Activity Monitor</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/30 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <Users className="w-5 h-5 text-white mx-auto mb-1" />
            <div className="text-2xl font-bold">{onlineCount}</div>
            <p className="text-[10px] text-blue-200 font-medium">Online Now</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <Wifi className="w-5 h-5 text-emerald-300 mx-auto mb-1" />
            <div className="text-2xl font-bold">{activeUsers.length}</div>
            <p className="text-[10px] text-blue-200 font-medium">Active Users</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <Activity className="w-5 h-5 text-amber-300 mx-auto mb-1" />
            <div className="text-2xl font-bold">
              {Math.floor((Date.now() - lastRefresh) / 1000)}s
            </div>
            <p className="text-[10px] text-blue-200 font-medium">Last Sync</p>
          </div>
        </div>
      </div>

      <div className="-mt-4 px-4 space-y-4">
        {/* Search */}
        <Card className="card-shadow border-0">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, ID, area, territory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto-refresh toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
            <span className="text-xs text-gray-600 font-medium">
              {autoRefresh ? "Live updating" : "Auto-refresh off"}
            </span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
              autoRefresh ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {autoRefresh ? "Pause" : "Resume"}
          </button>
        </div>

        {/* User List */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-500" />
              Active Users ({filteredUsers.length})
            </CardTitle>
            <p className="text-[10px] text-gray-400 font-medium">
              Users with activity in the last 2 minutes
            </p>
          </CardHeader>
          <CardContent>
            {filteredUsers.length > 0 ? (
              <div className="space-y-2.5">
                {filteredUsers.map((user) => (
                  <UserCard key={user.userId} user={user} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <WifiOff className="w-10 h-10 mb-3" />
                <p className="text-sm font-medium">No active users</p>
                <p className="text-[11px] text-gray-300 mt-1">
                  {search ? "No users match your search" : "Users will appear here when they open the app"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
          <p className="text-[11px] text-blue-700 font-medium">
            <span className="font-semibold">How it works:</span> Users are tracked when they have the app open. 
            The panel updates every 15 seconds. Users who haven&apos;t been active for 2 minutes are marked as offline.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  return (
    <AuthGuard>
      <PanelContent />
    </AuthGuard>
  );
}
