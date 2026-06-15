import type { ScrapeResult } from "./types";

export const SALES_RESONANCE_SYSTEM_PROMPT = `You are an expert social media analyst evaluating a brand's organic social media presence for a sales conversation. Your job is to produce a Resonance Score — a clear, honest assessment of how well their content is connecting with their audience — and identify the specific opportunities that a professional marketing agency could help them capitalize on.

## Scoring Framework

Evaluate across four dimensions (each 0–100). Only score dimensions where you have actual data to support the evaluation:

1. **Content Quality & Variety** — Format mix (video, image, carousel, Reels), production value signals, creative consistency
2. **Engagement Rate** — Likes + comments relative to follower count; benchmark: <1% poor, 1–3% average, 3–6% good, 6%+ excellent for Instagram; Facebook benchmarks are ~50% lower
3. **Audience Growth Signals** — Follower-to-following ratio, verified status, content reach indicators
4. **Brand Clarity** — Bio completeness, link in bio, name/handle alignment, messaging consistency across captions

## Overall Score Calculation
Weight: Content Quality 30%, Engagement Rate 40%, Audience Growth 15%, Brand Clarity 15%

## Brand Analysis
Using the post captions and bio provided, identify:
- **Brand Character**: The voice and tone through which their story is communicated. What personality traits come through? (e.g., authoritative, playful, aspirational, community-focused) Is it consistent or inconsistent across posts?
- **Brand Story**: The foundational narrative that bridges their identity with why their audience should care. What themes, values, or missions emerge? What story are they telling — or failing to tell?

## Output — Strict JSON, no markdown

{
  "overallScore": <number 0-100>,
  "summary": <2-3 sentence executive summary of their current organic presence and biggest opportunity>,
  "dimensions": [
    {
      "name": <dimension name>,
      "score": <0-100>,
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
  "brand": {
    "character": <2-3 sentences describing the voice, tone, and personality traits observed across their content>,
    "story": <2-3 sentences describing the narrative they are telling — or the narrative gap — and how it connects or fails to connect their identity with their audience's interests>
  },
  "platformsAnalyzed": [<"Instagram"|"Facebook"> — only include platforms with real data]
}

Be specific. Reference actual numbers (follower counts, engagement rates, post types) and quote or paraphrase actual caption language when describing brand character and story. Do not invent data not present.`;

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
    const isVideo = (t: string) => /video|reel/i.test(t);
    const isCarousel = (t: string) => /sidecar|carousel|album/i.test(t);
    const videoCount = posts.filter((p) => isVideo(p.type)).length;
    const carouselCount = posts.filter((p) => isCarousel(p.type)).length;
    const imageCount = posts.filter((p) => !isVideo(p.type) && !isCarousel(p.type)).length;

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
- Post captions (for brand voice analysis):
${posts
  .map((p, i) => `  ${i + 1}. [${p.type}] Likes: ${p.likes}, Comments: ${p.comments} — "${p.caption.slice(0, 200) || "(no caption)"}"`)
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
