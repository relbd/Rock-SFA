"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { type ReportData } from "@/services/api";

interface AttendanceHistoryCardProps {
  report: ReportData | null;
}

function formatTime(ts: string): string {
  if (!ts) return "";
  if (/^\d{1,2}:\d{2}\s?(AM|PM|am|pm)$/i.test(ts.trim())) return ts.trim();
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) {
      const match = ts.match(/(\d{1,2}:\d{2}:\d{2})/);
      if (match) {
        const parts = match[1].split(":");
        let h = parseInt(parts[0]);
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return h + ":" + parts[1] + " " + ampm;
      }
      return ts;
    }
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return ts;
  }
}

export function AttendanceHistoryCard({ report }: AttendanceHistoryCardProps) {
  if (!report?.attendance || report.attendance.length === 0) {
    return (
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-gray-400 text-center py-4">No attendance history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          Attendance History
        </CardTitle>
        <p className="text-[10px] text-gray-400 font-medium">{report.summary.totalClockIns} clock-ins in range</p>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 overflow-auto space-y-2 pr-1">
          {report.attendance.slice().reverse().map((att, idx) => {
            const isClockIn = att.type.toLowerCase().includes("in");
            return (
              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${isClockIn ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="text-xs font-semibold text-gray-700">{att.type}</span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-gray-600">{formatTime(att.timestamp)}</p>
                  <p className="text-[10px] text-gray-400">{att.date}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
