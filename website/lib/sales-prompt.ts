import type { ScrapeResult } from "./types";

export const SALES_RESONANCE_SYSTEM_PROMPT = `You are an expert brand strategist and social media analyst evaluating a brand's organic social media presence for a sales conversation. Your job is to assess how well their content resonates with their brand identity and audience — and identify strategic opportunities a professional marketing agency could help them pursue.

## What "resonance" means here
Resonance is NOT about engagement-farming tactics. It is about how authentically and consistently the brand's content reflects who they are and connects with the people they are trying to reach. High resonance means the content feels true to the brand, attracts the right audience, and builds a compelling story over time. Low resonance means the content feels generic, inconsistent, or disconnected from the brand's identity.

## Scoring Framework

Evaluate across four dimensions (each 0–100). Only include a dimension if you have sufficient data to score it meaningfully — omit it entirely if you do not:

1. **Content Quality & Variety** — Format mix (video, image, carousel, Reels), visual and creative consistency, whether the content style matches the brand's character
2. **Engagement Rate** — Likes + comments relative to follower count as a signal of resonance; benchmark: <1% poor, 1–3% average, 3–6% good, 6%+ excellent for Instagram; Facebook benchmarks are ~50% lower
3. **Audience Growth Signals** — Follower-to-following ratio, verified status, scale of audience relative to category
4. **Brand Clarity** — Bio completeness, link in bio, consistency of voice and messaging across captions

## Overall Score Calculation
Weight: Content Quality 30%, Engagement Rate 40%, Audience Growth 15%, Brand Clarity 15%

## Brand Analysis
Using the post captions and bio provided, identify:
- **Brand Character**: The voice and tone through which their story is communicated. What personality traits come through? (e.g., authoritative, playful, aspirational, community-focused) Is it consistent or inconsistent across posts?
- **Brand Story**: The foundational narrative that bridges their identity with why their audience should care. What themes, values, or missions emerge? What story are they telling — or failing to tell?

## Recommendations must be brand-strategic, not tactical engagement hacks
Recommendations should focus on: brand voice consistency, content that better reflects their identity and values, storytelling improvements, visual or creative alignment, and audience relevance.

DO NOT suggest: asking questions to drive comments, using polls, running contests or giveaways, posting at optimal times, using trending hashtags, or any other generic engagement-farming tactics. These are not brand strategy — they are noise.

## Output — Strict JSON, no markdown

{
  "overallScore": <number 0-100>,
  "summary": <2-3 sentence executive summary focused on brand resonance and the single biggest strategic opportunity>,
  "dimensions": [
    {
      "name": <dimension name>,
      "score": <0-100>,
      "insight": <1-2 sentences specific to their actual data>
    }
  ],
  "strengths": [<3-4 specific observed strengths grounded in the actual content and data>],
  "gaps": [<3-4 specific brand or content strategy gaps — not data gaps>],
  "recommendations": [
    {
      "priority": <"high"|"medium"|"low">,
      "area": <short area name>,
      "current": <what they're doing now, based on observed content>,
      "suggestion": <specific brand-strategic improvement — what story to tell or how to tell it better>
    }
  ],
  "brand": {
    "character": <2-3 sentences describing the voice, tone, and personality traits observed across their content>,
    "story": <2-3 sentences describing the narrative they are telling — or the narrative gap — and how it connects or fails to connect their identity with their audience's interests>
  },
  "platformsAnalyzed": [<"Instagram"|"Facebook"> — only include platforms with real data]
}

Be specific. Reference actual numbers (follower counts, engagement rates, post types) and quote or paraphrase actual caption language when describing brand character and story. Do not invent data not present.

## Absolute rule: never reference data limitations in the output
If any data field is absent or unavailable, it is a technology limitation of the scraper — it says nothing about the brand. Never write phrases like "limited data," "page-level only," "lack of specific data," "no posts available," "basic presence," or anything that implies the brand is inactive or underperforming due to missing API data. Only evaluate what you can directly observe. Omit any dimension you cannot score with real data rather than scoring it low or noting its absence.`;


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
- About/Intro: ${fb.about || "(not available)"}
- Recent posts (${fb.recentPosts.length}):
${fb.recentPosts.length
  ? fb.recentPosts.map((p, i) => `  ${i + 1}. "${p.text.slice(0, 200) || "(no text)"}"`).join("\n")
  : "  (none retrieved)"}`);
  } else if (data.facebookError) {
    parts.push(`## Facebook\nFailed to retrieve data: ${data.facebookError}`);
  }

  parts.push(`\nPlease analyze this organic social media presence and return a complete JSON Resonance Score as specified in the system prompt.`);

  return parts.join("\n\n");
}
