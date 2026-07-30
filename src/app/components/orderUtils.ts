import { type ReportOrder } from "@/services/api";

const SHORT_MONTH: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

export function getOrderMonthYear(order: ReportOrder): { month: number; year: number } | null {
  if (order.orderMonth && order.orderYear) {
    return { month: order.orderMonth, year: order.orderYear };
  }

  const dateStr = order.createdAt || order.date;
  if (!dateStr) return null;

  // 1) ISO: 2026-07-15T...
  const m = dateStr.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (m) return { month: parseInt(m[2]), year: parseInt(m[1]) };

  // 2) dd-MMM-yyyy: 15-Jul-2026
  const m2 = dateStr.match(/(\d{1,2})-(\w{3})-(\d{4})/);
  if (m2 && SHORT_MONTH[m2[2]]) {
    return { month: SHORT_MONTH[m2[2]], year: parseInt(m2[3]) };
  }

  // 3) M/D/YYYY or M/D/YYYY HH:mm:ss: 1/3/2026 23:01:09
  const m3 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m3) return { month: parseInt(m3[1]), year: parseInt(m3[3]) };

  return null;
}

export function isCurrentMonth(order: ReportOrder): boolean {
  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();
  const info = getOrderMonthYear(order);
  return info !== null && info.month === cm && info.year === cy;
}
