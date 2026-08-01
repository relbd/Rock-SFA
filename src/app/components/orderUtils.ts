import { type ReportOrder } from "@/services/api";

const SHORT_MONTH: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

export function getOrderMonthYear(order: ReportOrder): { month: number; year: number } | null {
  const m = order.orderMonth;
  const y = order.orderYear;
  if (typeof m === "number" && typeof y === "number" && m >= 1 && m <= 12 && y >= 2020) {
    return { month: m, year: y };
  }

  const dateStr = order.createdAt || order.date;
  if (!dateStr) return null;

  const iso = dateStr.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (iso) return { month: parseInt(iso[2]), year: parseInt(iso[1]) };

  const dash = dateStr.match(/(\d{1,2})-(\w{3})-(\d{4})/);
  if (dash && SHORT_MONTH[dash[2]]) return { month: SHORT_MONTH[dash[2]], year: parseInt(dash[3]) };

  const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return { month: parseInt(slash[1]), year: parseInt(slash[3]) };

  return null;
}

export function isCurrentMonth(order: ReportOrder): boolean {
  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();
  const info = getOrderMonthYear(order);
  return info !== null && info.month === cm && info.year === cy;
}
