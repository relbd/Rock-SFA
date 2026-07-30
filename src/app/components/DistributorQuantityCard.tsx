"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "lucide-react";
import { type ReportData } from "@/services/api";

interface DistributorQuantityCardProps {
  report: ReportData | null;
}

export function DistributorQuantityCard({ report }: DistributorQuantityCardProps) {
  const currentMonthData = useMemo(() => {
    if (!report?.orders || report.orders.length === 0) return [];

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const distributorMap: Record<string, { name: string; qty: number; count: number }> = {};

    report.orders.forEach((order) => {
      if (order.orderMonth !== curMonth || order.orderYear !== curYear) return;

      const name = order.distributorName || "Unknown";
      if (!distributorMap[name]) {
        distributorMap[name] = { name, qty: 0, count: 0 };
      }
      distributorMap[name].qty += order.quantity;
      distributorMap[name].count += 1;
    });

    return Object.values(distributorMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [report?.orders]);

  if (currentMonthData.length === 0) {
    return (
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PieChart className="w-4 h-4 text-rose-500" />
            Distributor by Quantity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-gray-400 text-center py-4">No distributor data for current month</p>
        </CardContent>
      </Card>
    );
  }

  const maxQty = currentMonthData[0]?.qty || 1;

  return (
    <Card className="card-shadow border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PieChart className="w-4 h-4 text-rose-500" />
          Distributor by Quantity
        </CardTitle>
        <p className="text-[10px] text-gray-400 font-medium">Current month</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {currentMonthData.map((d, idx) => {
            const pct = Math.min((d.qty / maxQty) * 100, 100);
            return (
              <div key={idx}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700 font-semibold truncate">{d.name}</span>
                  <span className="text-gray-500 shrink-0 ml-2 font-medium">{d.qty} qty</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
