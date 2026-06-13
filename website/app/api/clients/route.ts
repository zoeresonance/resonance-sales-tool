import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CLIENTS_DIR = path.join(process.cwd(), "clients");

export async function GET() {
  if (!fs.existsSync(CLIENTS_DIR)) {
    return NextResponse.json({ clients: [] });
  }

  const clients: { name: string; adAccountId: string }[] = [];

  for (const entry of fs.readdirSync(CLIENTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const configPath = path.join(CLIENTS_DIR, entry.name, "config.json");
    if (!fs.existsSync(configPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (raw.name && raw.adAccountId) {
        clients.push({ name: raw.name, adAccountId: raw.adAccountId });
      }
    } catch {
      // malformed config — skip
    }
  }

  clients.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  try {
    const { name, adAccountId, facebookPageId, instagramAccountId, auditDoc } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Client name is required." }, { status: 400 });
    }
    if (!adAccountId || typeof adAccountId !== "string" || adAccountId.trim().length === 0) {
      return NextResponse.json({ error: "Ad Account ID is required." }, { status: 400 });
    }

    const safeName = name.trim().replace(/[^a-zA-Z0-9 _-]/g, "").trim();
    if (!safeName) {
      return NextResponse.json({ error: "Client name contains no valid characters." }, { status: 400 });
    }

    const clientDir = path.join(CLIENTS_DIR, safeName);

    if (!clientDir.startsWith(CLIENTS_DIR + path.sep) && clientDir !== CLIENTS_DIR) {
      return NextResponse.json({ error: "Invalid client name." }, { status: 400 });
    }

    if (fs.existsSync(clientDir)) {
      return NextResponse.json({ error: `A client named "${safeName}" already exists.` }, { status: 409 });
    }

    fs.mkdirSync(clientDir, { recursive: true });

    const config: Record<string, string> = {
      name: safeName,
      adAccountId: adAccountId.trim(),
      auditDoc: "audit.md",
    };
    if (facebookPageId?.trim()) config.facebookPageId = facebookPageId.trim();
    if (instagramAccountId?.trim()) config.instagramAccountId = instagramAccountId.trim();

    fs.writeFileSync(path.join(clientDir, "config.json"), JSON.stringify(config, null, 2));

    if (auditDoc?.trim()) {
      fs.writeFileSync(path.join(clientDir, "audit.md"), auditDoc.trim());
    } else {
      fs.writeFileSync(path.join(clientDir, "audit.md"), `# ${safeName} — Audience & Persona Audit\n\nAdd your persona document here.\n`);
    }

    return NextResponse.json({ success: true, name: safeName, adAccountId: adAccountId.trim() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create client: ${msg}` }, { status: 500 });
  }
}
