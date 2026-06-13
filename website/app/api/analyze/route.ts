import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { buildUserMessage, SYSTEM_PROMPT } from "@/lib/prompt";
import type { AdMetrics, AnalysisResult } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY ?? "" });

async function generateWithRetry(contents: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const metrics: AdMetrics = body.metrics;

    if (!metrics) {
      return NextResponse.json({ error: "Missing metrics data" }, { status: 400 });
    }

    const userMessage = buildUserMessage(metrics);

    let rawText = await generateWithRetry(userMessage);
    rawText = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");

    const result: AnalysisResult = JSON.parse(rawText);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Analysis error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse analysis response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Analysis failed. Please check your API key and try again." },
      { status: 500 }
    );
  }
}
