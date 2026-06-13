"use client";

import { useState, useRef } from "react";
import ConnectForm from "@/components/ConnectForm";
import InputForm from "@/components/InputForm";
import ResultsDashboard from "@/components/ResultsDashboard";
import ResonancePanel from "@/components/ResonancePanel";
import MetricQualityPanel from "@/components/MetricQualityPanel";
import type { DateRange } from "@/components/DateRangePicker";
import type { AdMetrics, AnalysisResult, ResonanceResult, PerformanceData } from "@/lib/types";

type Mode = "connect" | "manual";
type ResultTab = "health" | "resonance";

interface AccountMeta {
  name: string;
  id: string;
  currency: string;
  campaigns: number;
  adsets: number;
  ads: number;
  spend?: string;
  fetchedAt: string;
  dateRange?: DateRange;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("connect");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resonanceResult, setResonanceResult] = useState<ResonanceResult | null>(null);
  const [resonanceClientName, setResonanceClientName] = useState<string>("");
  const [resonanceLoading, setResonanceLoading] = useState(false);
  const [resonanceError, setResonanceError] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [account, setAccount] = useState<AccountMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("health");
  const resultsRef = useRef<HTMLDivElement>(null);

  async function handleConnect(token: string, accountId: string, dateRange: DateRange) {
    setLoading(true);
    setError(null);
    setResult(null);
    setAccount(null);
    setResonanceResult(null);
    setResonanceError(null);
    setPerformanceData(null);
    setActiveTab("health");
    setLoadingMsg("Fetching Meta account data…");

    try {
      const res = await fetch("/api/meta-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, dateRange }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Analysis failed");

      setResult(data.result);
      setAccount(data.account ?? null);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

      // Kick off resonance + performance in the background (non-blocking)
      fetchResonance(accountId, dateRange);
      fetchPerformance(accountId, dateRange);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  async function fetchResonance(accountId: string, dateRange: DateRange) {
    setResonanceLoading(true);
    setResonanceError(null);
    try {
      const res = await fetch("/api/resonance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, dateRange }),
      });
      const data = await res.json();
      if (res.status === 404) return; // No client config — silently skip
      if (!res.ok || data.error) throw new Error(data.error);
      setResonanceResult(data.result);
      setResonanceClientName(data.clientName ?? "");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Resonance analysis failed";
      // Only show error if it's not a "no config" situation
      if (!msg.includes("No client config")) setResonanceError(msg);
    } finally {
      setResonanceLoading(false);
    }
  }

  async function fetchPerformance(accountId: string, dateRange: DateRange) {
    try {
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, dateRange }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return; // silently skip on error
      setPerformanceData(data.performance);
    } catch {
      // silently skip — charts are optional
    }
  }

  async function handleManual(metrics: AdMetrics) {
    setLoading(true);
    setError(null);
    setResult(null);
    setAccount(null);
    setResonanceResult(null);
    setLoadingMsg("Running your 50-check audit…");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Analysis failed");
      setResult(data.result);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  function handleReset() {
    setResult(null);
    setResonanceResult(null);
    setResonanceError(null);
    setPerformanceData(null);
    setError(null);
    setAccount(null);
    setActiveTab("health");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasResonance = resonanceResult !== null || resonanceLoading || resonanceError !== null;

  return (
    <div className="min-h-screen bg-[#111111]">
      {/* Header */}
      <header className="bg-brand-dark sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white tracking-widest text-sm sm:text-base uppercase">Resonance</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="font-medium text-slate-400 text-sm hidden sm:inline">Meta Performance Analyzer</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="hidden sm:inline">Powered by</span>
            <span className="font-semibold text-slate-200">Gemini 2.5</span>
            <span className="bg-brand-300 text-brand-dark font-semibold px-2 py-0.5 rounded-full">
              50 checks
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Loading */}
        {loading && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-12 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-brand-300 border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="font-semibold text-slate-100 text-lg mb-1">{loadingMsg}</h3>
            <p className="text-slate-400 text-sm">
              {mode === "connect"
                ? "Fetching campaigns, ad sets, creatives, pixels, audiences, and 30-day insights — then running the full audit."
                : "Evaluating all 50 checks across Pixel/CAPI, creative, structure, and audience. This takes about 20 seconds."}
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-center">
            <p className="text-red-300 font-semibold mb-1">Something went wrong</p>
            <p className="text-red-400 text-sm">{error}</p>
            {error.toLowerCase().includes("oauthexception") || error.toLowerCase().includes("token") ? (
              <p className="text-red-500 text-xs mt-2">
                Your access token may have expired. Generate a new one at{" "}
                <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="underline">
                  Graph API Explorer
                </a>.
              </p>
            ) : (
              <p className="text-red-500 text-xs mt-2">
                Make sure GOOGLE_AI_API_KEY is set in your environment variables.
              </p>
            )}
          </div>
        )}

        {/* Input forms */}
        {!loading && !result && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm overflow-hidden">
            <div className="flex border-b border-[#2d2d2d]">
              <button
                onClick={() => setMode("connect")}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  mode === "connect" ? "bg-[#1e1e1e] text-brand-300 border-b-2 border-brand-300" : "text-slate-400 hover:text-slate-200 bg-[#252525]"
                }`}
              >
                📡 Connect Meta Account
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  mode === "manual" ? "bg-[#1e1e1e] text-brand-300 border-b-2 border-brand-300" : "text-slate-400 hover:text-slate-200 bg-[#252525]"
                }`}
              >
                ✏️ Enter Metrics Manually
              </button>
            </div>
            <div className="p-6 sm:p-8">
              {mode === "connect" ? (
                <ConnectForm onAnalyze={handleConnect} loading={loading} />
              ) : (
                <InputForm onAnalyze={handleManual} loading={loading} />
              )}
            </div>
          </div>
        )}

        {/* Account summary bar */}
        {result && account && !loading && (
          <div className="bg-brand-dark text-white rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4">
            <div>
              <p className="text-brand-300 text-xs font-medium">Account</p>
              <p className="font-bold">{account.name}</p>
            </div>
            <div className="h-8 w-px bg-slate-700 hidden sm:block" />
            <div>
              <p className="text-brand-300 text-xs font-medium">Campaigns</p>
              <p className="font-bold">{account.campaigns}</p>
            </div>
            <div>
              <p className="text-brand-300 text-xs font-medium">Ad Sets</p>
              <p className="font-bold">{account.adsets}</p>
            </div>
            <div>
              <p className="text-brand-300 text-xs font-medium">Ads</p>
              <p className="font-bold">{account.ads}</p>
            </div>
            {account.spend && (
              <div>
                <p className="text-brand-300 text-xs font-medium">30-Day Spend</p>
                <p className="font-bold">
                  ${parseFloat(account.spend).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
            {account.dateRange && (
              <div>
                <p className="text-brand-300 text-xs font-medium">Date Range</p>
                <p className="font-bold">
                  {account.dateRange.since} → {account.dateRange.until}
                </p>
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <p className="text-slate-400 text-xs">
                Fetched {new Date(account.fetchedAt).toLocaleTimeString()}
              </p>
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                ← New analysis
              </button>
            </div>
          </div>
        )}

        {/* Results tabs */}
        {result && !loading && (
          <div ref={resultsRef}>
            {hasResonance && (
              <div className="flex gap-1 mb-4 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-1 w-fit">
                <button
                  onClick={() => setActiveTab("health")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    activeTab === "health" ? "bg-brand-300 text-brand-dark" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Health Score
                </button>
                <button
                  onClick={() => setActiveTab("resonance")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                    activeTab === "resonance" ? "bg-brand-300 text-brand-dark" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Resonance Score
                  {resonanceLoading && (
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {activeTab === "health" && (
              <ResultsDashboard result={result} onReset={handleReset} performance={performanceData ?? undefined} />
            )}

            {activeTab === "resonance" && (
              <>
                {resonanceLoading && (
                  <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-12 text-center shadow-sm">
                    <div className="flex justify-center mb-4">
                      <div className="w-10 h-10 border-4 border-brand-300 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-slate-300 font-medium">Analyzing audience resonance…</p>
                    <p className="text-slate-400 text-sm mt-1">Fetching organic data and comparing against your persona doc</p>
                  </div>
                )}
                {resonanceError && (
                  <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-red-300 font-semibold text-sm">Resonance analysis failed</p>
                      <p className="text-red-400 text-sm mt-1">{resonanceError}</p>
                    </div>
                    {account && (
                      <button
                        onClick={() => fetchResonance(account.id, account.dateRange!)}
                        disabled={resonanceLoading}
                        className="shrink-0 text-sm font-medium text-red-300 border border-red-800 bg-red-950/40 rounded-lg px-3 py-1.5 hover:bg-red-950/60 disabled:opacity-50 transition-colors"
                      >
                        {resonanceLoading ? "Retrying…" : "Retry"}
                      </button>
                    )}
                  </div>
                )}
                {resonanceResult && (
                  <ResonancePanel result={resonanceResult} clientName={resonanceClientName} performance={performanceData ?? undefined} />
                )}
              </>
            )}
          </div>
        )}

        {/* Data quality panel — visible whenever results are shown */}
        {result && !loading && (
          <MetricQualityPanel performance={performanceData ?? undefined} />
        )}
      </main>

      <footer className="border-t border-[#2d2d2d] mt-16 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-400">
          <p>
            Built with{" "}
            <a href="https://resonance.com" className="text-slate-500 hover:text-brand-500 underline transition-colors" target="_blank" rel="noopener noreferrer">
              Resonance
            </a>{" "}
            · Audit framework v1.5 · Meta Marketing API v21.0 · Benchmarks updated 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
