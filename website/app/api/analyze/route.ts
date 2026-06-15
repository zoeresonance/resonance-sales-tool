import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { SALES_RESONANCE_SYSTEM_PROMPT, buildSalesPrompt } from "@/lib/sales-prompt";
import type { ScrapeResult } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

const isVideo = (type: string) => /video|reel/i.test(type);

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();
    if (!mimeType.startsWith("image/")) return null;
    const buffer = await res.arrayBuffer();
    return { data: Buffer.from(buffer).toString("base64"), mimeType };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { scrape }: { scrape: ScrapeResult } = await req.json();

    if (!scrape?.instagram && !scrape?.facebook) {
      return NextResponse.json({ error: "No scraped data provided" }, { status: 400 });
    }

    const userMessage = buildSalesPrompt(scrape);

    // Collect image URLs from static posts (skip Reels/videos — only a cover frame)
    const imagePosts = (scrape.instagram?.recentPosts ?? []).filter(
      (p) => !isVideo(p.type) && p.imageUrl
    );

    // Fetch up to 8 images in parallel (keep token usage reasonable)
    const imageResults = await Promise.all(
      imagePosts.slice(0, 8).map(async (p, i) => {
        const img = await fetchImageAsBase64(p.imageUrl!);
        if (!img) return null;
        return { index: i + 1, ...img };
      })
    );

    const validImages = imageResults.filter(Boolean) as { index: number; data: string; mimeType: string }[];
    console.log(`[analyze] Sending ${validImages.length} images to Gemini`);

    // Build multimodal parts: text prompt + images with labels
    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
      { text: userMessage },
    ];

    if (validImages.length > 0) {
      parts.push({
        text: `\n\nThe following ${validImages.length} images are the actual static post visuals from their Instagram feed (in order, skipping Reels). Use them to evaluate visual branding consistency, whether real people are shown and how they are framed, whether the space looks full and inviting vs. empty or intimidating, and whether camera angles are flattering. Reference specific observations in your analysis.`,
      });
      for (const img of validImages) {
        parts.push({ text: `Post image ${img.index}:` });
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SALES_RESONANCE_SYSTEM_PROMPT,
        temperature: 0.3,
        responseMimeType: "application/json",
      },
      contents: [{ role: "user", parts }],
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
