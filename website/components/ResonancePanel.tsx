"use client";

import { useState, useRef } from "react";
import type { ResonanceResult, ResonanceScoreResult, ResonanceRecommendation, PerformanceData } from "@/lib/types";
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

interface Props {
  result: ResonanceResult;
  clientName: string;
  performance?: PerformanceData;
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-400 bg-green-950/40 border-green-700",
  B: "text-brand-300 bg-[#0d2020] border-brand-600",
  C: "text-yellow-400 bg-yellow-950/40 border-yellow-700",
  D: "text-orange-400 bg-orange-950/40 border-orange-700",
  F: "text-red-400 bg-red-950/40 border-red-700",
};

const IMPACT_COLORS: Record<string, string> = {
  HIGH: "bg-red-950/40 text-red-400",
  MEDIUM: "bg-yellow-950/40 text-yellow-400",
  LOW: "bg-[#2a2a2a] text-slate-400",
};

const TYPE_LABELS: Record<string, string> = {
  ad: "Ad",
  post: "Post",
  audience: "Audience",
  creative: "Creative",
  messaging: "Messaging",
};

const ADS_DIMENSION_LABELS: Record<string, string> = {
  creativeResonance: "Creative Resonance",
  messagingAlignment: "Messaging Alignment",
  audienceTargeting: "Audience Targeting",
  conversionFit: "Conversion Fit",
};

const ORGANIC_DIMENSION_LABELS: Record<string, string> = {
  audienceReception: "Audience Reception",
  contentPerformance: "Content Performance",
  messagingAlignment: "Messaging Alignment",
};

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "text-green-400" : score >= 55 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-2xl font-bold ${color}`}>{score}</div>
      <div className="text-xs text-slate-400 text-center">{label}</div>
    </div>
  );
}

function RecommendationCard({ rec, index }: { rec: ResonanceRecommendation; index: number }) {
  return (
    <div className="border border-[#2d2d2d] rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">#{index + 1}</span>
          <span className="text-xs bg-[#2a2a2a] text-slate-300 font-medium px-2 py-0.5 rounded-full">
            {TYPE_LABELS[rec.type] ?? rec.type}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${IMPACT_COLORS[rec.impact]}`}>
            {rec.impact}
          </span>
        </div>
      </div>
      <div className="text-sm font-semibold text-slate-100">{rec.target}</div>
      {rec.currentState && (
        <div className="text-xs text-slate-400 bg-[#252525] rounded-lg px-3 py-2">
          <span className="font-medium text-slate-300">Currently: </span>{rec.currentState}
        </div>
      )}
      <div className="text-xs text-brand-300 bg-[#0d2020] rounded-lg px-3 py-2">
        <span className="font-medium">Suggestion: </span>{rec.suggestion}
      </div>
      <div className="text-xs text-slate-400">{rec.reasoning}</div>
    </div>
  );
}

function ScorePanel({
  data,
  dimensionLabels,
  icon,
  label,
  accentColor,
}: {
  data: ResonanceScoreResult;
  dimensionLabels: Record<string, string>;
  icon: string;
  label: string;
  accentColor: string;
}) {
  const gradeClass = GRADE_COLORS[data.grade] ?? GRADE_COLORS.C;

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className={`bg-[#1e1e1e] rounded-2xl border-2 ${accentColor} shadow-sm p-6`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{icon}</span>
              <h3 className="text-base font-bold text-white">{label}</h3>
            </div>
            <p className="text-sm text-slate-300 max-w-xl">{data.summary}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">{data.score}</div>
              <div className="text-xs text-slate-400 mt-0.5">/ 100</div>
            </div>
            <div className={`text-3xl font-bold px-4 py-2 rounded-xl border-2 ${gradeClass}`}>
              {data.grade}
            </div>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm p-6">
        <h4 className="font-semibold text-slate-100 mb-4">Score Breakdown</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {Object.entries(data.dimensions).map(([key, dim]) => (
            <ScoreRing key={key} score={dim.score} label={dimensionLabels[key] ?? key} />
          ))}
        </div>
        <div className="space-y-3">
          {Object.entries(data.dimensions).map(([key, dim]) => (
            <div key={key} className="flex gap-3 text-sm">
              <span className="font-medium text-slate-200 w-48 shrink-0">
                {dimensionLabels[key] ?? key}
              </span>
              <span className="text-slate-400">{dim.finding}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Persona Fit */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm p-6">
        <h4 className="font-semibold text-slate-100 mb-3">
          Persona Fit —{" "}
          <span className="text-brand-300">{data.personaFit.primaryPersonaName}</span>
          <span className="ml-2 text-sm font-normal text-slate-400">
            Match: {data.personaFit.matchScore}/100
          </span>
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-green-400 mb-2">✓ Strengths</div>
            <ul className="space-y-1">
              {data.personaFit.strengths.map((s, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-green-500 shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold text-red-400 mb-2">✗ Gaps</div>
            <ul className="space-y-1">
              {data.personaFit.gaps.map((g, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-red-400 shrink-0">•</span>{g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Performers */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm p-6">
          <h4 className="font-semibold text-slate-100 mb-3">Top Performers</h4>
          <div className="space-y-3">
            {data.topPerformers.map((p, i) => (
              <div key={i} className="text-sm border-l-2 border-green-500 pl-3">
                <div className="text-xs text-slate-500 mb-0.5 uppercase">{p.type.replace("_", " ")} · {p.metric}</div>
                <div className="text-slate-200 font-medium">"{p.identifier}"</div>
                <div className="text-slate-400 text-xs mt-0.5">{p.whyItLands}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm p-6">
          <h4 className="font-semibold text-slate-100 mb-3">Underperformers</h4>
          <div className="space-y-3">
            {data.bottomPerformers.map((p, i) => (
              <div key={i} className="text-sm border-l-2 border-red-500 pl-3">
                <div className="text-xs text-slate-500 mb-0.5 uppercase">{p.type.replace("_", " ")} · {p.metric}</div>
                <div className="text-slate-200 font-medium">"{p.identifier}"</div>
                <div className="text-slate-400 text-xs mt-0.5">{p.whyItMisses}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm p-6">
        <h4 className="font-semibold text-slate-100 mb-4">
          Recommendations
          <span className="ml-2 text-sm font-normal text-slate-500">
            {data.recommendations.length} actions
          </span>
        </h4>
        <div className="space-y-3">
          {data.recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResonancePanel({ result, clientName, performance }: Props) {
  const [active, setActive] = useState<"ads" | "organic">("ads");
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
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

      <div ref={printRef} className="space-y-6">

      {/* Toggle header */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🎯</span>
          <h2 className="text-base font-bold text-white">Resonance Score</h2>
          <span className="text-xs text-slate-400 bg-[#2a2a2a] px-2 py-0.5 rounded-full">{clientName}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["ads", "organic"] as const).map((tab) => {
            const data = result[tab];
            const isActive = active === tab;
            const gradeClass = GRADE_COLORS[data.grade] ?? GRADE_COLORS.C;
            return (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  isActive ? "border-brand-300 bg-[#0d2020]" : "border-[#2d2d2d] bg-[#252525] hover:border-[#444]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300">
                    {tab === "ads" ? "📣 Ads" : "🌱 Organic"}
                  </span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${gradeClass}`}>
                    {data.grade}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {data.score}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {tab === "ads" ? "Paid campaigns" : "FB & IG posts"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active panel */}
      {active === "ads" ? (
        <>
          <ScorePanel
            data={result.ads}
            dimensionLabels={ADS_DIMENSION_LABELS}
            icon="📣"
            label="Ads Resonance"
            accentColor="border-brand-200"
          />
          {performance && (
            <div className="space-y-4">
              <PerformanceChart
                title="Ad Performance"
                metrics={[
                  { key: "spend",       label: "Spend",       description: "Total ad spend for the period.",                                    data: performance.ads.spend,       format: "currency", color: "#3a7878" },
                  { key: "ctr",         label: "CTR",         description: "Click-through rate — % of impressions that resulted in a click.",  data: performance.ads.ctr,         format: "percent",  color: "#16a34a" },
                  { key: "cpm",         label: "CPM",         description: "Cost per 1,000 impressions.",                                     data: performance.ads.cpm,         format: "currency", color: "#d97706" },
                  { key: "impressions", label: "Impressions", description: "Total number of times your ads were shown.",                      data: performance.ads.impressions, format: "number",   color: "#7c3aed" },
                  { key: "frequency",   label: "Frequency",   description: "Average number of times each person saw your ads.",               data: performance.ads.frequency,   format: "number",   color: "#db2777" },
                ]}
              />
              <PerformanceChart
                title="Combined Organic — Facebook + Instagram"
                metrics={[
                  { key: "views",      label: "Views",      description: "Total content views across both platforms. Facebook: total impressions (including repeat views). Instagram: unique reach (daily impressions unavailable from Meta API).", data: performance.organic.combined.views,      format: "number", color: "#6366f1" },
                  { key: "viewers",    label: "Viewers",    description: "Unique people who saw your content on Facebook or Instagram each day.",                                                                                                   data: performance.organic.combined.viewers,    format: "number", color: "#0ea5e9" },
                  { key: "engagement", label: "Engagement", description: "Total interactions across both platforms. Facebook: reactions, comments, shares, and clicks. Instagram: likes and comments on individual posts.",                         data: performance.organic.combined.engagement, format: "number", color: "#10b981" },
                ]}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <ScorePanel
            data={result.organic}
            dimensionLabels={ORGANIC_DIMENSION_LABELS}
            icon="🌱"
            label="Organic Resonance — Facebook & Instagram"
            accentColor="border-green-700"
          />
          {performance ? (
            <div className="space-y-4">
              <PerformanceChart
                title="Combined Organic — Facebook + Instagram"
                metrics={[
                  { key: "views",      label: "Views",      description: "Total content views across both platforms. Facebook: total impressions (including repeat views). Instagram: unique reach (daily impressions unavailable from Meta API).", data: performance.organic.combined.views,      format: "number", color: "#6366f1" },
                  { key: "viewers",    label: "Viewers",    description: "Unique people who saw your content on Facebook or Instagram each day.",                                                                                                   data: performance.organic.combined.viewers,    format: "number", color: "#0ea5e9" },
                  { key: "engagement", label: "Engagement", description: "Total interactions across both platforms. Facebook: reactions, comments, shares, and clicks. Instagram: likes and comments on individual posts.",                         data: performance.organic.combined.engagement, format: "number", color: "#10b981" },
                ]}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <PerformanceChart
                  title="Facebook — Organic"
                  metrics={[
                    { key: "reach",       label: "Reach",       description: "Unique people who saw any of your page's content.",             data: performance.organic.fb.reach,       format: "number", color: "#4e9494" },
                    { key: "engagements", label: "Engagements", description: "Total post reactions, comments, shares, and link clicks.",       data: performance.organic.fb.engagements, format: "number", color: "#16a34a" },
                  ]}
                />
                <PerformanceChart
                  title="Instagram — Organic (last 30 days)"
                  metrics={[
                    { key: "reach",     label: "Reach",          description: "Unique accounts that saw your posts or stories.",    data: performance.organic.ig.reach,         format: "number", color: "#e1306c" },
                    { key: "followers", label: "New Followers",  description: "Net new Instagram followers gained each day.",       data: performance.organic.ig.followerCount, format: "number", color: "#7c3aed" },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm p-5 text-center text-sm text-slate-500">
              Performance charts loading…
            </div>
          )}
          <p className="text-xs text-slate-400 text-center px-4">
            Instagram audience demographics (age, gender, location) reflect the lifetime follower base,
            not the selected date range — Meta&apos;s API does not support custom ranges for that
            metric. All other metrics respect the selected range.
          </p>
        </>
      )}
      </div>{/* end print-region wrapper */}
    </div>
  );
}
