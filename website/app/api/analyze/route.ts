import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { SALES_RESONANCE_SYSTEM_PROMPT, buildSalesPrompt } from "@/lib/sales-prompt";
import type { ScrapeResult } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { scrape }: { scrape: ScrapeResult } = await req.json();

    if (!scrape?.instagram && !scrape?.facebook) {
      return NextResponse.json({ error: "No scraped data provided" }, { status: 400 });
    }

    const userMessage = buildSalesPrompt(scrape);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SALES_RESONANCE_SYSTEM_PROMPT,
        temperature: 0.3,
        responseMimeType: "application/json",
      },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
    });

    const text = response.text ?? "";
    const json = JSON.parse(text.replace(/^```json\s*|```$/g, "").trim());

    return NextResponse.json({ score: json });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
