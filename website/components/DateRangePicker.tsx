"use client";

import { useState, useEffect } from "react";

export interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type Preset = "7d" | "14d" | "30d" | "90d" | "custom";

function fmtDate(d: Date): string {
  // Use local date parts so the selected window matches what the user sees on
  // their calendar, not the UTC date (which can be a day off near midnight).
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function presetToRange(preset: Exclude<Preset, "custom">): DateRange {
  const days = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 }[preset];
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return { since: fmtDate(since), until: fmtDate(until) };
}

export function defaultDateRange(): DateRange {
  return presetToRange("30d");
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [preset, setPreset] = useState<Preset>("30d");

  // Detect when the value matches a preset (e.g. on first load)
  useEffect(() => {
    const presets: Exclude<Preset, "custom">[] = ["7d", "14d", "30d", "90d"];
    for (const p of presets) {
      const r = presetToRange(p);
      if (r.since === value.since && r.until === value.until) {
        setPreset(p);
        return;
      }
    }
    setPreset("custom");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") onChange(presetToRange(p));
  }

  const days =
    Math.round((new Date(value.until).getTime() - new Date(value.since).getTime()) / 86400000) + 1;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-200">Date Range</label>
      <div className="flex flex-wrap gap-1 bg-[#252525] p-1 rounded-xl w-fit">
        {([
          ["7d", "7 days"],
          ["14d", "14 days"],
          ["30d", "30 days"],
          ["90d", "90 days"],
          ["custom", "Custom"],
        ] as [Preset, string][]).map(([p, label]) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePreset(p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              preset === p
                ? "bg-[#1e1e1e] text-slate-100 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="date"
            value={value.since}
            max={value.until}
            onChange={(e) => onChange({ ...value, since: e.target.value })}
            className="text-sm border border-[#2d2d2d] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-[#2a2a2a] text-slate-100"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            value={value.until}
            min={value.since}
            max={fmtDate(new Date())}
            onChange={(e) => onChange({ ...value, until: e.target.value })}
            className="text-sm border border-[#2d2d2d] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-[#2a2a2a] text-slate-100"
          />
        </div>
      )}

      <p className="text-xs text-slate-400">
        Analyzing {value.since} → {value.until} ({days} day{days === 1 ? "" : "s"})
      </p>
      <p className="text-xs text-yellow-300/80 bg-yellow-950/30 border border-yellow-800/50 rounded-lg px-2 py-1.5">
        Note: Instagram audience demographics (age, gender, location) are always{" "}
        <strong>lifetime</strong> — Meta&apos;s API doesn&apos;t allow custom date ranges for that
        metric. All other metrics respect the selected range.
      </p>
    </div>
  );
}
