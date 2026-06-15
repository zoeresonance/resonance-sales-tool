import type { InstagramData, FacebookData } from "./types";

function extractInstagramUsername(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[0] ?? null;
  } catch {
    const clean = url.replace(/^@/, "").trim();
    return clean || null;
  }
}

function normalizeFacebookUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `https://www.facebook.com/${url.replace(/^@/, "").trim()}`;
}

// Apify Instagram Profile Scraper
export async function scrapeInstagram(url: string): Promise<InstagramData> {
  const username = extractInstagramUsername(url);
  if (!username) throw new Error("Could not extract Instagram username from URL");

  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured");

  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}&timeout=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], resultsLimit: 12 }),
    }
  );

  if (!res.ok) throw new Error(`Apify Instagram scraper returned HTTP ${res.status}`);

  const items: Record<string, unknown>[] = await res.json();
  const profile = items[0];
  if (!profile) throw new Error("Instagram profile not found or is private");

  type ApifyPost = {
    likesCount?: number;
    commentsCount?: number;
    caption?: string;
    type?: string;
    timestamp?: string;
  };

  const latestPosts: ApifyPost[] = (profile.latestPosts as ApifyPost[]) ?? [];

  return {
    username: (profile.username as string) ?? username,
    fullName: (profile.fullName as string) ?? "",
    bio: (profile.biography as string) ?? "",
    followers: (profile.followersCount as number) ?? 0,
    following: (profile.followsCount as number) ?? 0,
    postCount: (profile.postsCount as number) ?? 0,
    isVerified: (profile.verified as boolean) ?? false,
    externalUrl: (profile.externalUrl as string) ?? null,
    recentPosts: latestPosts.slice(0, 12).map((p) => ({
      likes: p.likesCount ?? 0,
      comments: p.commentsCount ?? 0,
      caption: p.caption?.slice(0, 300) ?? "",
      type: p.type ?? "Image",
      timestamp: p.timestamp ? Math.floor(new Date(p.timestamp).getTime() / 1000) : 0,
    })),
  };
}

// Apify Facebook — runs Pages Scraper (metadata) + Posts Scraper (content) in parallel
export async function scrapeFacebook(url: string): Promise<FacebookData> {
  const fbUrl = normalizeFacebookUrl(url);

  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured");

  const apifyFetch = (actor: string, body: unknown) =>
    fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=120`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

  const [pageRes, postsRes] = await Promise.all([
    apifyFetch("apify~facebook-pages-scraper", { startUrls: [{ url: fbUrl }] }),
    apifyFetch("apify~facebook-posts-scraper", { startUrls: [{ url: fbUrl }], resultsLimit: 10 }),
  ]);

  // Page metadata (required — throw if this fails)
  if (!pageRes.ok) {
    const body = await pageRes.text().catch(() => "");
    throw new Error(`Facebook pages scraper HTTP ${pageRes.status}: ${body.slice(0, 200)}`);
  }
  const pageItems: Record<string, unknown>[] = await pageRes.json();
  console.log(`[Facebook pages] ${pageItems.length} item(s). Keys:`, pageItems[0] ? Object.keys(pageItems[0]).join(", ") : "none");
  const page = pageItems[0];
  if (!page) throw new Error("Facebook page not found or is private");

  // Posts (best-effort — log but don't throw on failure)
  type ApifyFBPost = { text?: string; postText?: string; time?: string; timestamp?: string; likesCount?: number; commentsCount?: number };
  let posts: ApifyFBPost[] = [];
  if (postsRes.ok) {
    const postItems: ApifyFBPost[] = await postsRes.json();
    console.log(`[Facebook posts] ${postItems.length} post(s). Sample keys:`, postItems[0] ? Object.keys(postItems[0]).join(", ") : "none");
    posts = postItems;
  } else {
    console.warn(`[Facebook posts] scraper returned HTTP ${postsRes.status}`);
  }

  return {
    name: (page.title as string) ?? (page.pageName as string) ?? url,
    followers: (page.followers as number) ?? null,
    likes: (page.likes as number) ?? null,
    about: (page.intro as string) ?? (page.info as string) ?? null,
    recentPosts: posts.slice(0, 10).map((p) => ({
      text: (p.text ?? p.postText ?? "").slice(0, 300),
      timestamp: p.time ?? p.timestamp,
    })),
  };
}
