import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { scrapeInstagram, scrapeFacebook } from "@/lib/scraper";
import { SALES_RESONANCE_SYSTEM_PROMPT, buildSalesPrompt } from "@/lib/sales-prompt";
import type { ScrapeResult } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { instagramUrl, facebookUrl } = await req.json();

    if (!instagramUrl && !facebookUrl) {
      return NextResponse.json({ error: "Provide at least one URL" }, { status: 400 });
    }

    const result: ScrapeResult = {
      instagram: null,
      facebook: null,
    };

    await Promise.all([
      instagramUrl
        ? scrapeInstagram(instagramUrl)
            .then((d) => { result.instagram = d; })
            .catch((e) => { result.instagramError = e.message; })
        : Promise.resolve(),

      facebookUrl
        ? scrapeFacebook(facebookUrl)
            .then((d) => { result.facebook = d; })
            .catch((e) => { result.facebookError = e.message; })
        : Promise.resolve(),
    ]);

    if (!result.instagram && !result.facebook) {
      return NextResponse.json(
        {
          error: `Could not retrieve data from either platform. Instagram: ${result.instagramError ?? "not requested"}. Facebook: ${result.facebookError ?? "not requested"}.`,
        },
        { status: 422 }
      );
    }

    const userMessage = buildSalesPrompt(result);

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

    return NextResponse.json({ score: json, scrape: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
