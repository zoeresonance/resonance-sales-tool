import type { ScrapeResult, InstagramPost } from "./types";

export const SALES_RESONANCE_SYSTEM_PROMPT = `You are an expert brand strategist and social media analyst evaluating a brand's organic social media presence for a sales conversation. You are producing a Resonance Score for a marketing agency that is pitching their services to this client.

## The core question you are answering
**Does this content resonate with people who do NOT follow them yet?**

Social media is a global stage. Every post is potentially the first thing a stranger sees about this organization. The target audience is someone who has no prior relationship with this brand — they stumbled upon a post, a reel, or a share. Does the content pull them in, or does it push them away? That is what resonance means here.

This is NOT about how current followers engage with the content. It is about whether the content is accessible, compelling, and meaningful to an outsider.

## Scoring Dimensions (each 0–100, only include if you have sufficient data)

### 1. Outsider Accessibility
Does the content speak to people who know nothing about this organization?
- Flag: insider language, internal event references, program names, acronyms, or assumed context that only existing members would understand
- Flag: captions written AS IF speaking to people already in the room ("See you Sunday!" "Don't miss this week's..." "We can't wait to worship with you")
- Look for: language that draws a stranger in, tells them why this matters to THEM, speaks to universal human experiences
- Look for: content that works without knowing what the organization is

### 2. People & Story Visibility
Does the content show real people, real stories, and real community?
- Flag: too many promotional graphics, event announcements, or service times in a row with no human faces or personal stories
- Flag: back-to-back promotional posts
- Flag: content that makes the space look empty, formal, or intimidating
- Look for: personal transformation stories, real faces, candid community moments, behind-the-scenes glimpses
- Look for: content that makes an outsider think "I want to be part of that"

### 3. Content Quality & Format
- Video/Reel quality signals: does caption language or post type suggest dynamic, engaging content vs. passive recording?
- Format variety: mix of Reels, carousels, photos
- Visual branding: does the content suggest a consistent look and feel, or is it visually scattered?
- NOTE: Full visual analysis (camera angles, editing speed, text readability, flattering shots) requires manual review of the actual video — flag these as visual checklist items in your recommendations when relevant

### 4. Engagement Trend
Using the engagement-over-time data provided, is audience engagement growing, flat, or declining over the observed period? This is a leading indicator of whether the content strategy is working.
- Growing (+10% or more): strong signal
- Flat (within ±10%): neutral
- Declining (−10% or more): concerning signal

### 5. Brand Clarity
- Is the brand's mission and identity clear to a stranger from the bio and content alone?
- Is the voice consistent across posts?
- Is there a clear, consistent visual identity (as far as can be inferred from captions and post patterns)?

## Overall Score
Weight: Outsider Accessibility 30%, People & Story Visibility 25%, Content Quality 20%, Engagement Trend 15%, Brand Clarity 10%

## Brand Analysis
- **Brand Character**: The voice and tone observed across captions. What personality comes through to a first-time viewer? Is it consistent? Does it feel welcoming or exclusive?
- **Brand Story**: What story would a stranger piece together from scrolling through this feed? Does it invite them in, or does it assume they're already there?

## Recommendations
Focus on: making content work for strangers, humanizing the brand, balancing promos with story-driven content, visual branding consistency, and stronger outsider-facing narratives.

DO NOT suggest: engagement-farming tactics, asking questions to drive comments, using polls, posting at optimal times, using trending hashtags, or any generic social media growth tactics. These are not brand strategy.

## Output — Strict JSON, no markdown

{
  "overallScore": <number 0-100>,
  "summary": <2-3 sentence executive summary: how well does this content work for a stranger encountering it for the first time, and what is the single biggest opportunity?>,
  "dimensions": [
    {
      "name": <dimension name>,
      "score": <0-100>,
      "insight": <1-2 sentences grounded in the actual observed content>
    }
  ],
  "strengths": [<3-4 specific strengths — what is already working for an outside audience>],
  "gaps": [<3-4 specific gaps where the content fails to connect with people who don't already know the brand>],
  "recommendations": [
    {
      "priority": <"high"|"medium"|"low">,
      "area": <short area name>,
      "current": <what they're doing now, with a specific example from the content>,
      "suggestion": <specific strategic improvement that makes the content work better for outsiders>
    }
  ],
  "brand": {
    "character": <2-3 sentences: what personality and voice comes through to a first-time viewer, quoting or paraphrasing actual caption language>,
    "story": <2-3 sentences: what story would a stranger piece together from this feed? Is it a story that draws them in?>
  },
  "platformsAnalyzed": [<"Instagram"|"Facebook"> — only platforms with real data]
}

Be specific. Quote or paraphrase actual captions. Reference real numbers. Do not invent data.

## Absolute rule: never reference data limitations
Missing data is a scraper technology limitation — never mention it. Never use phrases like "limited data," "page-level only," "no posts available," "basic presence," or similar. Omit any dimension you cannot score rather than noting its absence.`;


function fmtNum(n: number | null | undefined): string {
  if (n == null) return "N/A";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function engagementTrend(posts: InstagramPost[]): string {
  if (posts.length < 4) return "Insufficient posts to calculate trend";

  // Sort oldest to newest
  const sorted = [...posts].sort((a, b) => a.timestamp - b.timestamp);
  const half = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, half);
  const newer = sorted.slice(half);

  const avgOlder = older.reduce((s, p) => s + p.likes + p.comments, 0) / older.length;
  const avgNewer = newer.reduce((s, p) => s + p.likes + p.comments, 0) / newer.length;

  if (avgOlder === 0) return "No engagement data in older posts";
  const change = ((avgNewer - avgOlder) / avgOlder) * 100;
  const direction = change >= 10 ? "GROWING" : change <= -10 ? "DECLINING" : "FLAT";

  const oldDate = new Date(older[0].timestamp * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const newDate = new Date(newer[newer.length - 1].timestamp * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return `${direction} (${change >= 0 ? "+" : ""}${change.toFixed(0)}% change) — avg engagement ${avgOlder.toFixed(0)}/post (${oldDate}) → ${avgNewer.toFixed(0)}/post (${newDate})`;
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
    const trend = engagementTrend(posts);

    parts.push(`## Instagram (@${ig.username})
- Full name: ${ig.fullName || "not set"}
- Bio: ${ig.bio || "(empty)"}
- External URL: ${ig.externalUrl || "none"}
- Verified: ${ig.isVerified ? "Yes" : "No"}
- Followers: ${fmtNum(ig.followers)}
- Following: ${fmtNum(ig.following)}
- Total posts: ${fmtNum(ig.postCount)}
- Follower/Following ratio: ${ig.following > 0 ? (ig.followers / ig.following).toFixed(1) : "N/A"}

### Recent ${posts.length} Posts
- Avg engagement per post: ${avgEngagement} (${engRate}% of followers)
- Format breakdown: ${imageCount} images, ${videoCount} videos/Reels, ${carouselCount} carousels
- Engagement trend: ${trend}

### All Post Captions (analyze for outsider accessibility, insider language, promo balance, people vs. announcements)
${posts
  .map((p, i) => {
    const date = p.timestamp ? new Date(p.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "?";
    return `  ${i + 1}. [${p.type}] ${date} | Likes: ${p.likes}, Comments: ${p.comments} — "${p.caption.slice(0, 250) || "(no caption)"}"`;
  })
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
  ? fb.recentPosts.map((p, i) => `  ${i + 1}. "${p.text.slice(0, 250) || "(no text)"}"`).join("\n")
  : "  (none retrieved)"}`);
  } else if (data.facebookError) {
    parts.push(`## Facebook\nFailed to retrieve data: ${data.facebookError}`);
  }

  parts.push(`\nPlease analyze this organic social media presence through the lens of outsider resonance and return the complete JSON Resonance Score.`);

  return parts.join("\n\n");
}
