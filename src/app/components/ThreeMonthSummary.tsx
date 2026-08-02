"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ShoppingCart, Package, Users, Droplets } from "lucide-react";
import { type ReportData } from "@/services/api";
import { getOrderMonthYear } from "./orderUtils";

interface ThreeMonthSummaryProps {
  report: ReportData | null;
}

interface MonthData {
  key: string;
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

    const monthMap: Record<string, MonthData> = {};
    const invoiceSetPerMonth: Record<string, Set<string>> = {};

    report.orders.forEach((order) => {
      const info = getOrderMonthYear(order);
      if (!info) return;

      const key = `${info.year}-${String(info.month).padStart(2, "0")}`;

      if (!monthMap[key]) {
        monthMap[key] = { key, fullLabel: `${MONTH_NAMES[info.month - 1]} ${info.year}`, totalQty: 0, totalOrders: 0, uniqueProducts: 0, uniqueCustomers: 0 };
        invoiceSetPerMonth[key] = new Set();
      }
      monthMap[key].totalQty += order.quantity;
      if (order.invoiceId) invoiceSetPerMonth[key].add(order.invoiceId);
    });

    Object.values(monthMap).forEach((data) => {
      data.totalOrders = invoiceSetPerMonth[data.key]?.size || 0;
      const productIds = new Set<string>();
      const customerIds = new Set<string>();
      report.orders.forEach((order) => {
        const info = getOrderMonthYear(order);
        if (!info) return;
        if (`${info.year}-${String(info.month).padStart(2, "0")}` === data.key) {
          if (order.productId) productIds.add(order.productId);
          else if (order.productName) productIds.add(order.productName);
          if (order.customerId) customerIds.add(order.customerId);
          else if (order.customerName) customerIds.add(order.customerName);
        }
      });
      data.uniqueProducts = productIds.size;
      data.uniqueCustomers = customerIds.size;
    });

    return Object.values(monthMap)
      .sort((a, b) => b.key.localeCompare(a.key))
      .slice(0, 3);
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

  const isLatest = (idx: number) => idx === 0;
  const isPrev = (idx: number) => idx === 1;

  return (
    <Card className="card-shadow border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          3-Month Sales Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {months.map((m, idx) => (
          <div key={m.key} className={`rounded-xl p-3 border ${isLatest(idx) ? "bg-blue-50 border-blue-200" : isPrev(idx) ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100"}`}>
            <div className="flex items-center justify-between mb-2.5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${isLatest(idx) ? "bg-blue-600 text-white" : isPrev(idx) ? "bg-gray-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                {m.fullLabel}
              </span>
              {isLatest(idx) && <span className="text-[9px] text-blue-500 font-bold">LATEST</span>}
              {isPrev(idx) && <span className="text-[9px] text-gray-400 font-bold">PREV</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <ShoppingCart className="w-3.5 h-3.5 text-blue-500 mx-auto mb-0.5" />
                <p className="text-base font-bold text-blue-600">{m.totalOrders}</p>
                <p className="text-[9px] text-gray-500 font-medium">Orders</p>
              </div>
              <div className="text-center">
                <Droplets className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-0.5" />
                <p className="text-base font-bold text-emerald-600">{Math.round(m.totalQty)}</p>
                <p className="text-[9px] text-gray-500 font-medium">Qty (L)</p>
              </div>
              <div className="text-center">
                <Package className="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
                <p className="text-base font-bold text-amber-600">{m.uniqueProducts}</p>
                <p className="text-[9px] text-gray-500 font-medium">Products</p>
              </div>
              <div className="text-center">
                <Users className="w-3.5 h-3.5 text-violet-500 mx-auto mb-0.5" />
                <p className="text-base font-bold text-violet-600">{m.uniqueCustomers}</p>
                <p className="text-[9px] text-gray-500 font-medium">Customers</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
