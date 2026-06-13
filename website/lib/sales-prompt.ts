import type { ScrapeResult } from "./types";

export const SALES_RESONANCE_SYSTEM_PROMPT = `You are an expert social media analyst evaluating a brand's organic social media presence for a sales conversation. Your job is to produce a Resonance Score — a clear, honest assessment of how well their content is connecting with their audience — and identify the specific opportunities that a professional marketing agency could help them capitalize on.

## Scoring Framework

Evaluate across five dimensions (each 0–100):

1. **Content Quality & Variety** — Format mix (video, image, carousel, Reels), production value signals, creative consistency
2. **Engagement Rate** — Likes + comments relative to follower count; benchmark: <1% poor, 1–3% average, 3–6% good, 6%+ excellent for Instagram; Facebook benchmarks are ~50% lower
3. **Posting Consistency** — Frequency and regularity of posts; benchmark: 3–5x/week Instagram, 3–5x/week Facebook
4. **Audience Growth Signals** — Follower-to-following ratio, verified status, content reach indicators
5. **Brand Clarity** — Bio completeness, link in bio, name/handle alignment, messaging consistency across captions

## Overall Score Calculation
Weight: Content Quality 25%, Engagement Rate 30%, Posting Consistency 20%, Audience Growth 15%, Brand Clarity 10%

## Grading
90–100: A+ | 80–89: A | 70–79: B | 60–69: C | 50–59: D | <50: F

## Output — Strict JSON, no markdown

{
  "overallScore": <number 0-100>,
  "grade": <"A+"|"A"|"B"|"C"|"D"|"F">,
  "summary": <2-3 sentence executive summary of their current organic presence and biggest opportunity>,
  "dimensions": [
    {
      "name": <dimension name>,
      "score": <0-100>,
      "grade": <letter grade>,
      "insight": <1-2 sentences specific to their actual data>
    }
  ],
  "strengths": [<3-4 specific observed strengths>],
  "gaps": [<3-4 specific gaps or missed opportunities>],
  "recommendations": [
    {
      "priority": <"high"|"medium"|"low">,
      "area": <short area name>,
      "current": <what they're doing now>,
      "suggestion": <specific, actionable improvement>
    }
  ],
  "platformsAnalyzed": [<"Instagram"|"Facebook"> — only include platforms with real data]
}

Be specific. Reference actual numbers from the data (follower counts, engagement rates, post types). Do not invent data not present. If a platform returned no data, exclude it from platformsAnalyzed and note it in the summary.`;

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "N/A";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function buildSalesPrompt(data: ScrapeResult): string {
  const parts: string[] = [];

  if (data.instagram) {
    const ig = data.instagram;
    const posts = ig.recentPosts;
    const totalEngagement = posts.reduce((s, p) => s + p.likes + p.comments, 0);
    const avgEngagement = posts.length ? Math.round(totalEngagement / posts.length) : 0;
    const engRate = ig.followers > 0 ? ((avgEngagement / ig.followers) * 100).toFixed(2) : "N/A";
    const videoCount = posts.filter((p) => p.type === "GraphVideo" || p.type === "XDTGraphVideo").length;
    const carouselCount = posts.filter((p) => p.type === "GraphSidecar" || p.type === "XDTGraphSidecar").length;
    const imageCount = posts.length - videoCount - carouselCount;

    parts.push(`## Instagram (@${ig.username})
- Full name: ${ig.fullName || "not set"}
- Bio: ${ig.bio || "(empty)"}
- External URL: ${ig.externalUrl || "none"}
- Verified: ${ig.isVerified ? "Yes" : "No"}
- Followers: ${fmtNum(ig.followers)}
- Following: ${fmtNum(ig.following)}
- Total posts: ${fmtNum(ig.postCount)}
- Follower/Following ratio: ${ig.following > 0 ? (ig.followers / ig.following).toFixed(1) : "N/A"}

### Recent ${posts.length} Posts Analysis
- Avg likes: ${posts.length ? Math.round(posts.reduce((s, p) => s + p.likes, 0) / posts.length) : "N/A"}
- Avg comments: ${posts.length ? Math.round(posts.reduce((s, p) => s + p.comments, 0) / posts.length) : "N/A"}
- Avg engagement per post: ${avgEngagement}
- Engagement rate (avg engagement / followers): ${engRate}%
- Format breakdown: ${imageCount} images, ${videoCount} videos/Reels, ${carouselCount} carousels
- Sample captions:
${posts
  .slice(0, 5)
  .map((p, i) => `  ${i + 1}. [${p.type}] Likes: ${p.likes}, Comments: ${p.comments} — "${p.caption.slice(0, 150) || "(no caption)"}"`)
  .join("\n")}`);
  } else if (data.instagramError) {
    parts.push(`## Instagram\nFailed to retrieve data: ${data.instagramError}`);
  }

  if (data.facebook) {
    const fb = data.facebook;
    parts.push(`## Facebook (${fb.name})
- Page likes: ${fmtNum(fb.likes)}
- Page followers: ${fmtNum(fb.followers)}
- About: ${fb.about || "(not available)"}
- Recent post snippets: ${fb.recentPosts.length ? fb.recentPosts.map((p) => `"${p.text.slice(0, 150)}"`).join(" | ") : "none extracted"}`);
  } else if (data.facebookError) {
    parts.push(`## Facebook\nFailed to retrieve data: ${data.facebookError}`);
  }

  parts.push(`\nPlease analyze this organic social media presence and return a complete JSON Resonance Score as specified in the system prompt.`);

  return parts.join("\n\n");
}
