import type { InstagramData, FacebookData } from "./types";

function extractInstagramUsername(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[0] ?? null;
  } catch {
    // bare username
    const clean = url.replace(/^@/, "").trim();
    return clean || null;
  }
}

function extractFacebookPage(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "pages" && parts[2]) return parts[2];
    return parts[0] ?? null;
  } catch {
    return url.replace(/^@/, "").trim() || null;
  }
}

export async function scrapeInstagram(url: string): Promise<InstagramData> {
  const username = extractInstagramUsername(url);
  if (!username) throw new Error("Could not extract Instagram username from URL");

  const res = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "x-ig-app-id": "936619743392459",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: `https://www.instagram.com/${username}/`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) throw new Error(`Instagram returned HTTP ${res.status}`);

  const data = await res.json();
  const user = data?.data?.user;
  if (!user) throw new Error("Instagram profile not found or is private");

  const edges: unknown[] = user.edge_owner_to_timeline_media?.edges ?? [];

  return {
    username: user.username,
    fullName: user.full_name ?? "",
    bio: user.biography ?? "",
    followers: user.edge_followed_by?.count ?? 0,
    following: user.edge_follow?.count ?? 0,
    postCount: user.edge_owner_to_timeline_media?.count ?? 0,
    isVerified: user.is_verified ?? false,
    externalUrl: user.external_url ?? null,
    recentPosts: edges.slice(0, 12).map((e: unknown) => {
      const n = (e as { node: Record<string, unknown> }).node;
      const captionEdges = (n.edge_media_to_caption as { edges?: { node: { text: string } }[] })?.edges ?? [];
      return {
        likes: (n.edge_liked_by as { count?: number })?.count ?? 0,
        comments: (n.edge_media_to_comment as { count?: number })?.count ?? 0,
        caption: captionEdges[0]?.node?.text?.slice(0, 300) ?? "",
        type: (n.__typename as string) ?? "GraphImage",
        timestamp: (n.taken_at_timestamp as number) ?? 0,
      };
    }),
  };
}

export async function scrapeFacebook(url: string): Promise<FacebookData> {
  const pageId = extractFacebookPage(url);
  if (!pageId) throw new Error("Could not extract Facebook page identifier from URL");

  const res = await fetch(`https://m.facebook.com/${pageId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Facebook returned HTTP ${res.status}`);

  const html = await res.text();

  const nameMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const name = nameMatch?.[1]?.replace(" | Facebook", "").trim() ?? pageId;

  const followerPatterns = [
    /(\d[\d,.]*)\s*(?:people follow|followers)/i,
    /"follower_count"\s*:\s*(\d+)/,
  ];
  let followers: number | null = null;
  for (const pat of followerPatterns) {
    const m = html.match(pat);
    if (m) {
      followers = parseInt(m[1].replace(/[,.\s]/g, ""), 10);
      break;
    }
  }

  const likePatterns = [
    /(\d[\d,.]*)\s*people like this/i,
    /"like_count"\s*:\s*(\d+)/,
  ];
  let likes: number | null = null;
  for (const pat of likePatterns) {
    const m = html.match(pat);
    if (m) {
      likes = parseInt(m[1].replace(/[,.\s]/g, ""), 10);
      break;
    }
  }

  const aboutMatch = html.match(/class="[^"]*about[^"]*"[^>]*>([^<]{20,300})</i);
  const about = aboutMatch?.[1]?.trim() ?? null;

  // Extract visible post snippets
  const postMatches = [...html.matchAll(/data-ft="[^"]*"[^>]*>([^<]{30,400})</g)];
  const recentPosts = postMatches.slice(0, 5).map((m) => ({ text: m[1].trim() }));

  return { name, followers, likes, about, recentPosts };
}
