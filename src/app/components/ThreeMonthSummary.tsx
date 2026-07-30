"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { type ReportData } from "@/services/api";

interface ThreeMonthSummaryProps {
  report: ReportData | null;
}

interface MonthData {
  year: number;
  month: number;
  fullLabel: string;
  totalQty: number;
  totalOrders: number;
  uniqueProducts: number;
  uniqueCustomers: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ThreeMonthSummary({ report }: ThreeMonthSummaryProps) {
  const months = useMemo<MonthData[]>(() => {
    if (!report?.orders || report.orders.length === 0) return [];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthMap: Record<string, MonthData> = {};

    report.orders.forEach((order) => {
      const m = order.orderMonth || 0;
      const y = order.orderYear || 0;
      if (!m || !y) return;

      const key = `${y}-${String(m).padStart(2, "0")}`;

      if (!monthMap[key]) {
        const fullLabel = `${MONTH_NAMES[m - 1]} ${y}`;
        monthMap[key] = { year: y, month: m, fullLabel, totalQty: 0, totalOrders: 0, uniqueProducts: 0, uniqueCustomers: 0 };
      }
      monthMap[key].totalQty += order.quantity;
      monthMap[key].totalOrders += 1;
    });

    Object.values(monthMap).forEach((data) => {
      const key = `${data.year}-${String(data.month).padStart(2, "0")}`;
      const productIds = new Set<string>();
      const customerIds = new Set<string>();
      report.orders.forEach((order) => {
        const m = order.orderMonth || 0;
        const y = order.orderYear || 0;
        if (!m || !y) return;
        if (`${y}-${String(m).padStart(2, "0")}` === key) {
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
