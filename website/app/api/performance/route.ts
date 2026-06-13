import { NextRequest, NextResponse } from "next/server";
import { fetchDailyAdsInsights, fetchOrganicData } from "@/lib/meta-api";
import { getClientForAccount } from "@/lib/clients";
import type { PerformanceData, DailyMetric } from "@/lib/types";
import type { PageInsightValue, DateRange } from "@/lib/meta-api";

function extractDailySeries(insights: PageInsightValue[], metricName: string): DailyMetric[] {
  const item = insights.find((i) => i.name === metricName);
  if (!item) return [];
  return item.values
    .filter((v) => typeof v.value === "number")
    .map((v) => ({
      date: v.end_time.slice(0, 10),
      value: v.value as number,
    }));
}

function mergeSeries(...series: DailyMetric[][]): DailyMetric[] {
  const map = new Map<string, number>();
  for (const s of series)
    for (const { date, value } of s)
      map.set(date, (map.get(date) ?? 0) + value);
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export async function POST(req: NextRequest) {
  try {
    const { accountId, dateRange } = await req.json();
    const token = process.env.META_SYSTEM_TOKEN;

    if (!token) return NextResponse.json({ error: "META_SYSTEM_TOKEN not configured." }, { status: 500 });
    if (!accountId) return NextResponse.json({ error: "Account ID is required." }, { status: 400 });

    const client = getClientForAccount(accountId);

    const [dailyAds, organic] = await Promise.all([
      fetchDailyAdsInsights(token, accountId, dateRange as DateRange | undefined),
      client?.facebookPageId && client?.instagramAccountId
        ? fetchOrganicData(token, client.facebookPageId, client.instagramAccountId, dateRange as DateRange | undefined)
        : Promise.resolve(null),
    ]);

    const performance: PerformanceData = {
      ads: {
        spend:       dailyAds.map((d) => ({ date: d.date_start, value: parseFloat(d.spend ?? "0") })),
        impressions: dailyAds.map((d) => ({ date: d.date_start, value: parseInt(d.impressions ?? "0") })),
        clicks:      dailyAds.map((d) => ({ date: d.date_start, value: parseInt(d.clicks ?? "0") })),
        ctr:         dailyAds.map((d) => ({ date: d.date_start, value: parseFloat(d.ctr ?? "0") * 100 })),
        cpm:         dailyAds.map((d) => ({ date: d.date_start, value: parseFloat(d.cpm ?? "0") })),
        frequency:   dailyAds.map((d) => ({ date: d.date_start, value: parseFloat(d.frequency ?? "0") })),
      },
      organic: (() => {
        const empty = { fb: { reach: [], engagements: [] }, ig: { reach: [], followerCount: [] }, combined: { views: [], viewers: [], engagement: [] } };
        if (!organic) return empty;

        const fbImpressions = extractDailySeries(organic.pageInsights, "page_impressions");
        const fbReach       = extractDailySeries(organic.pageInsights, "page_impressions_unique");
        const fbEngagements = extractDailySeries(organic.pageInsights, "page_post_engagements");
        const igReach       = extractDailySeries(organic.igInsights, "reach");
        const igFollowers   = extractDailySeries(organic.igInsights, "follower_count");

        const igEngagementMap = new Map<string, number>();
        for (const post of organic.igMedia) {
          const date = post.timestamp.slice(0, 10);
          igEngagementMap.set(date, (igEngagementMap.get(date) ?? 0) + (post.like_count ?? 0) + (post.comments_count ?? 0));
        }
        const igEngagement = Array.from(igEngagementMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, value]) => ({ date, value }));

        return {
          fb: { reach: fbReach, engagements: fbEngagements },
          ig: { reach: igReach, followerCount: igFollowers },
          combined: {
            views:      mergeSeries(fbImpressions, igReach),
            viewers:    mergeSeries(fbReach, igReach),
            engagement: mergeSeries(fbEngagements, igEngagement),
          },
        };
      })(),
    };

    return NextResponse.json({ performance });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Performance fetch failed: ${msg}` }, { status: 500 });
  }
}
