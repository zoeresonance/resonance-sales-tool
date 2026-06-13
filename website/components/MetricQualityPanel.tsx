"use client";

import { useState } from "react";
import type { PerformanceData, DailyMetric } from "@/lib/types";

interface MetricRow {
  label: string;
  group: string;
  data: DailyMetric[];
  format: "currency" | "percent" | "number";
}

function summarize(data: DailyMetric[], format: MetricRow["format"]) {
  if (data.length === 0) return { points: 0, total: null, allZero: true, hasZeros: false };
  const values = data.map((d) => d.value);
  const total = values.reduce((a, b) => a + b, 0);
  const allZero = values.every((v) => v === 0);
  const hasZeros = values.some((v) => v === 0);
  return { points: data.length, total, allZero, hasZeros };
}

function fmt(total: number | null, format: MetricRow["format"]): string {
  if (total === null) return "—";
  if (format === "currency") return `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (format === "percent") return `${(total / 1).toFixed(2)}%`;
  return total.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function StatusDot({ points, allZero, hasZeros }: { points: number; allZero: boolean; hasZeros: boolean }) {
  if (points === 0) return <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="No data" />;
  if (allZero) return <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="All values are zero" />;
  if (hasZeros) return <span className="inline-block w-2 h-2 rounded-full bg-amber-400" title="Some values are zero" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="OK" />;
}

export default function MetricQualityPanel({ performance }: { performance: PerformanceData | undefined }) {
  const [open, setOpen] = useState(false);

  const rows: MetricRow[] = performance ? [
    { label: "Spend",             group: "Ads",        data: performance.ads.spend,               format: "currency" },
    { label: "Impressions",       group: "Ads",        data: performance.ads.impressions,          format: "number"   },
    { label: "Clicks",            group: "Ads",        data: performance.ads.clicks,               format: "number"   },
    { label: "CTR",               group: "Ads",        data: performance.ads.ctr,                  format: "percent"  },
    { label: "CPM",               group: "Ads",        data: performance.ads.cpm,                  format: "currency" },
    { label: "Frequency",         group: "Ads",        data: performance.ads.frequency,            format: "number"   },
    { label: "FB Reach",          group: "FB Organic", data: performance.organic.fb.reach,         format: "number"   },
    { label: "FB Engagements",    group: "FB Organic", data: performance.organic.fb.engagements,   format: "number"   },
    { label: "IG Reach",          group: "IG Organic", data: performance.organic.ig.reach,         format: "number"   },
    { label: "IG New Followers",  group: "IG Organic", data: performance.organic.ig.followerCount, format: "number"   },
  ] : [];

  const groups = ["Ads", "FB Organic", "IG Organic"];

  const totalIssues = rows.filter((r) => {
    const s = summarize(r.data, r.format);
    return s.points === 0 || s.allZero;
  }).length;

  return (
    <div className="border border-[#2d2d2d] rounded-2xl bg-[#1e1e1e] shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-slate-300 hover:bg-[#252525] transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-slate-400">🔍</span>
          Meta Data Quality
          {totalIssues > 0 && (
            <span className="text-xs bg-red-950/40 text-red-400 font-semibold px-2 py-0.5 rounded-full border border-red-800">
              {totalIssues} issue{totalIssues > 1 ? "s" : ""}
            </span>
          )}
          {totalIssues === 0 && performance && (
            <span className="text-xs bg-green-950/40 text-green-400 font-semibold px-2 py-0.5 rounded-full border border-green-800">All OK</span>
          )}
          {!performance && (
            <span className="text-xs text-slate-500">loading…</span>
          )}
        </span>
        <span className="text-slate-500 text-xs">{open ? "▲ hide" : "▼ show"}</span>
      </button>

      {open && (
        <div className="border-t border-[#2d2d2d] px-5 py-4">
          {!performance ? (
            <p className="text-sm text-slate-400">Performance data not yet loaded.</p>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => {
                const groupRows = rows.filter((r) => r.group === group);
                return (
                  <div key={group}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{group}</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-[#2d2d2d]">
                          <th className="text-left font-medium pb-1.5 w-36">Metric</th>
                          <th className="text-right font-medium pb-1.5 w-20">Points</th>
                          <th className="text-right font-medium pb-1.5 w-28">Total / Sum</th>
                          <th className="text-right font-medium pb-1.5 w-24">Date range</th>
                          <th className="text-right font-medium pb-1.5 w-12">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#252525]">
                        {groupRows.map((row) => {
                          const s = summarize(row.data, row.format);
                          const first = row.data[0]?.date ?? "—";
                          const last = row.data[row.data.length - 1]?.date ?? "—";
                          const issue = s.points === 0 || s.allZero;
                          return (
                            <tr key={row.label} className={issue ? "bg-red-950/20" : ""}>
                              <td className={`py-1.5 font-medium ${issue ? "text-red-400" : "text-slate-300"}`}>
                                {row.label}
                              </td>
                              <td className={`py-1.5 text-right tabular-nums ${s.points === 0 ? "text-red-400 font-semibold" : "text-slate-400"}`}>
                                {s.points}
                              </td>
                              <td className={`py-1.5 text-right tabular-nums ${s.allZero ? "text-red-400 font-semibold" : "text-slate-400"}`}>
                                {s.points === 0 ? "—" : fmt(s.total, row.format)}
                              </td>
                              <td className="py-1.5 text-right text-slate-500">
                                {s.points === 0 ? "—" : `${first} → ${last}`}
                              </td>
                              <td className="py-1.5 text-right">
                                <StatusDot points={s.points} allZero={s.allZero} hasZeros={s.hasZeros} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              <div className="flex gap-4 text-xs text-slate-500 pt-1 border-t border-[#2d2d2d]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Has data</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Some zeros</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Empty or all-zero</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
