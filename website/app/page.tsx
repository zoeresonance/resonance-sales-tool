"use client";

import { useState } from "react";
import UrlForm from "@/components/UrlForm";
import ResonanceScore from "@/components/ResonanceScore";
import type { ResonanceScoreResult } from "@/lib/types";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResonanceScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(instagramUrl: string, facebookUrl: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramUrl, facebookUrl }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Analysis failed");
      setResult(data.score);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#111111]">
      <header className="bg-brand-dark sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-white tracking-widest text-sm uppercase">Resonance</span>
          <span className="text-xs text-slate-400">Organic Social Scorer</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {!result && !loading && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-100 mb-2">Organic Resonance Score</h1>
              <p className="text-sm text-slate-400">
                Enter a brand's Facebook and/or Instagram URLs to instantly score how well their organic content is connecting with their audience.
              </p>
            </div>
            <UrlForm onAnalyze={handleAnalyze} loading={loading} />
          </div>
        )}

        {loading && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2d2d2d] p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 border-4 border-brand-300 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-200 font-medium">Analyzing organic presence…</p>
            <p className="text-slate-500 text-sm mt-1">Fetching public profile data and generating score</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-5 space-y-3">
            <p className="text-red-300 font-semibold text-sm">Analysis failed</p>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-300 underline"
            >
              Try again
            </button>
          </div>
        )}

        {result && !loading && (
          <ResonanceScore result={result} onReset={() => setResult(null)} />
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
