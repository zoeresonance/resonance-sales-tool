import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { fetchMetaData, fetchOrganicData, fetchInsightsForPeriod, fetchOrganicInsightsForPeriod } from "@/lib/meta-api";
import type { DateRange } from "@/lib/meta-api";

function previousPeriod(dateRange?: DateRange): DateRange {
  const since = new Date(dateRange?.since ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const until = new Date(dateRange?.until ?? new Date().toISOString().slice(0, 10));
  const days = Math.round((until.getTime() - since.getTime()) / 86400000);
  // Use UTC date methods — these Date objects represent UTC midnight (parsed
  // from YYYY-MM-DD strings), so local-time getDate/setDate would shift the
  // window by the server's UTC offset on non-UTC hosts.
  const prevUntil = new Date(since);
  prevUntil.setUTCDate(prevUntil.getUTCDate() - 1);
  const prevSince = new Date(prevUntil);
  prevSince.setUTCDate(prevSince.getUTCDate() - days);
  return {
    since: prevSince.toISOString().slice(0, 10),
    until: prevUntil.toISOString().slice(0, 10),
  };
}

function yoyPeriod(dateRange?: DateRange): DateRange {
  const since = new Date(dateRange?.since ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const until = new Date(dateRange?.until ?? new Date().toISOString().slice(0, 10));
  since.setUTCFullYear(since.getUTCFullYear() - 1);
  until.setUTCFullYear(until.getUTCFullYear() - 1);
  return {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10),
  };
}
import {
  ADS_RESONANCE_SYSTEM_PROMPT,
  ORGANIC_RESONANCE_SYSTEM_PROMPT,
  buildAdsResonanceMessage,
  buildOrganicResonanceMessage,
} from "@/lib/resonance-prompt";
import { getClientForAccount, readAuditDoc } from "@/lib/clients";
import type { ResonanceResult, ResonanceScoreResult } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY ?? "" });

async function generateWithRetry(systemPrompt: string, contents: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 65536,
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return (response.text ?? "").trim();
    } catch (err) {
      const isRetryable =
        err instanceof Error &&
        (err.message.includes("503") || err.message.includes("UNAVAILABLE") || err.message.includes("overloaded"));
      if (!isRetryable || attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

function stripMarkdown(raw: string): string {
  return raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
}

export async function POST(req: NextRequest) {
  try {
    const { accountId, dateRange } = await req.json();
    const token = process.env.META_SYSTEM_TOKEN;

    if (!token) {
      return NextResponse.json({ error: "META_SYSTEM_TOKEN is not configured." }, { status: 500 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required." }, { status: 400 });
    }

    const client = getClientForAccount(accountId);
    if (!client) {
      return NextResponse.json(
        { error: "No client config found for this account. Add a config in website/clients/." },
        { status: 404 }
      );
    }
    if (!client.facebookPageId || !client.instagramAccountId) {
      return NextResponse.json(
        { error: `Client "${client.name}" is missing facebookPageId or instagramAccountId in config.json.` },
        { status: 422 }
      );
    }

    const auditDoc = readAuditDoc(client);
    if (!auditDoc || auditDoc.length < 100) {
      return NextResponse.json(
        { error: `Audit document for "${client.name}" is missing or too short. Add it to website/clients/${client.name}/audit.md.` },
        { status: 422 }
      );
    }

    const prevRange = previousPeriod(dateRange as DateRange | undefined);
    const yoyRange = yoyPeriod(dateRange as DateRange | undefined);
    const [adData, organic, previousInsights, previousOrganic, yoyOrganic] = await Promise.all([
      fetchMetaData(token, accountId, dateRange).catch((err) => {
        throw new Error(`Ad data: ${err instanceof Error ? err.message : "fetch failed"}`);
      }),
      fetchOrganicData(token, client.facebookPageId, client.instagramAccountId, dateRange).catch((err) => {
        throw new Error(`Organic data: ${err instanceof Error ? err.message : "fetch failed"}`);
      }),
      fetchInsightsForPeriod(token, accountId, prevRange).catch(() => null),
      fetchOrganicInsightsForPeriod(token, client.facebookPageId, client.instagramAccountId, prevRange).catch(() => null),
      fetchOrganicInsightsForPeriod(token, client.facebookPageId, client.instagramAccountId, yoyRange).catch(() => null),
    ]);

    const [adsRaw, organicRaw] = await Promise.all([
      generateWithRetry(ADS_RESONANCE_SYSTEM_PROMPT, buildAdsResonanceMessage(auditDoc, adData, previousInsights ?? undefined)),
      generateWithRetry(ORGANIC_RESONANCE_SYSTEM_PROMPT, buildOrganicResonanceMessage(auditDoc, organic, previousOrganic ?? undefined, yoyOrganic ?? undefined)),
    ]);

    const adsResult: ResonanceScoreResult = JSON.parse(stripMarkdown(adsRaw));
    const organicResult: ResonanceScoreResult = JSON.parse(stripMarkdown(organicRaw));

    const result: ResonanceResult = { ads: adsResult, organic: organicResult };

    return NextResponse.json({ result, clientName: client.name });
  } catch (error) {
    console.error("Resonance error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse resonance analysis. Please try again." },
        { status: 500 }
      );
    }

    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Resonance analysis failed: ${msg}` }, { status: 500 });
  }
}
