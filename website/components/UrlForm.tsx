"use client";

import { useState } from "react";

interface Props {
  onAnalyze: (instagramUrl: string, facebookUrl: string) => void;
  loading: boolean;
}

export default function UrlForm({ onAnalyze, loading }: Props) {
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instagramUrl.trim() && !facebookUrl.trim()) {
      setError("Enter at least one URL to analyze.");
      return;
    }
    setError(null);
    onAnalyze(instagramUrl.trim(), facebookUrl.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-200">
          Instagram Profile URL
        </label>
        <input
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://www.instagram.com/yourbrand"
          className="w-full text-sm border border-[#2d2d2d] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent bg-[#2a2a2a] text-slate-100 placeholder-slate-500"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-200">
          Facebook Page URL
        </label>
        <input
          value={facebookUrl}
          onChange={(e) => setFacebookUrl(e.target.value)}
          placeholder="https://www.facebook.com/yourbrand"
          className="w-full text-sm border border-[#2d2d2d] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent bg-[#2a2a2a] text-slate-100 placeholder-slate-500"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-brand-dark text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing…
          </>
        ) : (
          "Get Resonance Score →"
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        Analyzes public profile data — no login or account connection required
      </p>
    </form>
  );
}
