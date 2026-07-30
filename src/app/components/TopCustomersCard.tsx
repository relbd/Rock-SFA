"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { type ReportData } from "@/services/api";

interface TopCustomersCardProps {
  report: ReportData | null;
}

const MONTH_SHORT: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function parseDate(order: { createdAt?: string; date?: string }): Date | null {
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

function isCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function TopCustomersCard({ report }: TopCustomersCardProps) {
  const currentMonthCustomers = useMemo(() => {
    if (!report?.orders || report.orders.length === 0) return [];

    const customerMap: Record<string, { name: string; qty: number; count: number }> = {};

    report.orders.forEach((order) => {
      const date = parseDate(order);
      if (!date || !isCurrentMonth(date)) return;

      const name = order.customerName || "Unknown";
      if (!customerMap[name]) {
        customerMap[name] = { name, qty: 0, count: 0 };
      }
      customerMap[name].qty += order.quantity;
      customerMap[name].count += 1;
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
            <Users className="w-4 h-4 text-violet-500" />
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
          <Users className="w-4 h-4 text-violet-500" />
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
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
