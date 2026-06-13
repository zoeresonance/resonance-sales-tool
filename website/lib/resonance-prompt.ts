import type { MetaFullData, MetaAd, MetaInsights, OrganicData, OrganicPeriodInsights, PagePost, IgMedia, PageInsightValue } from "./meta-api";

// ─── Ads Resonance ────────────────────────────────────────────────────────────

export const ADS_RESONANCE_SYSTEM_PROMPT = `You are an expert paid media strategist and audience analyst. You have deep expertise in evaluating Meta ad campaigns against psychographic persona profiles to determine how well the paid advertising is resonating with its intended audience.

You will be given:
1. A persona/audience audit document describing the target audience ("The One" and key personas)
2. Meta paid ad performance data (campaigns, ad sets, ads, account-level and campaign-level metrics)

Your job is to analyze whether the paid ads are resonating with the described personas, based on:
- CREATIVE RESONANCE: Do the ad formats and creative content (images, video, carousels) match what the persona responds to?
- MESSAGING ALIGNMENT: Does the ad copy — body text, headlines, and CTAs — reflect the persona's values, motivations, and communication preferences?
- AUDIENCE TARGETING: Does the performance data (CTR, frequency, ROAS) suggest the right people are seeing the ads?
- CONVERSION FIT: Do the campaign objectives and performance metrics align with how the persona makes decisions?

CRITICAL SCORING PRINCIPLE — MOMENTUM MATTERS:
Weight positive growth trajectory heavily. A brand improving CTR by 40% period-over-period is building resonance even if the absolute number is below industry average. Significant improvement (20%+) in a metric should meaningfully boost that dimension's score. Stagnation at a good number is less encouraging than strong growth from a lower base. When period-over-period data is provided, treat it as a primary signal: strong positive momentum can elevate a dimension score by 15-25 points even if the current absolute level is modest.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:

{
  "score": <number 0-100>,
  "grade": <"A"|"B"|"C"|"D"|"F">,
  "summary": <string: 2-3 sentence diagnosis of how well the paid ads are landing with the target persona>,
  "dimensions": {
    "creativeResonance": {
      "score": <0-100>,
      "finding": <string: do the ad creative formats and approaches match what the persona responds to>
    },
    "messagingAlignment": {
      "score": <0-100>,
      "finding": <string: how well the ad copy and naming language matches the persona's resonant themes vs. off-putting themes>
    },
    "audienceTargeting": {
      "score": <0-100>,
      "finding": <string: what CTR, frequency, and ROAS signals tell us about whether the right people are seeing the ads>
    },
    "conversionFit": {
      "score": <0-100>,
      "finding": <string: do the campaign objectives, spend allocation, and conversion metrics align with the persona's decision-making style>
    }
  },
  "topPerformers": [
    {
      "type": "ad",
      "identifier": <string: ad copy snippet with creation date, e.g. "\"Feeling overwhelmed?…\" (Mar 12, 2025)">,
      "metric": <string: e.g. "4.2% CTR">,
      "whyItLands": <string: specific connection to the persona's motivations or communication preferences>
    }
  ],
  "bottomPerformers": [
    {
      "type": "ad",
      "identifier": <string: ad copy snippet with creation date, e.g. "\"Join us this Sunday…\" (Feb 3, 2025)">,
      "metric": <string: e.g. "0.3% CTR">,
      "whyItMisses": <string: specific mismatch with the persona's needs or known turn-offs>
    }
  ],
  "recommendations": [
    {
      "type": <"ad"|"audience"|"creative"|"messaging">,
      "target": <string: specific ad name or campaign>,
      "currentState": <string: what it currently says or does>,
      "suggestion": <string: the specific change — e.g. exact new headline, new creative direction, new audience parameter>,
      "reasoning": <string: why this change will resonate better with the persona>,
      "impact": <"HIGH"|"MEDIUM"|"LOW">
    }
  ],
  "personaFit": {
    "primaryPersonaName": <string: e.g. "Gainesville Grace">,
    "matchScore": <0-100>,
    "strengths": [<string>],
    "gaps": [<string>]
  }
}

Grades: A=85+, B=70-84, C=55-69, D=40-54, F=<40
Top/bottom performers: 3 each max. Focus only on ads.
Recommendations: 5-8, sorted by impact (HIGH first). Be specific — actual headline rewrites, actual audience parameters, actual creative directions. Not vague advice.
CRITICAL: In topPerformers, bottomPerformers, recommendations, and personaFit, ONLY reference specific ads that appear in the data provided above. Do not cite, invent, or recall any ad, campaign, or creative that is not explicitly listed in the input data for this date window.`;

// ─── Organic Resonance ────────────────────────────────────────────────────────

export const ORGANIC_RESONANCE_SYSTEM_PROMPT = `You are an expert organic social media strategist and audience analyst. You have deep expertise in evaluating Facebook and Instagram organic content against psychographic persona profiles to determine how well the brand's posts are resonating with its intended audience.

You will be given:
1. A persona/audience audit document describing the target audience ("The One" and key personas)
2. Facebook page metrics and recent organic posts (with engagement data)
3. Instagram account metrics, recent posts (with engagement data), and audience demographics

Your job is to analyze whether the organic content is resonating with the described personas, based on:
- AUDIENCE RECEPTION: What does the engagement data reveal about who is actually responding, and does that match the persona?
- CONTENT PERFORMANCE: Which content types (video, photo, carousel, reel) and themes are performing best vs. worst, and why?
- MESSAGING ALIGNMENT: Does the body of content reflect the brand's overall voice, values, and personality as described in the persona document? Judge this holistically across all posts — look for whether the brand's character comes through consistently, not whether every individual post checks every guideline box. Brand guidelines describe a direction and a spirit; treat them as a compass, not a checklist. A post that touches on a topic the guidelines flag as something to handle carefully is not automatically a miss — what matters is whether the overall feeling of that post is consistent with where the brand is trying to go. Reserve low scores for content that is clearly and repeatedly off-brand in tone, values, or audience fit.

CRITICAL SCORING PRINCIPLE — MOMENTUM MATTERS:
Three momentum signals are provided for each organic metric. Apply this priority order:

1. YEAR-OVER-YEAR / YoY (HIGHEST PRIORITY): Current period vs the same window one year ago. This is the most reliable signal because it controls for seasonal patterns (holidays, annual events, school calendars). Weight YoY heavily — a 20%+ YoY improvement should meaningfully boost scores (15–25 points) even if absolute numbers are modest.

2. PERIOD-OVER-PERIOD (SECONDARY): Current period total vs the immediately preceding equivalent period. Useful for detecting recent momentum shifts, but treat it with caution when it may be inflated or deflated by holidays or one-off events in either window. If prior-period and YoY diverge significantly (one shows growth, the other decline), explicitly note the likely seasonal explanation and weight YoY more heavily.

3. WITHIN-PERIOD ACCELERATION (TERTIARY): First-half vs second-half of the current period. Useful as a confirmatory signal only. Weight it least.

When all three point the same direction, that is strong evidence. When they conflict, YoY dominates.

IMPORTANT DATA CAVEAT: Instagram audience demographics (age, gender, location) are always LIFETIME aggregates, not date-range specific. They represent all followers ever accumulated. Do not interpret demographic shifts from these numbers as recent changes; treat them as a snapshot of the cumulative follower base. All other metrics respect the selected date range.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:

{
  "score": <number 0-100>,
  "grade": <"A"|"B"|"C"|"D"|"F">,
  "summary": <string: 2-3 sentence diagnosis of how well the organic content is landing with the target persona>,
  "dimensions": {
    "audienceReception": {
      "score": <0-100>,
      "finding": <string: what the engagement data reveals about who is actually responding and whether that matches the persona>
    },
    "contentPerformance": {
      "score": <0-100>,
      "finding": <string: which content types and themes are performing best vs. worst and why>
    },
    "messagingAlignment": {
      "score": <0-100>,
      "finding": <string: holistic assessment of whether the brand's voice and values come through across the body of content — note patterns, not isolated posts>
    }
  },
  "topPerformers": [
    {
      "type": <"facebook_post"|"instagram_post">,
      "identifier": <string: post caption snippet with date, e.g. "\"Why I Love Stone Creek: Meet Sarah!\" (Apr 14, 2025)">,
      "metric": <string: e.g. "4.2% engagement rate">,
      "whyItLands": <string: specific connection to the persona's motivations or communication preferences>
    }
  ],
  "bottomPerformers": [
    {
      "type": <"facebook_post"|"instagram_post">,
      "identifier": <string: post caption snippet with date, e.g. "\"Join us for our Good Friday service…\" (Mar 29, 2025)">,
      "metric": <string: e.g. "0.3% engagement rate">,
      "whyItMisses": <string: specific mismatch with the persona's needs or known turn-offs>
    }
  ],
  "recommendations": [
    {
      "type": <"post"|"creative"|"messaging">,
      "target": <string: specific post type, platform, or content theme>,
      "currentState": <string: what it currently looks like or says>,
      "suggestion": <string: the specific change — e.g. exact new caption approach, new content format, new posting cadence>,
      "reasoning": <string: why this change will resonate better with the persona>,
      "impact": <"HIGH"|"MEDIUM"|"LOW">
    }
  ],
  "personaFit": {
    "primaryPersonaName": <string: e.g. "Gainesville Grace">,
    "matchScore": <0-100>,
    "strengths": [<string>],
    "gaps": [<string>]
  }
}

Grades: A=85+, B=70-84, C=55-69, D=40-54, F=<40
Top/bottom performers: 3 each max. Focus only on organic posts (no ads).
Recommendations: 5-8, sorted by impact (HIGH first). Be specific — actual caption rewrites, actual content formats, actual posting strategies. Not vague advice.
CRITICAL: In topPerformers, bottomPerformers, recommendations, and personaFit, ONLY reference specific posts that appear in the data provided above. Do not cite, invent, or recall any post, story, or reel that is not explicitly listed in the input data for this date window.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodTrend(insights: PageInsightValue[], metricName: string): string {
  const item = insights.find((i) => i.name === metricName);
  if (!item) return "no data";
  const vals = item.values
    .filter((v) => typeof v.value === "number")
    .map((v) => v.value as number);
  if (vals.length < 4) return "insufficient data points";
  const mid = Math.floor(vals.length / 2);
  const firstAvg = vals.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondAvg = vals.slice(mid).reduce((a, b) => a + b, 0) / (vals.length - mid);
  if (firstAvg === 0) return secondAvg > 0 ? "▲ new growth (was zero)" : "flat at zero";
  const pct = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
  const dir = pct >= 0 ? "▲" : "▼";
  return `${dir}${Math.abs(pct)}% (first-half avg ${firstAvg.toFixed(0)} → second-half avg ${secondAvg.toFixed(0)})`;
}

function metricTrend(current: string | undefined, previous: string | undefined, label: string): string {
  const c = parseFloat(current ?? "0");
  const p = parseFloat(previous ?? "0");
  if (p === 0) return `${label}: ${c.toFixed(2)} (no prior period)`;
  const pct = Math.round(((c - p) / p) * 100);
  const dir = pct >= 0 ? "▲" : "▼";
  return `${label}: ${c.toFixed(2)} (${dir}${Math.abs(pct)}% vs prior period: ${p.toFixed(2)})`;
}

function getInsightValue(insights: PageInsightValue[], name: string): string {
  const item = insights.find((i) => i.name === name);
  if (!item) return "N/A";
  const vals = item.values ?? [];
  if (!vals.length) return "N/A";
  const last = vals[vals.length - 1]?.value;
  if (typeof last === "number") return last.toLocaleString();
  if (typeof last === "object") {
    return Object.entries(last)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return "N/A";
}

function sumInsight(insights: PageInsightValue[], name: string): number {
  const item = insights.find((i) => i.name === name);
  if (!item) return 0;
  return item.values.reduce((s, v) => s + (typeof v.value === "number" ? v.value : 0), 0);
}

function organicMetricRow(
  label: string,
  current: number,
  previous: number | null,
  yoy: number | null
): string {
  const fmt = (n: number) => n.toLocaleString();
  const pct = (curr: number, base: number) => {
    const p = Math.round(((curr - base) / base) * 100);
    return `${p >= 0 ? "▲" : "▼"}${Math.abs(p)}%`;
  };
  const prevPart = previous && previous > 0
    ? `${pct(current, previous)} vs prior period (${fmt(previous)})`
    : "no prior period data";
  const yoyPart = yoy && yoy > 0
    ? `${pct(current, yoy)} vs same period last year (${fmt(yoy)})`
    : "no YoY data";
  return `  ${label}: ${fmt(current)} total | ${prevPart} | ${yoyPart}`;
}

function summarizePost(post: PagePost, index: number): string {
  const text = post.message || post.story || "(no caption)";
  const snippet = text.slice(0, 120) + (text.length > 120 ? "…" : "");
  const metrics: string[] = [];
  if (post.insights?.data) {
    for (const m of post.insights.data) {
      const val = m.values?.[0]?.value;
      if (typeof val === "number") metrics.push(`${m.name}: ${val.toLocaleString()}`);
    }
  }
  const type = post.attachments?.data?.[0]?.media_type ?? "text";
  const date = new Date(post.created_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `  FB Post ${index + 1} [${type}, ${date}]: "${snippet}" | ${metrics.join(", ") || "no metrics"}`;
}

function summarizeIgPost(post: IgMedia, index: number): string {
  const text = post.caption || "(no caption)";
  const snippet = text.slice(0, 120) + (text.length > 120 ? "…" : "");
  const metrics: string[] = [];
  if (post.insights?.data) {
    for (const m of post.insights.data) {
      const val = m.values?.[0]?.value;
      if (typeof val === "number") metrics.push(`${m.name}: ${val.toLocaleString()}`);
    }
  }
  if (post.like_count != null) metrics.push(`likes: ${post.like_count}`);
  if (post.comments_count != null) metrics.push(`comments: ${post.comments_count}`);
  // media_product_type distinguishes Reels (REELS) from regular feed video (FEED)
  const typeLabel = post.media_product_type ?? post.media_type;
  const date = new Date(post.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `  IG Post ${index + 1} [${typeLabel}, ${date}]: "${snippet}" | ${metrics.join(", ") || "no metrics"}`;
}

function summarizeAdCreative(ad: MetaAd, index: number): string {
  const spec = ad.creative?.object_story_spec;
  const body =
    ad.creative?.body ||
    spec?.link_data?.message ||
    spec?.video_data?.message ||
    spec?.photo_data?.caption ||
    "(no copy)";
  const headline =
    ad.creative?.title ||
    spec?.link_data?.description ||
    spec?.video_data?.title ||
    "";
  const cta =
    ad.creative?.call_to_action_type ||
    spec?.link_data?.call_to_action?.type ||
    spec?.video_data?.call_to_action?.type ||
    "";
  const format = ad.creative?.object_type || "unknown format";
  const date = new Date(ad.created_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const parts: string[] = [`[${format}, ${ad.effective_status}, created ${date}]`];
  parts.push(`Copy: "${body.slice(0, 250)}${body.length > 250 ? "…" : ""}"`);
  if (headline) parts.push(`Headline: "${headline.slice(0, 150)}"`);
  if (cta) parts.push(`CTA: ${cta.replace(/_/g, " ")}`);

  return `  Ad ${index + 1} ${parts.join(" | ")}`;
}

// ─── Message Builders ─────────────────────────────────────────────────────────

export function buildAdsResonanceMessage(
  auditDoc: string,
  adData: MetaFullData,
  previousInsights?: MetaInsights
): string {
  const sections: string[] = [];

  sections.push(`## PERSONA & AUDIENCE AUDIT DOCUMENT\n\n${auditDoc}`);

  const windowSince = adData.dateRange?.since ?? "unknown";
  const windowUntil = adData.dateRange?.until ?? "unknown";
  sections.push(`## ANALYSIS DATE WINDOW\n${windowSince} to ${windowUntil}\n\nALL ad-level data below reflects this window. If an ad is not listed here, it is outside this range and MUST NOT be referenced.`);

  const adSections: string[] = [];
  const activeCampaigns = adData.campaigns.filter((c) => c.effective_status === "ACTIVE" || c.effective_status === "PAUSED");
  const objectives = [...new Set(activeCampaigns.map((c) => c.objective))];
  adSections.push(`Active/Paused Campaigns: ${activeCampaigns.length} | Objectives: ${objectives.join(", ")}`);

  if (adData.accountInsights) {
    const curr = adData.accountInsights;
    const prev = previousInsights;
    adSections.push(`\nAccount-Level Performance (current period vs prior equivalent period):`);
    adSections.push(`  Spend: $${parseFloat(curr.spend ?? "0").toLocaleString()}${prev ? ` (prior: $${parseFloat(prev.spend ?? "0").toLocaleString()})` : ""}`);

    const currCtr = parseFloat(curr.ctr ?? "0") * 100;
    const prevCtr = prev ? parseFloat(prev.ctr ?? "0") * 100 : undefined;
    adSections.push(`  ${metricTrend(currCtr.toFixed(4), prevCtr?.toFixed(4), "CTR %")}`);

    adSections.push(`  ${metricTrend(curr.cpm, prev?.cpm, "CPM $")}`);
    adSections.push(`  ${metricTrend(curr.cpc, prev?.cpc, "CPC $")}`);
    adSections.push(`  ${metricTrend(curr.frequency, prev?.frequency, "Frequency")}`);

    const currRoas = curr.purchase_roas?.[0]?.value;
    const prevRoas = prev?.purchase_roas?.[0]?.value;
    if (currRoas) adSections.push(`  ${metricTrend(currRoas, prevRoas, "Purchase ROAS")}`);
  }

  if (adData.campaignInsights.length) {
    adSections.push("\nPerformance by Objective:");
    adData.campaignInsights
      .sort((a, b) => parseFloat(b.spend ?? "0") - parseFloat(a.spend ?? "0"))
      .slice(0, 5)
      .forEach((c) => {
        const ctr = c.ctr ? (parseFloat(c.ctr) * 100).toFixed(2) + "%" : "N/A";
        adSections.push(`  • ${c.objective} | Spend: $${parseFloat(c.spend ?? "0").toFixed(0)} | CTR: ${ctr} | CPM: $${parseFloat(c.cpm ?? "0").toFixed(2)}`);
      });
  }

  const activeAds = adData.ads.filter((a) => a.effective_status === "ACTIVE" || a.effective_status === "PAUSED");
  if (activeAds.length) {
    adSections.push(`\nAd Creative & Copy — ${windowSince} to ${windowUntil} (${activeAds.length} active/paused):`);
    activeAds.slice(0, 15).forEach((a, i) => adSections.push(summarizeAdCreative(a, i)));
  } else {
    adSections.push(`\nAd Creative & Copy — ${windowSince} to ${windowUntil}: NONE — no active or paused ads in this window. Do not cite any specific ads in topPerformers, bottomPerformers, or recommendations.`);
  }

  sections.push(`## PAID ADS DATA\n${adSections.join("\n")}`);
  sections.push(`Please analyze how well this account's paid ads are resonating with the described personas. Where period-over-period trend data is shown, weight it heavily — strong positive momentum should significantly boost scores even if absolute levels are modest. Return the complete JSON ads resonance analysis.`);

  return sections.join("\n\n");
}

export function buildOrganicResonanceMessage(auditDoc: string, organic: OrganicData, previousOrganic?: OrganicPeriodInsights, yoyOrganic?: OrganicPeriodInsights): string {
  const sections: string[] = [];

  sections.push(`## PERSONA & AUDIENCE AUDIT DOCUMENT\n\n${auditDoc}`);

  const windowSince = organic.dateRange?.since ?? "unknown";
  const windowUntil = organic.dateRange?.until ?? "unknown";
  sections.push(`## ANALYSIS DATE WINDOW\n${windowSince} to ${windowUntil}\n\nALL post-level data below has been pre-filtered to this window. If a post is not listed here, it is outside this range and MUST NOT be referenced.`);

  // Facebook organic
  const fbSections: string[] = [];
  if (organic.page) {
    fbSections.push(`Page: ${organic.page.name} | Followers: ${organic.page.followers_count?.toLocaleString() ?? "N/A"} | Likes: ${organic.page.fan_count?.toLocaleString() ?? "N/A"}`);
  }
  if (organic.pageInsights.length) {
    fbSections.push(`Page Metrics (${windowSince} to ${windowUntil}):`);
    const fbReach = sumInsight(organic.pageInsights, "page_impressions_unique");
    const fbEngagements = sumInsight(organic.pageInsights, "page_post_engagements");
    fbSections.push(organicMetricRow("Reach (unique)", fbReach, previousOrganic?.fbReach ?? null, yoyOrganic?.fbReach ?? null));
    fbSections.push(organicMetricRow("Post Engagements", fbEngagements, previousOrganic?.fbEngagements ?? null, yoyOrganic?.fbEngagements ?? null));
    fbSections.push("  Within-period acceleration (first half vs second half — tertiary signal):");
    fbSections.push(`    Reach: ${periodTrend(organic.pageInsights, "page_impressions_unique")}`);
    fbSections.push(`    Engagements: ${periodTrend(organic.pageInsights, "page_post_engagements")}`);
  }
  if (organic.pagePosts.length) {
    fbSections.push(`\nPosts published ${windowSince} to ${windowUntil} (${organic.pagePosts.length} total):`);
    organic.pagePosts.forEach((p, i) => fbSections.push(summarizePost(p, i)));
  } else {
    fbSections.push(`\nPosts published ${windowSince} to ${windowUntil}: NONE — the page published no Facebook posts in this date window. Do not cite any Facebook posts in topPerformers, bottomPerformers, or recommendations.`);
  }
  sections.push(`## FACEBOOK ORGANIC DATA\n${fbSections.join("\n")}`);

  // Instagram organic
  const igSections: string[] = [];
  if (organic.igInsights.length) {
    igSections.push("Instagram Metrics (last 30 days — Meta API hard limit for reach):");
    const igReach = sumInsight(organic.igInsights, "reach");
    const igFollowers = sumInsight(organic.igInsights, "follower_count");
    igSections.push(organicMetricRow("Reach", igReach, previousOrganic?.igReach ?? null, yoyOrganic?.igReach ?? null));
    igSections.push(organicMetricRow("New Followers", igFollowers, previousOrganic?.igFollowerGrowth ?? null, yoyOrganic?.igFollowerGrowth ?? null));
    igSections.push("  Within-period acceleration (first half vs second half — tertiary signal):");
    igSections.push(`    Reach: ${periodTrend(organic.igInsights, "reach")}`);
    igSections.push(`    New followers: ${periodTrend(organic.igInsights, "follower_count")}`);
  }
  if (organic.igAudienceDemographics.length) {
    igSections.push("\nAudience Demographics (LIFETIME — represents all-time follower base, NOT this date range):");
    for (const dim of organic.igAudienceDemographics) {
      const last = dim.values?.[dim.values.length - 1]?.value;
      if (typeof last === "object" && last !== null) {
        const top = Object.entries(last)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 8)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        igSections.push(`  ${dim.name}: ${top}`);
      }
    }
  }
  if (organic.igMedia.length) {
    igSections.push(`\nPosts published ${windowSince} to ${windowUntil} (${organic.igMedia.length} total):`);
    organic.igMedia.forEach((p, i) => igSections.push(summarizeIgPost(p, i)));
  } else {
    igSections.push(`\nPosts published ${windowSince} to ${windowUntil}: NONE — the account published no Instagram posts in this date window. Do not cite any Instagram posts in topPerformers, bottomPerformers, or recommendations.`);
  }
  sections.push(`## INSTAGRAM ORGANIC DATA\n${igSections.join("\n")}`);

  sections.push(`Please analyze how well this account's organic Facebook and Instagram content is resonating with the described personas. Where trend data shows improvement across the period, weight it heavily — a brand gaining momentum is building resonance even if starting from a modest base. Return the complete JSON organic resonance analysis.`);

  return sections.join("\n\n");
}
