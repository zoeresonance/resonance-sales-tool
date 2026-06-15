"use client";

import { useState } from "react";
import UrlForm from "@/components/UrlForm";
import ResonanceScore from "@/components/ResonanceScore";
import type { ResonanceScoreResult, ScrapeResult } from "@/lib/types";

type Step = "idle" | "scraping" | "analyzing" | "done" | "scrape-error" | "analyze-error";

export default function Home() {
  const [step, setStep] = useState<Step>("idle");
  const [scrapeData, setScrapeData] = useState<ScrapeResult | null>(null);
  const [result, setResult] = useState<ResonanceScoreResult | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  async function handleAnalyze(instagramUrl: string, facebookUrl: string) {
    setStep("scraping");
    setScrapeData(null);
    setResult(null);
    setScrapeError(null);
    setAnalyzeError(null);

    // Step 1: Scrape (Apify — only runs once per submission)
    let scrape: ScrapeResult;
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramUrl, facebookUrl }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Scraping failed");
      scrape = data.scrape;
      setScrapeData(scrape);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Could not fetch profile data");
      setStep("scrape-error");
      return;
    }

    // Step 2: Analyze with Gemini
    await runAnalysis(scrape);
  }

  async function runAnalysis(scrape: ScrapeResult) {
    setStep("analyzing");
    setAnalyzeError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrape }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Analysis failed");
      setResult(data.score);
      setStep("done");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Gemini analysis failed");
      setStep("analyze-error");
    }
  }

  function handleReset() {
    setStep("idle");
    setScrapeData(null);
    setResult(null);
    setScrapeError(null);
    setAnalyzeError(null);
  }

  const loading = step === "scraping" || step === "analyzing";

  return (
    <div className="min-h-screen bg-[#111111]">
      <header className="bg-brand-dark sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-white tracking-widest text-sm uppercase">Resonance</span>
          <span className="text-xs text-slate-400">Organic Social Scorer</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Input form */}
        {step === "idle" && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-100 mb-2">Organic Resonance Score</h1>
              <p className="text-sm text-slate-400">
                Enter a brand's Facebook and/or Instagram URLs to score how well their organic content connects with their audience.
              </p>
            </div>
            <UrlForm onAnalyze={handleAnalyze} loading={false} />
          </div>
        )}

        {/* Loading states */}
        {step === "scraping" && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 border-4 border-brand-300 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-200 font-medium">Fetching profile data…</p>
            <p className="text-slate-500 text-sm mt-1">Pulling public data from Instagram and Facebook</p>
          </div>
        )}

        {step === "analyzing" && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 border-4 border-brand-300 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-200 font-medium">Generating Resonance Score…</p>
            <p className="text-slate-500 text-sm mt-1">Gemini is analyzing the data — this can take up to 30 seconds</p>
          </div>
        )}

        {/* Scrape error — must re-enter URLs */}
        {step === "scrape-error" && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-5 space-y-3">
            <p className="text-red-300 font-semibold text-sm">Could not fetch profile data</p>
            <p className="text-red-400 text-sm">{scrapeError}</p>
            <button
              onClick={handleReset}
              className="text-xs font-medium text-red-300 border border-red-800 rounded-lg px-3 py-1.5 hover:bg-red-950/60 transition-colors"
            >
              ← Try different URLs
            </button>
          </div>
        )}

        {/* Gemini error — retry without re-scraping */}
        {step === "analyze-error" && scrapeData && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-950/60 border border-yellow-800 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-yellow-400 text-sm">!</span>
              </div>
              <div>
                <p className="text-slate-200 font-semibold text-sm">Profile data collected — AI analysis timed out</p>
                <p className="text-slate-400 text-sm mt-1">
                  We successfully pulled the social data. Gemini hit a timeout — click below to retry the analysis without re-fetching from Apify.
                </p>
                {analyzeError && (
                  <p className="text-slate-500 text-xs mt-2 font-mono">{analyzeError}</p>
                )}
              </div>
            </div>

            {/* Show which platforms were fetched */}
            <div className="flex gap-2 flex-wrap">
              {scrapeData.instagram && (
                <span className="text-xs bg-[#252525] border border-[#2d2d2d] text-slate-300 px-2.5 py-1 rounded-full">
                  ✓ Instagram @{scrapeData.instagram.username}
                </span>
              )}
              {scrapeData.facebook && (
                <span className="text-xs bg-[#252525] border border-[#2d2d2d] text-slate-300 px-2.5 py-1 rounded-full">
                  ✓ Facebook {scrapeData.facebook.name}
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => runAnalysis(scrapeData)}
                className="px-4 py-2 bg-brand-dark text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Retry Analysis →
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-slate-400 text-sm hover:text-slate-200 transition-colors"
              >
                Start over
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {step === "done" && result && (
          <>
            {/* Show partial scrape warnings */}
            {scrapeData && (scrapeData.instagramError || scrapeData.facebookError) && (
              <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl px-4 py-3 space-y-1">
                <p className="text-yellow-300 text-xs font-semibold uppercase tracking-wide">Data collection notice</p>
                {scrapeData.instagramError && (
                  <p className="text-yellow-400 text-xs">Instagram: {scrapeData.instagramError}</p>
                )}
                {scrapeData.facebookError && (
                  <p className="text-yellow-400 text-xs">Facebook: {scrapeData.facebookError}</p>
                )}
              </div>
            )}
            <ResonanceScore result={result} onReset={handleReset} />
          </>
        )}
      </main>

      <footer className="border-t border-[#2d2d2d] mt-16 py-6">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-500">
          Resonance · Organic Social Scorer · Powered by Gemini 2.5
        </div>
      </footer>
    </div>
  );
}
