import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.META_SYSTEM_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "META_SYSTEM_TOKEN is not configured." },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,currency,account_status&limit=200&access_token=${encodeURIComponent(token)}`
  );
  const json = await res.json();

  if (json.error) {
    return NextResponse.json(
      { error: `Meta API: ${json.error.message}` },
      { status: 400 }
    );
  }

  const accounts = (json.data ?? []).filter(
    (a: { account_status: number }) => a.account_status === 1
  );

  return NextResponse.json({ accounts });
}
