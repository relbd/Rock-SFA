"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import { type ReportData, type ReportOrder } from "@/services/api";

interface TopProductsCardProps {
  report: ReportData | null;
}

function isCurrentMonth(order: ReportOrder): boolean {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  if (order.orderMonth && order.orderYear) {
    return order.orderMonth === curMonth && order.orderYear === curYear;
  }

  const dateStr = order.createdAt || order.date;
  if (!dateStr) return false;

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.getMonth() + 1 === curMonth && d.getFullYear() === curYear;
  }

  return false;
}

export function TopProductsCard({ report }: TopProductsCardProps) {
  const currentMonthProducts = useMemo(() => {
    if (!report?.orders || report.orders.length === 0) return [];

    const productMap: Record<string, { name: string; qty: number; count: number }> = {};

    report.orders.forEach((order) => {
      if (!isCurrentMonth(order)) return;

      const name = order.productName || "Unknown";
      if (!productMap[name]) {
        productMap[name] = { name, qty: 0, count: 0 };
      }
      productMap[name].qty += order.quantity;
      productMap[name].count += 1;
    });

    return Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [report?.orders]);

  if (currentMonthProducts.length === 0) {
    return (
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Top Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-gray-400 text-center py-4">No product data for current month</p>
        </CardContent>
      </Card>
    );
  }

  const maxQty = currentMonthProducts[0]?.qty || 1;

  return (
    <Card className="card-shadow border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          Top Products
        </CardTitle>
        <p className="text-[10px] text-gray-400 font-medium">Current month</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {currentMonthProducts.map((p, idx) => {
            const pct = Math.min((p.qty / maxQty) * 100, 100);
            return (
              <div key={idx}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700 font-semibold truncate">{p.name}</span>
                  <span className="text-gray-500 shrink-0 ml-2 font-medium">{p.qty} qty</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
