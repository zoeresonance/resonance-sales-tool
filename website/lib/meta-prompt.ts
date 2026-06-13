import type { MetaFullData, MetaAdSet, MetaInsights } from "./meta-api";
import { SYSTEM_PROMPT } from "./prompt";

export { SYSTEM_PROMPT };

function fmt(n: string | number | undefined, prefix = "", suffix = ""): string {
  if (n === undefined || n === null || n === "") return "N/A";
  return `${prefix}${n}${suffix}`;
}

function fmtMoney(s: string | undefined): string {
  if (!s) return "N/A";
  const n = parseFloat(s) / 100;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtSpend(s: string | undefined): string {
  if (!s) return "N/A";
  const n = parseFloat(s);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function findAction(
  actions: { action_type: string; value: string }[] | undefined,
  type: string
): string {
  return actions?.find((a) => a.action_type === type)?.value ?? "N/A";
}

function learningStatus(adsets: MetaAdSet[]): string {
  const active = adsets.filter((a) => a.effective_status === "ACTIVE");
  if (!active.length) return "No active ad sets";
  const limited = active.filter(
    (a) => a.learning_stage_info?.status === "LEARNING_LIMITED"
  ).length;
  const learning = active.filter(
    (a) => a.learning_stage_info?.status === "LEARNING"
  ).length;
  const pct = Math.round((limited / active.length) * 100);
  return `${limited}/${active.length} in Learning Limited (${pct}%), ${learning} in Learning`;
}

function budgetSummary(adsets: MetaAdSet[]): string {
  const active = adsets.filter((a) => a.effective_status === "ACTIVE");
  const withBudget = active.filter((a) => a.daily_budget || a.lifetime_budget);
  const dailyBudgets = withBudget
    .map((a) => (a.daily_budget ? parseFloat(a.daily_budget) / 100 : null))
    .filter(Boolean) as number[];
  if (!dailyBudgets.length) return "Lifetime budgets or N/A";
  const min = Math.min(...dailyBudgets);
  const max = Math.max(...dailyBudgets);
  return `Daily budgets range $${min.toFixed(0)}–$${max.toFixed(0)} per ad set`;
}

function insightsSummary(i: MetaInsights | null): string {
  if (!i) return "No insights data available";
  const roas = i.purchase_roas?.[0]?.value;
  const purchases = findAction(i.actions, "purchase");
  const leads = findAction(i.actions, "lead");
  const costPerPurchase = findAction(i.cost_per_action_type, "purchase");
  const costPerLead = findAction(i.cost_per_action_type, "lead");

  return [
    `Spend: ${fmtSpend(i.spend)}`,
    `Impressions: ${parseInt(i.impressions ?? "0").toLocaleString()}`,
    `Reach: ${parseInt(i.reach ?? "0").toLocaleString()}`,
    `CTR: ${i.ctr ? (parseFloat(i.ctr) * 100).toFixed(2) + "%" : "N/A"}`,
    `CPC: ${fmtSpend(i.cpc)}`,
    `CPM: ${fmtSpend(i.cpm)}`,
    `Frequency: ${parseFloat(i.frequency ?? "0").toFixed(2)}`,
    roas ? `Purchase ROAS: ${parseFloat(roas).toFixed(2)}x` : null,
    purchases !== "N/A" ? `Purchases: ${purchases}` : null,
    costPerPurchase !== "N/A" ? `Cost per purchase: ${fmtSpend(costPerPurchase)}` : null,
    leads !== "N/A" ? `Leads: ${leads}` : null,
    costPerLead !== "N/A" ? `Cost per lead: ${fmtSpend(costPerLead)}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function creativeAnalysis(data: MetaFullData): string {
  const { ads, adsets } = data;
  const activeAds = ads.filter(
    (a) => a.effective_status === "ACTIVE" || a.effective_status === "PAUSED"
  );

  const adsByAdset = new Map<string, typeof ads>();
  for (const ad of activeAds) {
    const list = adsByAdset.get(ad.adset_id) ?? [];
    list.push(ad);
    adsByAdset.set(ad.adset_id, list);
  }

  const lines: string[] = [];
  lines.push(`Total active/paused ads: ${activeAds.length}`);
  lines.push(`Active ad sets: ${adsets.filter((a) => a.effective_status === "ACTIVE").length}`);

  // Creatives per ad set
  const counts = [...adsByAdset.values()].map((a) => a.length);
  if (counts.length) {
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
    lines.push(`Creatives per ad set: min ${min}, max ${max}, avg ${avg}`);
    const below5 = counts.filter((c) => c < 5).length;
    if (below5) lines.push(`Ad sets with <5 creatives: ${below5}/${counts.length}`);
  }

  // Creative age
  const now = Date.now();
  const ages = activeAds.map((a) => {
    const updated = new Date(a.updated_time).getTime();
    return Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  });
  if (ages.length) {
    const newest = Math.min(...ages);
    const oldest = Math.max(...ages);
    lines.push(`Creative age: newest ${newest} days old, oldest ${oldest} days old`);
    if (newest > 21)
      lines.push(
        `WARNING: No creative has been updated in the last 21 days (Andromeda threshold)`
      );
  }

  // Object types (format diversity)
  const types = new Set(
    activeAds.map((a) => a.creative?.object_type).filter(Boolean)
  );
  lines.push(`Creative object types: ${[...types].join(", ") || "unknown"}`);

  return lines.join("\n");
}

function pixelSummary(data: MetaFullData): string {
  const { pixels } = data;
  if (!pixels.length) return "No pixels found on this ad account";

  return pixels
    .map((p) => {
      const lastFired = p.last_fired_time
        ? `last fired ${new Date(p.last_fired_time).toLocaleDateString()}`
        : "never fired";
      const unavailable = p.is_unavailable ? " [UNAVAILABLE]" : "";
      return `Pixel "${p.name}" (${p.id}): ${lastFired}${unavailable}`;
    })
    .join("\n");
}

function audienceSummary(data: MetaFullData): string {
  const { customAudiences } = data;
  if (!customAudiences.length) return "No custom audiences found";

  const byType = new Map<string, number>();
  for (const a of customAudiences) {
    byType.set(a.subtype, (byType.get(a.subtype) ?? 0) + 1);
  }

  const typeBreakdown = [...byType.entries()]
    .map(([k, v]) => `${v}x ${k}`)
    .join(", ");

  const now = Date.now();
  const stale = customAudiences.filter((a) => {
    const age = (now - a.time_updated * 1000) / (1000 * 60 * 60 * 24);
    return age > 180;
  });

  const lines = [
    `Total custom audiences: ${customAudiences.length} (${typeBreakdown})`,
  ];

  if (stale.length)
    lines.push(`Stale audiences (>180 days): ${stale.map((a) => a.name).join(", ")}`);

  const hasCustomerList = customAudiences.some(
    (a) => a.subtype === "CUSTOM" || a.data_source?.type === "FILE_IMPORTED"
  );
  const hasLookalike = customAudiences.some((a) => a.subtype === "LOOKALIKE");
  const hasWebsite = customAudiences.some((a) => a.subtype === "WEBSITE");

  lines.push(
    `Has customer list: ${hasCustomerList ? "Yes" : "No"} | Lookalike: ${hasLookalike ? "Yes" : "No"} | Website visitors: ${hasWebsite ? "Yes" : "No"}`
  );

  return lines.join("\n");
}

function adsetInsightsSummary(data: MetaFullData): string {
  const { adsetInsights } = data;
  if (!adsetInsights.length) return "No ad set level insights available";

  const highFreq = adsetInsights.filter(
    (i) => parseFloat(i.frequency ?? "0") >= 3
  );
  const lines: string[] = [];

  if (highFreq.length) {
    lines.push(
      `Ad sets with frequency ≥3.0: ${highFreq
        .map(
          (i) => `"${i.adset_name}" (freq ${parseFloat(i.frequency).toFixed(1)})`
        )
        .join(", ")}`
    );
  } else {
    lines.push("All ad set frequencies below 3.0 threshold");
  }

  const ctrData = adsetInsights
    .filter((i) => i.ctr)
    .map((i) => ({
      name: i.adset_name,
      ctr: parseFloat(i.ctr) * 100,
    }));

  if (ctrData.length) {
    const sorted = [...ctrData].sort((a, b) => b.ctr - a.ctr);
    lines.push(
      `Best CTR ad set: "${sorted[0].name}" (${sorted[0].ctr.toFixed(2)}%)`
    );
    lines.push(
      `Worst CTR ad set: "${sorted[sorted.length - 1].name}" (${sorted[
        sorted.length - 1
      ].ctr.toFixed(2)}%)`
    );
  }

  return lines.join("\n");
}

export function buildMetaUserMessage(data: MetaFullData): string {
  const { account, campaigns, adsets } = data;
  const activeCampaigns = campaigns.filter(
    (c) => c.effective_status === "ACTIVE" || c.effective_status === "PAUSED"
  );
  const activeAdsets = adsets.filter(
    (a) => a.effective_status === "ACTIVE" || a.effective_status === "LEARNING" || a.effective_status === "LEARNING_LIMITED"
  );

  const hasCBO = activeCampaigns.some((c) => c.budget_rebalance_flag);
  const hasABO = adsets.some((a) => a.daily_budget || a.lifetime_budget);
  const objectives = [...new Set(activeCampaigns.map((c) => c.objective))];

  const sections: string[] = [];

  sections.push(`## Account Information
- Account Name: ${account.name}
- Account ID: ${account.id}
- Currency: ${account.currency}
- Timezone: ${account.timezone_name}
- Account Status: ${account.account_status === 1 ? "ACTIVE" : account.account_status === 2 ? "DISABLED" : account.account_status}
- Total Amount Spent (all time): ${fmtSpend(account.amount_spent)}
- Business: ${account.business?.name ?? "No linked business"}
- Data fetched: ${new Date(data.fetchedAt).toLocaleString()}`);

  sections.push(`## Campaign Structure
- Total campaigns: ${campaigns.length} (${activeCampaigns.length} active/paused)
- Campaign count classification: ${activeCampaigns.length <= 3 ? "1-3 (recommended)" : activeCampaigns.length <= 5 ? "4-5 (warning)" : "6+ (over-fragmented — FAIL)"}
- Budget type: ${hasCBO ? "CBO enabled on some campaigns" : "ABO only (ad set level budgets)"}${hasCBO && hasABO ? " — mixed" : ""}
- Campaign objectives: ${objectives.join(", ") || "N/A"}
- Campaigns:
${activeCampaigns
  .map((c) => {
    const budget = c.daily_budget
      ? `daily ${fmtMoney(c.daily_budget)}`
      : c.lifetime_budget
      ? `lifetime ${fmtMoney(c.lifetime_budget)}`
      : "budget at ad set level";
    return `  • "${c.name}" | ${c.objective} | ${c.effective_status} | ${budget}`;
  })
  .join("\n")}`);

  sections.push(`## Ad Sets (${adsets.length} total, ${activeAdsets.length} active/learning)
- Learning phase: ${learningStatus(adsets)}
- ${budgetSummary(adsets)}
- Optimization goals: ${[...new Set(adsets.map((a) => a.optimization_goal))].join(", ")}
- Bid strategies: ${[...new Set(adsets.map((a) => a.bid_strategy).filter(Boolean))].join(", ") || "Default (Lowest Cost)"}
- Attribution windows detected: ${
    [...new Set(
      adsets.flatMap((a) =>
        (a.attribution_spec ?? []).map((s) => `${s.window_days}d ${s.event_type}`)
      )
    )].join(", ") || "Not specified"
  }`);

  sections.push(`## Creative Analysis
${creativeAnalysis(data)}`);

  sections.push(`## Pixel & Conversion Tracking
${pixelSummary(data)}
NOTE: Event Match Quality (EMQ) scores, CAPI status, and event deduplication rates are not directly available via the Marketing API. These must be checked in Meta Events Manager. Please evaluate M01-M04 based on pixel firing status above and note that EMQ/CAPI checks require manual verification.`);

  sections.push(`## Account-Level Performance (Last 30 Days)
${insightsSummary(data.accountInsights)}`);

  if (data.campaignInsights.length) {
    sections.push(`## Campaign-Level Performance (Last 30 Days)
${data.campaignInsights
  .map((i) => {
    const roas = i.purchase_roas?.[0]?.value;
    const ctrPct = i.ctr ? (parseFloat(i.ctr) * 100).toFixed(2) + "%" : "N/A";
    return `  • "${i.campaign_name}" | Spend: ${fmtSpend(i.spend)} | CTR: ${ctrPct} | CPC: ${fmtSpend(i.cpc)} | CPM: ${fmtSpend(i.cpm)} | Freq: ${parseFloat(i.frequency ?? "0").toFixed(2)}${roas ? ` | ROAS: ${parseFloat(roas).toFixed(2)}x` : ""}`;
  })
  .join("\n")}`);
  }

  sections.push(`## Ad Set-Level Frequency & Performance
${adsetInsightsSummary(data)}`);

  sections.push(`## Custom Audiences
${audienceSummary(data)}`);

  sections.push(`Please run a full Meta Ads audit on this real account data fetched directly from the Meta Marketing API. Evaluate all 50 checks as PASS, WARNING, FAIL, or N/A. For checks that require Events Manager data (EMQ, CAPI, deduplication), mark as N/A with a note to check Events Manager manually. Return the complete JSON analysis.`);

  return sections.join("\n\n");
}
