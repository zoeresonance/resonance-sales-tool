import fs from "fs";
import path from "path";

export interface ClientConfig {
  name: string;
  adAccountId: string;
  facebookPageId: string;
  instagramAccountId: string;
  auditDoc: string;
  auditDocPath: string;
  clientDir: string;
}

const CLIENTS_DIR = path.join(process.cwd(), "clients");

function loadClients(): Map<string, ClientConfig> {
  const map = new Map<string, ClientConfig>();
  if (!fs.existsSync(CLIENTS_DIR)) return map;

  for (const entry of fs.readdirSync(CLIENTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const configPath = path.join(CLIENTS_DIR, entry.name, "config.json");
    if (!fs.existsSync(configPath)) continue;

    try {
      const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const clientDir = path.join(CLIENTS_DIR, entry.name);
      const config: ClientConfig = {
        ...raw,
        clientDir,
        auditDocPath: path.join(clientDir, raw.auditDoc ?? "audit.md"),
      };
      if (config.adAccountId) {
        const normalized = config.adAccountId.startsWith("act_")
          ? config.adAccountId
          : `act_${config.adAccountId}`;
        map.set(normalized, config);
      }
    } catch {
      // malformed config — skip
    }
  }
  return map;
}

export function getClientForAccount(accountId: string): ClientConfig | null {
  const normalized = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const clients = loadClients();
  return clients.get(normalized) ?? null;
}

export function readAuditDoc(config: ClientConfig): string {
  if (!fs.existsSync(config.auditDocPath)) return "";
  return fs.readFileSync(config.auditDocPath, "utf8");
}
