import { type ReportOrder } from "@/services/api";

export function getOrderMonthYear(order: ReportOrder): { month: number; year: number } | null {
  const m = order.orderMonth;
  const y = order.orderYear;
  if (typeof m === "number" && typeof y === "number" && m >= 1 && m <= 12 && y >= 2020) {
    return { month: m, year: y };
  }
  return null;
}

export function isCurrentMonth(order: ReportOrder): boolean {
  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();
  const info = getOrderMonthYear(order);
  return info !== null && info.month === cm && info.year === cy;
}