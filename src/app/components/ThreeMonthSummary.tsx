"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Filter } from "lucide-react";
import { type ReportData, type ReportOrder } from "@/services/api";

interface ThreeMonthSummaryProps {
  report: ReportData | null;
}

interface MonthData {
  year: string;
  month: string;
  label: string;
  fullLabel: string;
  visits: number;
  orders: number;
  qty: number;
  uniqueProducts: number;
  activeDays: number;
}

function getMonthDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getUniqueProductCount(orders: ReportOrder[], year: number, month: number): number {
  const ids = new Set<string>();
  orders.forEach((o) => {
    const d = getMonthDate(o.date || o.createdAt);
    if (d && d.getFullYear() === year && d.getMonth() === month) {
      if (o.productId) ids.add(o.productId);
      else if (o.productName) ids.add(o.productName);
    }
  });
  return ids.size;
}

export function ThreeMonthSummary({ report }: ThreeMonthSummaryProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const months = useMemo<MonthData[]>(() => {
    if (!report?.dailySummary || report.dailySummary.length === 0) return [];

    const monthMap: Record<string, MonthData> = {};

    report.dailySummary.forEach((d) => {
      const date = getMonthDate(d.date);
      if (!date) return;

      const year = date.getFullYear().toString();
      const monthNum = String(date.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${monthNum}`;
      const label = date.toLocaleDateString("en-US", { month: "short" });
      const fullLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      if (!monthMap[key]) {
        monthMap[key] = { year, month: monthNum, label, fullLabel, visits: 0, orders: 0, qty: 0, uniqueProducts: 0, activeDays: 0 };
      }
      monthMap[key].visits += d.visits;
      monthMap[key].orders += d.orders;
      monthMap[key].qty += d.qty;
      if (d.visits > 0) monthMap[key].activeDays += 1;
    });

    const sorted = Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a));

    sorted.forEach(([key, data]) => {
      const [y, m] = key.split("-");
      data.uniqueProducts = getUniqueProductCount(report.orders || [], parseInt(y), parseInt(m) - 1);
    });

    return sorted.map(([, v]) => v);
  }, [report?.dailySummary, report?.orders]);

  const displayMonths = useMemo(() => {
    if (selectedMonth === "all") return months.slice(0, 3);
    return months.filter((m) => `${m.year}-${m.month}` === selectedMonth);
  }, [months, selectedMonth]);

  if (!report || months.length === 0) {
    return (
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            3-Month Sales Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-gray-400 text-center py-4">No report data loaded. Tap refresh to retry.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            3-Month Sales Summary
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-gray-400" />
            <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v ?? "all")}>
              <SelectTrigger className="h-7 w-auto text-[10px] px-2 py-0 rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Last 3 Months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {m.fullLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayMonths.map((m) => (
          <div key={`${m.year}-${m.month}`} className="space-y-2.5 border-l-2 border-indigo-200 pl-3">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {m.year} → {m.label}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Total Visits", value: m.visits, bg: "blue" },
                { label: "Unique Products", value: m.uniqueProducts, bg: "emerald" },
                { label: "Total Qty Sold", value: m.qty, bg: "amber" },
                { label: "Active Days", value: m.activeDays, bg: "teal" },
              ].map((config) => (
                <div key={config.label} className={`bg-${config.bg}-50 p-3 rounded-xl border border-${config.bg}-100 shadow-sm`}>
                  <p className="text-[10px] text-gray-500 font-medium">{config.label}</p>
                  <p className={`text-lg font-bold text-${config.bg}-600`}>{config.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
