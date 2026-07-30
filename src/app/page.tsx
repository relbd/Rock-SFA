"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ShoppingCart, Route, Clock, CheckCircle, Navigation, Target, TrendingUp, Package, RefreshCw, AlertCircle, Store, UserPlus, Activity, Zap, XCircle, ArrowUp, ArrowDown, Minus, LogOut } from "lucide-react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { api, type DashboardData, type DashboardOrder, type RoutePoint, type ReportData } from "@/services/api";
import { ThreeMonthSummary } from "./components/ThreeMonthSummary";
import { TopProductsCard } from "./components/TopProductsCard";
import { TopCustomersCard } from "./components/TopCustomersCard";
import { AttendanceHistoryCard } from "./components/AttendanceHistoryCard";
import { DistributorQuantityCard } from "./components/DistributorQuantityCard";
import { computeAvgTimePerShop, formatMinutes } from "./map";

const VISIT_TARGET = 20;

function formatTime(ts: string): string {
  if (!ts) return "";
  if (/^\d{1,2}:\d{2}\s?(AM|PM|am|pm)$/i.test(ts.trim())) return ts.trim();
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) {
      const match = ts.match(/(\d{1,2}:\d{2}:\d{2})/);
      if (match) {
        const parts = match[1].split(":");
        let h = parseInt(parts[0]);
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return h + ":" + parts[1] + " " + ampm;
      }
      return ts;
    }
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return ts;
  }
}

function EmptyState({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
      <Icon className="w-10 h-10 mb-2" />
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function CircularProgress({ current, target }: { current: number; target: number }) {
  const pct = Math.min((current / target) * 100, 100);
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct >= 100 ? "#16a34a" : pct >= 50 ? "#2563eb" : "#f59e0b";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle
          cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-bold" style={{ color }}>{current}</div>
        <div className="text-[10px] text-gray-400">/ {target}</div>
      </div>
    </div>
  );
}

function MonthTrendChart({ data }: { data: Array<{ date: string; visits: number; orders: number; qty: number }> }) {
  if (!data || data.length === 0) return <EmptyState icon={TrendingUp} label="No trend data available" />;

  const monthMap: Record<string, { visits: number; orders: number; qty: number; label: string }> = {};
  data.forEach((d) => {
    const date = new Date(d.date);
    if (isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (!monthMap[key]) monthMap[key] = { visits: 0, orders: 0, qty: 0, label };
    monthMap[key].visits += d.visits;
    monthMap[key].orders += d.orders;
    monthMap[key].qty += d.qty;
  });

  const months = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  if (months.length === 0) return <EmptyState icon={TrendingUp} label="No trend data available" />;

  const maxVal = Math.max(...months.map((m) => Math.max(m.visits, m.orders)), 1);
  const chartW = 280;
  const chartH = 130;
  const padding = 32;
  const innerW = chartW - padding - 12;
  const innerH = chartH - 24;
  const stepX = months.length > 1 ? innerW / (months.length - 1) : 0;

  const visitPoints = months.map((m, i) => ({
    x: padding + i * stepX,
    y: innerH - (m.visits / maxVal) * (innerH - 12) + 6,
    val: m.visits,
  }));
  const orderPoints = months.map((m, i) => ({
    x: padding + i * stepX,
    y: innerH - (m.orders / maxVal) * (innerH - 12) + 6,
    val: m.orders,
  }));

  const visitPath = visitPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const orderPath = orderPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} className="overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={padding} x2={chartW - 12}
            y1={innerH - t * (innerH - 12) + 6} y2={innerH - t * (innerH - 12) + 6}
            stroke="#f1f5f9" strokeWidth="1" />
        ))}
        <path d={visitPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {visitPoints.map((p, i) => (
          <g key={`v${i}`}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-blue-600" style={{ fontSize: "9px", fontWeight: "bold" }}>{p.val}</text>
          </g>
        ))}
        <path d={orderPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 3" />
        {orderPoints.map((p, i) => (
          <g key={`o${i}`}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#10b981" stroke="white" strokeWidth="1.5" />
            <text x={p.x} y={p.y + 14} textAnchor="middle" className="fill-emerald-600" style={{ fontSize: "9px", fontWeight: "bold" }}>{p.val}</text>
          </g>
        ))}
        {months.map((m, i) => (
          <text key={i} x={padding + i * stepX} y={chartH - 2} textAnchor="middle" className="fill-gray-500" style={{ fontSize: "9px" }}>{m.label}</text>
        ))}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-500 rounded" />
          <span className="text-[10px] text-gray-500 font-medium">Visits</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-500 rounded" style={{ borderTop: "2px dashed #10b981" }} />
          <span className="text-[10px] text-gray-500 font-medium">Orders</span>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ route: RoutePoint[]; showTimeline?: boolean; heightClass?: string }> | null>(null);

  const fetchData = useCallback(async (email: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [dashRes, reportRes] = await Promise.all([
        api.getDashboardData(email),
        api.getReportData(email).catch(() => null),
      ]);
      if (dashRes.success && dashRes.data) {
        setData(dashRes.data);
        setError(null);
      } else {
        setError(dashRes.message || "Failed to load dashboard data");
      }
      if (reportRes?.success && reportRes.data) {
        setReport(reportRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    fetchData(user.email);
  }, [user?.email, fetchData]);

  const handleRefresh = () => {
    if (!user?.email || refreshing) return;
    fetchData(user.email, true);
  };

  useEffect(() => {
    import("./map").then((mod) => setMapComponent(() => mod.default));
  }, []);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, DashboardOrder[]> = {};
    (data?.orders || []).forEach((o) => {
      if (!groups[o.invoiceId]) groups[o.invoiceId] = [];
      groups[o.invoiceId].push(o);
    });
    return Object.entries(groups);
  }, [data?.orders]);

  const initials = user?.employeeName?.split(" ").map((n) => n[0]).join("") || "?";
  const visitPct = data ? Math.min(Math.round((data.visitCount / VISIT_TARGET) * 100), 100) : 0;
  const remaining = data ? Math.max(VISIT_TARGET - data.visitCount, 0) : VISIT_TARGET;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const todayConversionRate = data && data.visitCount > 0 ? (data.orderCount / data.visitCount) * 100 : 0;

  const avgVisitsPerDay = report?.summary.avgVisitsPerDay || 0;
  const avgOrdersPerDay = report && report.summary.activeDays > 0 ? report.summary.totalOrders / report.summary.activeDays : 0;
  const avgQtyPerDay = report && report.summary.activeDays > 0 ? report.summary.totalOrderQty / report.summary.activeDays : 0;

  const visitDiff = data ? data.visitCount - avgVisitsPerDay : 0;
  const orderDiff = data ? data.orderCount - avgOrdersPerDay : 0;
  const qtyDiff = data ? data.totalOrderQty - avgQtyPerDay : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="gradient-header text-white p-4 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium">{greeting}</p>
            <h1 className="text-xl font-bold mt-1">{user?.employeeName || "User"}</h1>
            <p className="text-blue-200 text-xs mt-1">{user?.territory} | {user?.area}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh dashboard"
              className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/30 disabled:opacity-50 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <div className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
              {initials}
            </div>
            <button
              onClick={logout}
              aria-label="Logout"
              className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-white border border-red-400/30 active:scale-95 transition-all hover:bg-red-500/30"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="-mt-4 px-4 space-y-4">

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 card-shadow">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-800">Could not load data</p>
              <p className="text-[11px] text-red-600 mt-0.5 break-words">{error}</p>
            </div>
            <button onClick={handleRefresh} disabled={refreshing} className="text-[11px] font-semibold text-red-700 underline shrink-0 disabled:opacity-50">
              Retry
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { href: "/visit", icon: Store, color: "blue", label: "Visit" },
            { href: "/order", icon: ShoppingCart, color: "emerald", label: "Order" },
            { href: "/attendance", icon: Clock, color: "amber", label: "Attend" },
            { href: "/customers", icon: UserPlus, color: "violet", label: "Customer" },
          ].map((action) => (
            <Link key={action.label} href={action.href} className="flex flex-col items-center justify-center bg-white rounded-2xl card-shadow py-3.5 active:scale-95 transition-all">
              <div className={`bg-${action.color}-100 p-2.5 rounded-xl mb-1.5`}>
                <action.icon className={`w-4 h-4 text-${action.color}-600`} />
              </div>
              <span className="text-[10px] font-semibold text-gray-700">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Attendance Card */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2.5 rounded-xl">
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Clock In</p>
                  <p className="text-sm font-bold">{formatTime(data?.clockIn || "") || "--:--"}</p>
                </div>
              </div>
              <div className="h-10 w-px bg-gray-200" />
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2.5 rounded-xl">
                  <Clock className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Clock Out</p>
                  <p className="text-sm font-bold">{formatTime(data?.clockOut || "") || "--:--"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visit Target Progress */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <CircularProgress current={data?.visitCount || 0} target={VISIT_TARGET} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold">Visit Target</p>
                </div>
                <p className="text-xs text-gray-500 mb-2">{visitPct}% completed</p>
                {visitPct >= 100 ? (
                  <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Target Achieved!
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {remaining} more visits needed
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: MapPin, color: "blue", value: data?.visitCount || 0, label: "Visits" },
            { icon: ShoppingCart, color: "emerald", value: data?.orderCount || 0, label: "Orders" },
            { icon: Route, color: "amber", value: data?.totalDistanceKm || 0, label: "KM Traveled" },
          ].map((stat) => (
            <Card key={stat.label} className="card-shadow border-0">
              <CardContent className="p-3 text-center">
                <stat.icon className={`w-5 h-5 text-${stat.color}-600 mx-auto mb-1.5`} />
                <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
                <p className="text-[10px] text-gray-500 font-medium">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance vs Monthly Average */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Performance vs Monthly Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Conversion Rate */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3.5 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Today&apos;s Conversion Rate</p>
                  <p className="text-2xl font-bold text-amber-600">{todayConversionRate.toFixed(0)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 font-medium">Orders / Visits</p>
                  <p className="text-sm font-semibold text-gray-700">{data?.orderCount || 0} / {data?.visitCount || 0}</p>
                </div>
              </div>
              <div className="h-2 bg-white/60 rounded-full overflow-hidden mt-2.5">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${Math.min(todayConversionRate, 100)}%` }} />
              </div>
            </div>

            {/* Today vs Avg */}
            <div className="space-y-2">
              {[
                { label: "Visits", today: data?.visitCount || 0, avg: avgVisitsPerDay, diff: visitDiff, color: "blue" },
                { label: "Orders", today: data?.orderCount || 0, avg: avgOrdersPerDay, diff: orderDiff, color: "emerald" },
                { label: "Qty Sold", today: data?.totalOrderQty || 0, avg: avgQtyPerDay, diff: qtyDiff, color: "amber" },
              ].map((row) => {
                const isUp = row.diff > 0;
                const isDown = row.diff < 0;
                const isFlat = row.diff === 0;
                const diffPct = row.avg > 0 ? Math.abs((row.diff / row.avg) * 100) : 0;
                return (
                  <div key={row.label} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                    <span className="text-xs font-semibold text-gray-700">{row.label}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[9px] text-gray-400 font-medium">Today / Avg</p>
                        <p className="text-xs font-bold text-gray-800">
                          {row.today} <span className="text-gray-400 font-normal">/ {row.avg.toFixed(1)}</span>
                        </p>
                      </div>
                      <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${isUp ? "bg-emerald-100 text-emerald-700" : isDown ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                        {isUp ? <ArrowUp className="w-2.5 h-2.5" /> : isDown ? <ArrowDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                        {isFlat ? "0%" : `${diffPct.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {!report && (
              <p className="text-[10px] text-gray-400 text-center mt-3">Monthly average unavailable</p>
            )}
          </CardContent>
        </Card>

        {/* Visit Results */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" />
              Visit Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.visits && data.visits.length > 0
              ? (() => {
                  const productive = data.visits.filter((v) => v.totalQuantity > 0).length;
                  const noOrder = data.visits.length - productive;
                  const productivePct = data.visits.length > 0 ? (productive / data.visits.length) * 100 : 0;
                  return (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle className="w-3 h-3" /> Productive
                          </span>
                          <span className="text-gray-500 font-medium">{productive} / {data.visits.length}</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${productivePct}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                          <div className="text-xl font-bold text-emerald-600">{productive}</div>
                          <p className="text-[10px] text-gray-500 font-medium">With Order</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3 text-center">
                          <div className="text-xl font-bold text-red-500">{noOrder}</div>
                          <p className="text-[10px] text-gray-500 font-medium">No Order</p>
                        </div>
                      </div>
                      {noOrder > 0 && (
                        <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-2.5">
                          <XCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-amber-700 font-medium">
                            {noOrder} visit{noOrder > 1 ? "s" : ""} without order. Consider follow-up.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()
              : <EmptyState icon={Activity} label="No visits recorded today" />
            }
          </CardContent>
        </Card>

        {/* Route Map */}
        <Card className="card-shadow border-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              Today&apos;s Route
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data?.route && data.route.length > 0 ? (
              <>
                <div className="w-full">
                  {MapComponent ? (
                    <MapComponent route={data.route} showTimeline heightClass="h-72" />
                  ) : (
                    <div className="h-72 bg-gray-100 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-xs">
                    <div><span className="text-gray-500 font-medium">Stops: </span><span className="font-bold">{data.route.length}</span></div>
                    <div><span className="text-gray-500 font-medium">Distance: </span><span className="font-bold">{data.totalDistanceKm} km</span></div>
                    <div><span className="text-gray-500 font-medium">Areas: </span><span className="font-bold">{data.areasVisited?.length || 0}</span></div>
                    <div><span className="text-gray-500 font-medium">Avg/Shop: </span><span className="font-bold">{formatMinutes(computeAvgTimePerShop(data.route))}</span></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-48 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                <Navigation className="w-8 h-8 mb-2" />
                <p className="text-xs font-medium">No route data for today</p>
                <p className="text-[10px] text-gray-300 mt-1">Visits with GPS will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              Today&apos;s Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.visitCount > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { bg: "blue", label: "Total Qty Sold", value: data.totalOrderQty },
                  { bg: "emerald", label: "Avg Qty/Visit", value: data.visitCount > 0 ? (data.totalOrderQty / data.visitCount).toFixed(1) : 0 },
                  { bg: "amber", label: "Avg Distance/Stop", value: `${data.route.length > 1 ? (data.totalDistanceKm / (data.route.length - 1)).toFixed(1) : 0} km` },
                  { bg: "violet", label: "Areas Covered", value: data.areasVisited?.length || 0 },
                ].map((item) => (
                  <div key={item.label} className={`bg-${item.bg}-50 p-3 rounded-xl`}>
                    <p className="text-[10px] text-gray-500 font-medium">{item.label}</p>
                    <p className={`text-lg font-bold text-${item.bg}-600`}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={TrendingUp} label="No analytics yet - start visiting customers" />
            )}
          </CardContent>
        </Card>

        {/* Order Activity */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Order Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupedOrders.length > 0 ? (
              <div className="max-h-96 overflow-auto space-y-2.5 pr-1">
                {groupedOrders.map(([invoiceId, items]) => (
                  <div key={invoiceId} className="border border-gray-100 rounded-xl p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600">{invoiceId}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 font-semibold px-1.5 py-0.5 rounded-md">
                          {items.length} item{items.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">{formatTime(items[0].createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-700 font-semibold mb-1.5">{items[0].customerName}</p>
                    <div className="space-y-1">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 truncate">{item.productName}</span>
                          <span className="text-gray-700 font-semibold shrink-0 ml-2">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Package} label="No orders placed today" />
            )}
          </CardContent>
        </Card>

        {/* Visit Timeline */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Visit Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.visits && data.visits.length > 0 ? (
              <div className="max-h-96 overflow-auto space-y-0 pr-1">
                {data.visits.map((visit, idx) => {
                  const hasGps = visit.latitude && visit.longitude;
                  return (
                    <div key={visit.visitId} className="flex gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${idx === 0 ? "bg-blue-600" : idx === data.visits.length - 1 ? "bg-emerald-600" : "bg-gray-400"}`}>
                          {idx + 1}
                        </div>
                        {idx < data.visits.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-white border border-gray-100 rounded-xl p-3 card-shadow">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{visit.customerName}</p>
                              <p className="text-[11px] text-gray-500">{visit.customerCode} | {visit.area || visit.city}</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-[11px] font-medium text-gray-600">{formatTime(visit.timestamp)}</p>
                              {hasGps && <MapPin className="w-3 h-3 text-emerald-500 ml-auto mt-0.5" />}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {visit.brandFocus && <span className="text-[10px] bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-md">{visit.brandFocus}</span>}
                            {visit.totalQuantity > 0 && <span className="text-[10px] bg-emerald-50 text-emerald-600 font-medium px-2 py-0.5 rounded-md">Qty: {visit.totalQuantity}</span>}
                            {visit.visitResult && <span className="text-[10px] bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-md">{visit.visitResult}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={CheckCircle} label="No visits today" />
            )}
          </CardContent>
        </Card>

        {/* 3-Month Summary */}
        <ThreeMonthSummary report={report} />

        {/* Monthly Trend */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Monthly Trend
            </CardTitle>
            <p className="text-[10px] text-gray-400 font-medium">Visits & orders over time</p>
          </CardHeader>
          <CardContent>
            <MonthTrendChart data={report?.dailySummary || []} />
          </CardContent>
        </Card>

        {/* Area Breakdown */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-500" />
              Visits by Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report && report.areaBreakdown && report.areaBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {report.areaBreakdown.slice(0, 6).map((a, idx) => {
                  const maxVisits = report.areaBreakdown[0]?.visits || 1;
                  const pct = Math.min((a.visits / maxVisits) * 100, 100);
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 font-semibold truncate">{a.area}</span>
                        <span className="text-gray-500 shrink-0 ml-2 font-medium">{a.visits} visits</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={MapPin} label="No area breakdown data" />
            )}
          </CardContent>
        </Card>

        {/* Distributor by Quantity */}
        <DistributorQuantityCard report={report} />

        {/* Attendance History */}
        <AttendanceHistoryCard report={report} />

        {/* Top Products & Customers */}
        <TopProductsCard report={report} />
        <TopCustomersCard report={report} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
