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
  fullLabel: string;
  totalQty: number;
  totalOrders: number;
  uniqueProducts: number;
  uniqueCustomers: number;
}

const MONTH_SHORT: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function parseOrderDate(order: { createdAt?: string; date?: string }): Date | null {
  if (order.createdAt) {
    const d = new Date(order.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (order.date) {
    const d = new Date(order.date);
    if (!isNaN(d.getTime())) return d;
    const m = order.date.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
    if (m && MONTH_SHORT[m[2]] !== undefined) {
      const parsed = new Date(parseInt(m[3]), MONTH_SHORT[m[2]], parseInt(m[1]));
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

export function ThreeMonthSummary({ report }: ThreeMonthSummaryProps) {
  const months = useMemo<MonthData[]>(() => {
    if (!report?.orders || report.orders.length === 0) return [];

    const monthMap: Record<string, MonthData> = {};

    report.orders.forEach((order) => {
      const date = parseOrderDate(order);
      if (!date) return;

      const year = date.getFullYear().toString();
      const monthNum = String(date.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${monthNum}`;

      if (!monthMap[key]) {
        const label = date.toLocaleDateString("en-US", { month: "short" });
        const fullLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        monthMap[key] = { year, month: monthNum, label, fullLabel, totalQty: 0, totalOrders: 0, uniqueProducts: 0, uniqueCustomers: 0 };
      }
      monthMap[key].totalQty += order.quantity;
      monthMap[key].totalOrders += 1;
    });

    Object.values(monthMap).forEach((data) => {
      const key = `${data.year}-${data.month}`;
      const productIds = new Set<string>();
      const customerIds = new Set<string>();
      report.orders.forEach((order) => {
        const date = parseOrderDate(order);
        if (!date) return;
        const y = date.getFullYear().toString();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        if (`${y}-${m}` === key) {
          if (order.productId) productIds.add(order.productId);
          else if (order.productName) productIds.add(order.productName);
          if (order.customerId) customerIds.add(order.customerId);
          else if (order.customerName) customerIds.add(order.customerName);
        }
      });
      data.uniqueProducts = productIds.size;
      data.uniqueCustomers = customerIds.size;
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3)
      .map(([, v]) => v);
  }, [report?.orders]);

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
      </CardHeader>
      <CardContent className="space-y-4">
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`} className="space-y-2.5 border-l-2 border-indigo-200 pl-3">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {m.fullLabel}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Total Orders", value: m.totalOrders, bg: "blue" },
                { label: "Quantity", value: m.totalQty, bg: "emerald" },
                { label: "Unique Products", value: m.uniqueProducts, bg: "amber" },
                { label: "Unique Customers", value: m.uniqueCustomers, bg: "violet" },
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
