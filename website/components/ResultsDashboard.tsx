"use client";

import { useRef } from "react";
import type { AnalysisResult, AuditCheck, QuickWin, PerformanceData } from "@/lib/types";
import PerformanceChart from "@/components/PerformanceChart";

function printSection(ref: React.RefObject<HTMLDivElement | null>) {
  const el = ref.current;
  if (!el) return;
  el.classList.add("print-region");
  document.body.classList.add("printing");
  window.addEventListener("afterprint", () => {
    el.classList.remove("print-region");
    document.body.classList.remove("printing");
  }, { once: true });
  window.print();
}

const CIRCUMFERENCE = 2 * Math.PI * 45; // r=45

function gradeColor(grade: string) {
  if (grade === "A") return "#16a34a";
  if (grade === "B") return "#3a7878";
  if (grade === "C") return "#d97706";
  if (grade === "D") return "#ea580c";
  return "#dc2626";
}

function scoreColor(score: number) {
  if (score >= 75) return "#16a34a";
  if (score >= 60) return "#3a7878";
  if (score >= 45) return "#d97706";
  return "#dc2626";
}

function resultBadge(result: string) {
  if (result === "PASS")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/50 text-green-300">
        ✓ PASS
      </span>
    );
  if (result === "WARNING")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-900/50 text-yellow-300">
        ⚠ WARN
      </span>
    );
  if (result === "FAIL")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900/50 text-red-300">
        ✗ FAIL
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#2a2a2a] text-slate-300">
      N/A
    </span>
  );
}

function impactBadge(impact: string) {
  if (impact === "HIGH")
    return <span className="text-xs font-bold text-red-600 uppercase">High</span>;
  if (impact === "MEDIUM")
    return <span className="text-xs font-bold text-yellow-600 uppercase">Medium</span>;
  return <span className="text-xs font-bold text-slate-500 uppercase">Low</span>;
}

function severityDot(severity: string) {
  const cls =
    severity === "Critical"
      ? "bg-red-500"
      : severity === "High"
      ? "bg-orange-400"
      : severity === "Medium"
      ? "bg-yellow-400"
      : "bg-slate-300";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} flex-shrink-0`} />;
}

function HealthRing({ score, grade }: { score: number; grade: string }) {
  const color = gradeColor(grade);
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="score-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-sm text-slate-400">/ 100</span>
        </div>
      </div>
      <div
        className="mt-2 text-2xl font-bold px-4 py-1 rounded-full"
        style={{ color, backgroundColor: `${color}15` }}
      >
        Grade {grade}
      </div>
    </div>
  );
}

function CategoryBar({
  label,
  score,
  weight,
  checksPass,
  checksTotal,
}: {
  label: string;
  score: number;
  weight: number;
  checksPass: number;
  checksTotal: number;
}) {
  const color = scoreColor(score);
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {checksPass}/{checksTotal} checks
          </span>
          <span className="text-sm font-bold" style={{ color }}>
            {score}/100
          </span>
          <span className="text-xs text-slate-400">({weight}%)</span>
        </div>
      </div>
      <div className="h-2.5 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function QuickWinCard({ win }: { win: QuickWin }) {
  return (
    <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-slate-400 bg-[#2a2a2a] px-1.5 py-0.5 rounded">
          {win.checkId}
        </span>
        {impactBadge(win.impact)}
      </div>
      <p className="font-semibold text-slate-100 text-sm mb-1">{win.checkName}</p>
      <p className="text-slate-300 text-sm mb-3">{win.action}</p>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>⏱ {win.timeEstimate}</span>
        <span className="text-green-400 font-medium">{win.potentialGain}</span>
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: AuditCheck }) {
  return (
    <tr className="border-b border-[#252525] hover:bg-[#252525] transition-colors">
      <td className="py-3 px-3 text-xs font-mono text-slate-400 whitespace-nowrap">
        {check.id}
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          {severityDot(check.severity)}
          <span className="text-sm text-slate-200">{check.name}</span>
        </div>
      </td>
      <td className="py-3 px-3 text-xs text-slate-400 whitespace-nowrap hidden md:table-cell">
        {check.category}
      </td>
      <td className="py-3 px-3 whitespace-nowrap">{resultBadge(check.result)}</td>
      <td className="py-3 px-3 text-sm text-slate-300 hidden lg:table-cell max-w-xs">
        {check.finding}
      </td>
      <td className="py-3 px-3 text-sm text-brand-300 hidden xl:table-cell max-w-xs">
        {check.recommendation}
      </td>
    </tr>
  );
}

interface Props {
  result: AnalysisResult;
  onReset: () => void;
  performance?: PerformanceData;
}

export default function ResultsDashboard({ result, onReset, performance }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const cats = result.categories;
  const fails = result.checks.filter((c) => c.result === "FAIL");
  const warnings = result.checks.filter((c) => c.result === "WARNING");
  const passes = result.checks.filter((c) => c.result === "PASS");

  return (
    <div className="space-y-8">
      {/* PDF button */}
      <div className="flex justify-end">
        <button
          onClick={() => printSection(printRef)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-300 border border-[#2d2d2d] rounded-xl bg-[#1e1e1e] hover:border-brand-300 hover:text-brand-300 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M3 7h18" />
          </svg>
          Download PDF
        </button>
      </div>

      <div ref={printRef} className="space-y-8">

      {/* Summary banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <HealthRing score={result.healthScore} grade={result.grade} />

          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Meta Ads Health Score
            </h2>
            <p className="text-slate-600 mb-4 leading-relaxed">{result.summary}</p>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-green-50 text-green-800 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                {passes.length} passed
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-yellow-50 text-yellow-800 font-medium">
                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                {warnings.length} warnings
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-red-50 text-red-800 font-medium">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                {fails.length} failed
              </span>
            </div>

            {/* Category breakdown */}
            <div className="space-y-3">
              <CategoryBar
                label="Pixel / CAPI Health"
                score={cats.pixelCapi.score}
                weight={cats.pixelCapi.weight}
                checksPass={cats.pixelCapi.checksPass}
                checksTotal={cats.pixelCapi.checksTotal}
              />
              <CategoryBar
                label="Creative (Diversity & Fatigue)"
                score={cats.creative.score}
                weight={cats.creative.weight}
                checksPass={cats.creative.checksPass}
                checksTotal={cats.creative.checksTotal}
              />
              <CategoryBar
                label="Account Structure"
                score={cats.accountStructure.score}
                weight={cats.accountStructure.weight}
                checksPass={cats.accountStructure.checksPass}
                checksTotal={cats.accountStructure.checksTotal}
              />
              <CategoryBar
                label="Audience & Targeting"
                score={cats.audience.score}
                weight={cats.audience.weight}
                checksPass={cats.audience.checksPass}
                checksTotal={cats.audience.checksTotal}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Creative fatigue alerts */}
      {result.creativeFatigueAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
            🚨 Creative Fatigue Alerts
          </h3>
          <ul className="space-y-1">
            {result.creativeFatigueAlerts.map((alert, i) => (
              <li key={i} className="text-sm text-red-700">
                • {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* EMQ status */}
      {result.emqStatus !== "unknown" && (
        <div
          className={`rounded-xl p-4 border ${
            result.emqStatus === "excellent"
              ? "bg-green-50 border-green-200"
              : result.emqStatus === "good"
              ? "bg-brand-50 border-brand-200"
              : result.emqStatus === "fair"
              ? "bg-yellow-50 border-yellow-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <h3
            className={`font-semibold mb-1 ${
              result.emqStatus === "excellent"
                ? "text-green-800"
                : result.emqStatus === "good"
                ? "text-brand-700"
                : result.emqStatus === "fair"
                ? "text-yellow-800"
                : "text-red-800"
            }`}
          >
            📡 Event Match Quality:{" "}
            {result.emqStatus.charAt(0).toUpperCase() + result.emqStatus.slice(1)}
          </h3>
          <p
            className={`text-sm ${
              result.emqStatus === "excellent"
                ? "text-green-700"
                : result.emqStatus === "good"
                ? "text-brand-600"
                : result.emqStatus === "fair"
                ? "text-yellow-700"
                : "text-red-700"
            }`}
          >
            {result.emqRecommendations}
          </p>
        </div>
      )}

      {/* Ads Performance Chart */}
      {performance && (
        <PerformanceChart
          title="Ad Performance"
          metrics={[
            { key: "spend",       label: "Spend",       description: "Total ad spend for the period.",                                          data: performance.ads.spend,       format: "currency", color: "#3a7878" },
            { key: "ctr",         label: "CTR",         description: "Click-through rate — % of impressions that resulted in a click.",          data: performance.ads.ctr,         format: "percent",  color: "#16a34a" },
            { key: "cpm",         label: "CPM",         description: "Cost per 1,000 impressions.",                                             data: performance.ads.cpm,         format: "currency", color: "#d97706" },
            { key: "impressions", label: "Impressions", description: "Total number of times your ads were shown.",                              data: performance.ads.impressions, format: "number",   color: "#7c3aed" },
            { key: "frequency",   label: "Frequency",   description: "Average number of times each person saw your ads.",                       data: performance.ads.frequency,   format: "number",   color: "#db2777" },
          ]}
        />
      )}

      {/* Quick Wins */}
      {result.quickWins.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            ⚡ Quick Wins
          </h2>
          <p className="text-slate-500 text-sm mb-4">
            Highest-impact fixes sorted by priority — implement these first.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.quickWins.map((win) => (
              <QuickWinCard key={win.checkId} win={win} />
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          💡 AI Insights & Recommendations
        </h2>
        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
          {result.insights}
        </div>
        {result.organicInsights && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-2">
              📱 Organic Post Insights
            </h3>
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {result.organicInsights}
            </div>
          </div>
        )}
      </div>

      {/* Full checks table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            📋 Full Audit Results
          </h2>
          <span className="text-sm text-slate-500">
            {result.checks.length} checks evaluated
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="py-2.5 px-3 w-16">ID</th>
                <th className="py-2.5 px-3">Check</th>
                <th className="py-2.5 px-3 hidden md:table-cell">Category</th>
                <th className="py-2.5 px-3 w-20">Result</th>
                <th className="py-2.5 px-3 hidden lg:table-cell">Finding</th>
                <th className="py-2.5 px-3 hidden xl:table-cell">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {result.checks.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </div>{/* end print-region wrapper */}

      {/* Reset button */}
      <div className="flex justify-center pb-8">
        <button
          onClick={onReset}
          className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:border-brand-300 hover:text-brand-600 transition-colors text-sm"
        >
          ← Run Another Analysis
        </button>
      </div>
    </div>
  );
}
