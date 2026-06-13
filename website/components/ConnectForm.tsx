"use client";

import { useState, useEffect } from "react";
import DateRangePicker, { DateRange, defaultDateRange } from "./DateRangePicker";

interface Client {
  name: string;
  adAccountId: string;
}

interface Props {
  onAnalyze: (token: string, accountId: string, dateRange: DateRange) => void;
  loading: boolean;
}

function AddClientForm({ onAdded }: { onAdded: (client: Client) => void }) {
  const [name, setName] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [auditDoc, setAuditDoc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, adAccountId, facebookPageId, instagramAccountId, auditDoc }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      onAdded({ name: data.name, adAccountId: data.adAccountId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border border-[#2d2d2d] rounded-xl p-4 space-y-3 bg-[#252525]">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">New Client</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Client Name <span className="text-red-400">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Stonecreek"
            className="w-full text-sm border border-[#2d2d2d] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-[#2a2a2a] text-slate-100 placeholder-slate-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Ad Account ID <span className="text-red-400">*</span>
          </label>
          <input
            value={adAccountId}
            onChange={(e) => setAdAccountId(e.target.value)}
            required
            placeholder="e.g. act_123456789"
            className="w-full text-sm border border-[#2d2d2d] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-[#2a2a2a] text-slate-100 placeholder-slate-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Facebook Page ID</label>
          <input
            value={facebookPageId}
            onChange={(e) => setFacebookPageId(e.target.value)}
            placeholder="e.g. 22340809962"
            className="w-full text-sm border border-[#2d2d2d] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-[#2a2a2a] text-slate-100 placeholder-slate-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Instagram Account ID</label>
          <input
            value={instagramAccountId}
            onChange={(e) => setInstagramAccountId(e.target.value)}
            placeholder="e.g. 17841401460562901"
            className="w-full text-sm border border-[#2d2d2d] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-[#2a2a2a] text-slate-100 placeholder-slate-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">
          Persona / Audience Audit Doc
          <span className="ml-1 text-slate-500 font-normal">(optional — powers Resonance Score)</span>
        </label>
        <textarea
          value={auditDoc}
          onChange={(e) => setAuditDoc(e.target.value)}
          rows={5}
          placeholder="Paste your audience persona document here…"
          className="w-full text-sm border border-[#2d2d2d] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-[#2a2a2a] text-slate-100 placeholder-slate-500 resize-y font-mono"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-brand-dark text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Creating…" : "Create Client"}
        </button>
        <p className="text-xs text-slate-400">
          Facebook Page ID and Instagram Account ID are needed for Resonance Score.
        </p>
      </div>
    </form>
  );
}

export default function ConnectForm({ onAnalyze, loading }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [fetchingClients, setFetchingClients] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange());
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  function loadClients() {
    setFetchingClients(true);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setClients(json.clients);
        if (json.clients.length > 0 && !selectedId) setSelectedId(json.clients[0].adAccountId);
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setFetchingClients(false));
  }

  function handleClientAdded(client: Client) {
    setClients((prev) => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedId(client.adAccountId);
    setShowAddForm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    onAnalyze("", selectedId, dateRange);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-slate-200">
            Client <span className="text-red-400">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            {showAddForm ? "Cancel" : "+ Add new client"}
          </button>
        </div>

        {fetchingClients && (
          <p className="text-sm text-slate-400 animate-pulse">Loading clients…</p>
        )}

        {fetchError && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
            {fetchError}
          </p>
        )}

        {!fetchingClients && !fetchError && clients.length > 0 && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            required
            className="w-full text-sm border border-[#2d2d2d] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent text-slate-100 bg-[#2a2a2a]"
          >
            {clients.map((c) => (
              <option key={c.adAccountId} value={c.adAccountId}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {!fetchingClients && !fetchError && clients.length === 0 && !showAddForm && (
          <p className="text-sm text-slate-400 bg-[#252525] border border-[#2d2d2d] rounded-lg px-3 py-2">
            No clients yet. Click <strong className="text-slate-200">+ Add new client</strong> to get started.
          </p>
        )}

        {showAddForm && <AddClientForm onAdded={handleClientAdded} />}
      </div>

      {/* Date range */}
      <DateRangePicker value={dateRange} onChange={setDateRange} />

      <button
        type="submit"
        disabled={loading || !selectedId}
        className="w-full py-3.5 bg-brand-dark text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Fetching data…
          </>
        ) : (
          "Analyze Client →"
        )}
      </button>

      <p className="text-center text-xs text-slate-400">
        Pulls campaigns, ad sets, creatives, pixels, audiences, and performance data for the selected range
      </p>
    </form>
  );
}
