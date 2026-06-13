import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "META_APP_ID and META_APP_SECRET are not configured." },
      { status: 500 }
    );
  }

  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const url = new URL("https://graph.facebook.com/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", token);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (json.error) {
    return NextResponse.json(
      { error: `Meta API: ${json.error.message}` },
      { status: 400 }
    );
  }

  const expiresAt = Date.now() + json.expires_in * 1000;

  return NextResponse.json({
    accessToken: json.access_token,
    expiresAt,
    expiresInDays: Math.floor(json.expires_in / 86400),
  });
}
