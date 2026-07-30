"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { type ReportData } from "@/services/api";

interface TopCustomersCardProps {
  report: ReportData | null;
}

export function TopCustomersCard({ report }: TopCustomersCardProps) {
  const currentMonthCustomers = useMemo(() => {
    if (!report?.orders || report.orders.length === 0) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const customerMap: Record<string, { name: string; qty: number; count: number }> = {};

    report.orders.forEach((order) => {
      const orderDate = new Date(order.date || order.createdAt);
      if (isNaN(orderDate.getTime())) return;
      if (orderDate.getMonth() !== currentMonth || orderDate.getFullYear() !== currentYear) return;

      if (!customerMap[order.customerName]) {
        customerMap[order.customerName] = { name: order.customerName, qty: 0, count: 0 };
      }
      customerMap[order.customerName].qty += order.quantity;
      customerMap[order.customerName].count += 1;
    });

    return Object.values(customerMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [report?.orders]);

  if (currentMonthCustomers.length === 0) {
    return (
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Top Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-gray-400 text-center py-4">No customer data for current month</p>
        </CardContent>
      </Card>
    );
  }

  const maxQty = currentMonthCustomers[0]?.qty || 1;

  return (
    <Card className="card-shadow border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          Top Customers
        </CardTitle>
        <p className="text-[10px] text-gray-400 font-medium">Current month</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {currentMonthCustomers.map((c, idx) => {
            const pct = Math.min((c.qty / maxQty) * 100, 100);
            return (
              <div key={idx}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700 font-semibold truncate">{c.name}</span>
                  <span className="text-gray-500 shrink-0 ml-2 font-medium">{c.qty} qty</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
