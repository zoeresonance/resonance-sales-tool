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

// Apify Facebook Pages Scraper
export async function scrapeFacebook(url: string): Promise<FacebookData> {
  const fbUrl = normalizeFacebookUrl(url);

  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured");

  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~facebook-pages-scraper/run-sync-get-dataset-items?token=${token}&timeout=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startUrls: [{ url: fbUrl }], maxPosts: 5 }),
    }
  );

  if (!res.ok) throw new Error(`Apify Facebook scraper returned HTTP ${res.status}`);

  const items: Record<string, unknown>[] = await res.json();
  const page = items[0];
  if (!page) throw new Error("Facebook page not found or is private");

  type ApifyFBPost = { text?: string; time?: string };
  const posts: ApifyFBPost[] = (page.posts as ApifyFBPost[]) ?? [];

  return {
    name: (page.title as string) ?? (page.name as string) ?? url,
    followers: (page.followers as number) ?? null,
    likes: (page.likes as number) ?? null,
    about: (page.about as string) ?? null,
    recentPosts: posts.slice(0, 5).map((p) => ({
      text: p.text?.slice(0, 300) ?? "",
      timestamp: p.time,
    })),
  };
}
