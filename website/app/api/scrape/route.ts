import { NextRequest, NextResponse } from "next/server";
import { scrapeInstagram, scrapeFacebook } from "@/lib/scraper";
import type { ScrapeResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { instagramUrl, facebookUrl } = await req.json();

    if (!instagramUrl && !facebookUrl) {
      return NextResponse.json({ error: "Provide at least one URL" }, { status: 400 });
    }

    const result: ScrapeResult = { instagram: null, facebook: null };

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

    return NextResponse.json({ scrape: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scraping failed" },
      { status: 500 }
    );
  }
}
