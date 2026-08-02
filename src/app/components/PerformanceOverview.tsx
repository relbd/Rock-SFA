"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { type ReportData, type ReportOrder, type ReportVisit } from "@/services/api";

interface Props {
  report: ReportData | null;
  todayData?: {
    visits: number;
    orders: number;
    qty: number;
    distance: number;
    clockIn?: string;
    clockOut?: string;
  };
}

const SHORT_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getOrderMonthYear(order: ReportOrder): { month: number; year: number } | null {
  const m = order.orderMonth;
  const y = order.orderYear;
  if (typeof m === "number" && typeof y === "number" && m >= 1 && m <= 12 && y >= 2020) return { month: m, year: y };
  const dateStr = order.createdAt || order.date;
  if (!dateStr) return null;
  const iso = dateStr.match(/^(\d{4})-(\d{2})/);
  if (iso) return { month: parseInt(iso[2]), year: parseInt(iso[1]) };
  const dash = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (dash) {
    const sm: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    if (sm[dash[2]]) return { month: sm[dash[2]], year: parseInt(dash[3]) };
  }
  const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return { month: parseInt(slash[1]), year: parseInt(slash[3]) };
  try { const d = new Date(dateStr); if (!isNaN(d.getTime())) return { month: d.getMonth() + 1, year: d.getFullYear() }; } catch {}
  return null;
}

function getVisitMonth(visit: ReportVisit): { month: number; year: number } | null {
  const dateStr = visit.date || visit.timestamp;
  if (!dateStr) return null;
  const iso = dateStr.match(/^(\d{4})-(\d{2})/);
  if (iso) return { month: parseInt(iso[2]), year: parseInt(iso[1]) };
  const dMatch = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (dMatch) {
    const sm: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    if (sm[dMatch[2]]) return { month: sm[dMatch[2]], year: parseInt(dMatch[3]) };
  }
  const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return { month: parseInt(slash[1]), year: parseInt(slash[3]) };
  try { const d = new Date(dateStr); if (!isNaN(d.getTime())) return { month: d.getMonth() + 1, year: d.getFullYear() }; } catch {}
  return null;
}

function MetricRow({ label, current, previous, unit }: { label: string; current: number; previous: number; unit?: string }) {
  const diff = current - previous;
  const pct = previous > 0 ? ((diff / previous) * 100) : current > 0 ? 100 : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;
  const display = unit === "decimal" ? current.toFixed(1) : Math.round(current);
  const prevDisplay = unit === "decimal" ? previous.toFixed(1) : Math.round(previous);

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs font-bold text-gray-900">{display}</span>
          <span className="text-[10px] text-gray-400 ml-1">/ {prevDisplay}</span>
        </div>
        <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold min-w-[52px] justify-center ${isUp ? "bg-emerald-100 text-emerald-700" : isDown ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
          {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : isDown ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
          {Math.abs(pct).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

export function PerformanceOverview({ report, todayData }: Props) {
  const { thisMonth, lastMonth, thisMonthName, lastMonthName } = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    let prevMonth = curMonth - 1;
    let prevYear = curYear;
    if (prevMonth < 1) { prevMonth = 12; prevYear--; }

    const thisMonthStats = { visits: 0, orders: 0, qty: 0, uniqueProducts: new Set<string>(), uniqueCustomers: new Set<string>(), activeDays: new Set<string>() };
    const lastMonthStats = { visits: 0, orders: 0, qty: 0, uniqueProducts: new Set<string>(), uniqueCustomers: new Set<string>(), activeDays: new Set<string>() };

    (report?.orders || []).forEach((order) => {
      const info = getOrderMonthYear(order);
      if (!info) return;
      const stats = (info.month === curMonth && info.year === curYear) ? thisMonthStats : (info.month === prevMonth && info.year === prevYear) ? lastMonthStats : null;
      if (!stats) return;
      stats.orders++;
      stats.qty += order.quantity;
      if (order.productId) stats.uniqueProducts.add(order.productId);
      else if (order.productName) stats.uniqueProducts.add(order.productName);
      if (order.customerId) stats.uniqueCustomers.add(order.customerId);
      else if (order.customerName) stats.uniqueCustomers.add(order.customerName);
      const dateStr = order.createdAt || order.date;
      const d = dateStr ? new Date(dateStr) : null;
      if (d && !isNaN(d.getTime())) stats.activeDays.add(d.toISOString().slice(0, 10));
    });

    (report?.visits || []).forEach((visit) => {
      const info = getVisitMonth(visit);
      if (!info) return;
      if (info.month === curMonth && info.year === curYear) thisMonthStats.visits++;
      else if (info.month === prevMonth && info.year === prevYear) lastMonthStats.visits++;
    });

    return {
      thisMonth: { visits: thisMonthStats.visits, orders: thisMonthStats.orders, qty: thisMonthStats.qty, products: thisMonthStats.uniqueProducts.size, customers: thisMonthStats.uniqueCustomers.size, days: thisMonthStats.activeDays.size || 1 },
      lastMonth: { visits: lastMonthStats.visits, orders: lastMonthStats.orders, qty: lastMonthStats.qty, products: lastMonthStats.uniqueProducts.size, customers: lastMonthStats.uniqueCustomers.size, days: lastMonthStats.activeDays.size || 1 },
      thisMonthName: SHORT_MONTH[curMonth - 1],
      lastMonthName: SHORT_MONTH[prevMonth - 1],
    };
  }, [report]);

  const todayVisits = todayData?.visits || 0;
  const todayOrders = todayData?.orders || 0;
  const todayQty = todayData?.qty || 0;
  const todayDistance = todayData?.distance || 0;

  if (!report) return null;

  return (
    <Card className="card-shadow border-0">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          Performance Overview
        </CardTitle>
        <p className="text-[10px] text-gray-400 font-medium">{thisMonthName} vs {lastMonthName}</p>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Today's Quick Stats */}
        {todayData && todayVisits > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 mb-3">
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wide mb-2">Today</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Visits", value: todayVisits, color: "blue" },
                { label: "Orders", value: todayOrders, color: "emerald" },
                { label: "Qty", value: Math.round(todayQty), color: "amber" },
                { label: "KM", value: todayDistance.toFixed(1), color: "violet" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-lg font-bold text-${s.color}-600`}>{s.value}</p>
                  <p className="text-[9px] text-gray-500 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Month Comparison */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-blue-500 font-bold uppercase">{thisMonthName}</p>
            <p className="text-xl font-bold text-blue-600">{thisMonth.visits}</p>
            <p className="text-[9px] text-gray-500">visits</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase">{lastMonthName}</p>
            <p className="text-xl font-bold text-gray-500">{lastMonth.visits}</p>
            <p className="text-[9px] text-gray-500">visits</p>
          </div>
        </div>

        <MetricRow label="Visits" current={thisMonth.visits} previous={lastMonth.visits} />
        <MetricRow label="Orders" current={thisMonth.orders} previous={lastMonth.orders} />
        <MetricRow label="Qty Sold" current={thisMonth.qty} previous={lastMonth.qty} />
        <MetricRow label="Avg Qty/Visit" current={thisMonth.visits > 0 ? thisMonth.qty / thisMonth.visits : 0} previous={lastMonth.visits > 0 ? lastMonth.qty / lastMonth.visits : 0} unit="decimal" />
        <MetricRow label="Conversion Rate" current={thisMonth.visits > 0 ? (thisMonth.orders / thisMonth.visits) * 100 : 0} previous={lastMonth.visits > 0 ? (lastMonth.orders / lastMonth.visits) * 100 : 0} unit="decimal" />
        <MetricRow label="Unique Products" current={thisMonth.products} previous={lastMonth.products} />
        <MetricRow label="Unique Customers" current={thisMonth.customers} previous={lastMonth.customers} />
        <MetricRow label="Active Days" current={thisMonth.days} previous={lastMonth.days} />
      </CardContent>
    </Card>
  );
}
