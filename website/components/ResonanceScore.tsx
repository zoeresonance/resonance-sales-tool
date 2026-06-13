"use client";

import type { ResonanceScoreResult } from "@/lib/types";

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade === "B") return "text-teal-400";
  if (grade === "C") return "text-yellow-400";
  if (grade === "D") return "text-orange-400";
  return "text-red-400";
}

function scoreBar(score: number) {
  const color =
    score >= 80 ? "bg-emerald-500" :
    score >= 65 ? "bg-teal-500" :
    score >= 50 ? "bg-yellow-500" :
    score >= 35 ? "bg-orange-500" :
    "bg-red-500";
  return (
    <div className="w-full bg-[#333] rounded-full h-1.5 mt-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

interface Props {
  result: ResonanceScoreResult;
  onReset: () => void;
}

export default function ResonanceScore({ result, onReset }: Props) {
  const gc = gradeColor(result.grade);

  return (
    <div className="space-y-6">
      {/* Score header */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-8 flex flex-col sm:flex-row items-center gap-6">
        {/* Ring */}
        <div className="relative shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#2d2d2d" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52"
              fill="none" stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(result.overallScore / 100) * 327} 327`}
              transform="rotate(-90 60 60)"
              className={gc}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${gc}`}>{result.overallScore}</span>
            <span className={`text-lg font-bold ${gc}`}>{result.grade}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-xl font-bold text-slate-100">Resonance Score</h2>
            {result.platformsAnalyzed.map((p) => (
              <span key={p} className="text-xs bg-brand-dark text-brand-300 px-2 py-0.5 rounded-full font-medium">{p}</span>
            ))}
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{result.summary}</p>
          <button
            onClick={onReset}
            className="mt-3 text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
          >
            ← Analyze another
          </button>
        </div>
      </div>

      {/* Dimensions */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-6">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Dimension Breakdown</h3>
        <div className="space-y-5">
          {result.dimensions.map((d) => (
            <div key={d.name}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-slate-200">{d.name}</span>
                <span className={`text-sm font-bold ${gradeColor(d.grade)}`}>{d.score} <span className="text-xs">{d.grade}</span></span>
              </div>
              {scoreBar(d.score)}
              <p className="text-xs text-slate-400 mt-1.5">{d.insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Gaps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-5">
          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-3">Strengths</h3>
          <ul className="space-y-2">
            {result.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-5">
          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3">Gaps</h3>
          <ul className="space-y-2">
            {result.gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-6">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Recommendations</h3>
        <div className="space-y-4">
          {result.recommendations.map((r, i) => {
            const badge =
              r.priority === "high" ? "bg-red-950/60 text-red-300 border-red-800" :
              r.priority === "medium" ? "bg-yellow-950/60 text-yellow-300 border-yellow-800" :
              "bg-slate-800 text-slate-400 border-slate-700";
            return (
              <div key={i} className="border border-[#2d2d2d] rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge} uppercase`}>{r.priority}</span>
                  <span className="text-sm font-semibold text-slate-200">{r.area}</span>
                </div>
                <p className="text-xs text-slate-400"><span className="text-slate-500">Now:</span> {r.current}</p>
                <p className="text-xs text-slate-300"><span className="text-brand-300 font-medium">Opportunity:</span> {r.suggestion}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
