"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { type ReportData } from "@/services/api";

interface ThreeMonthSummaryProps {
  report: ReportData | null;
}

interface MonthData {
  year: string;
  month: string;
  label: string;
  visits: number;
  orders: number;
  qty: number;
  activeDays: number;
}

const METRICS = [
  { key: "visits" as const, label: "Total Visits", bg: "blue" },
  { key: "orders" as const, label: "Total Orders", bg: "emerald" },
  { key: "qty" as const, label: "Total Qty Sold", bg: "amber" },
  { key: "activeDays" as const, label: "Active Days", bg: "teal" },
];

export function ThreeMonthSummary({ report }: ThreeMonthSummaryProps) {
  const months = useMemo<MonthData[]>(() => {
    if (!report?.dailySummary || report.dailySummary.length === 0) return [];

    const monthMap: Record<string, MonthData> = {};

    report.dailySummary.forEach((d) => {
      const date = new Date(d.date);
      if (isNaN(date.getTime())) return;
      const year = date.getFullYear().toString();
      const monthNum = String(date.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${monthNum}`;
      const label = date.toLocaleDateString("en-US", { month: "short" });

      if (!monthMap[key]) {
        monthMap[key] = { year, month: monthNum, label, visits: 0, orders: 0, qty: 0, activeDays: 0 };
      }
      monthMap[key].visits += d.visits;
      monthMap[key].orders += d.orders;
      monthMap[key].qty += d.qty;
      if (d.visits > 0) monthMap[key].activeDays += 1;
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3)
      .map(([, v]) => v);
  }, [report?.dailySummary]);

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
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          3-Month Sales Summary
        </CardTitle>
        <p className="text-[10px] text-gray-400 font-medium">
          {report.startDate} → {report.endDate}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`} className="space-y-2.5 border-l-2 border-indigo-200 pl-3">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {m.year} → {m.label}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {METRICS.map((config) => (
                <div key={config.key} className={`bg-${config.bg}-50 p-3 rounded-xl border border-${config.bg}-100 shadow-sm`}>
                  <p className="text-[10px] text-gray-500 font-medium">{config.label}</p>
                  <p className={`text-lg font-bold text-${config.bg}-600`}>{m[config.key]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
