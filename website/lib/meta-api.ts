const BASE = "https://graph.facebook.com/v21.0"; // Meta Marketing API

async function gql<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  const json = await res.json();
  if (json.error) throw new Error(`Meta API: ${json.error.message} (code ${json.error.code})`);
  return json as T;
}

// Paginate through all results
async function paginate<T>(
  path: string,
  params: Record<string, string>
): Promise<T[]> {
  const results: T[] = [];
  const firstUrl = `${BASE}${path}?${new URLSearchParams(params).toString()}`;
  const queue: string[] = [firstUrl];

  while (queue.length > 0 && results.length < 500) {
    const nextUrl = queue.shift() as string;
    const r = await fetch(nextUrl, { cache: "no-store" });
    const json = await r.json();
    if (json.error) throw new Error(`Meta API: ${json.error.message}`);
    results.push(...(json.data ?? []));
    if (json.paging?.next) queue.push(json.paging.next as string);
  }

  return results;
}


export interface MetaAccount {
  id: string;
  name: string;
  currency: string;
  account_status: number;
  timezone_name: string;
  amount_spent: string;
  balance: string;
  business?: { id: string; name: string };
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_rebalance_flag?: boolean;
  created_time: string;
}

export interface MetaAdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  optimization_goal: string;
  billing_event: string;
  bid_strategy?: string;
  targeting?: Record<string, unknown>;
  learning_stage_info?: {
    status: string;
    attribution_windows: string[];
    conversions: { action_type: string; value: string }[];
  };
  attribution_spec?: { event_type: string; window_days: number }[];
  promoted_object?: Record<string, string>;
  created_time: string;
}

export interface MetaAd {
  id: string;
  name: string;
  adset_id: string;
  campaign_id: string;
  status: string;
  effective_status: string;
  creative?: {
    id: string;
    name?: string;
    object_type?: string;
    thumbnail_url?: string;
    body?: string;
    title?: string;
    call_to_action_type?: string;
    object_story_spec?: {
      link_data?: { message?: string; description?: string; call_to_action?: { type: string } };
      video_data?: { message?: string; title?: string; call_to_action?: { type: string } };
      photo_data?: { caption?: string };
    };
  };
  created_time: string;
  updated_time: string;
}

export interface MetaInsights {
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  frequency: string;
  cpp: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  date_start: string;
  date_stop: string;
}

export interface MetaCampaignInsights extends MetaInsights {
  campaign_id: string;
  campaign_name: string;
  objective: string;
}

export interface MetaAdSetInsights extends MetaInsights {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
}

export interface MetaPixel {
  id: string;
  name: string;
  last_fired_time?: string;
  is_unavailable?: boolean;
  code?: string;
}

export interface MetaCustomAudience {
  id: string;
  name: string;
  subtype: string;
  approximate_count_lower_bound?: number;
  approximate_count_upper_bound?: number;
  time_updated: number;
  data_source?: { type: string; sub_type: string };
  rule?: string;
}

export interface MetaFullData {
  account: MetaAccount;
  campaigns: MetaCampaign[];
  adsets: MetaAdSet[];
  ads: MetaAd[];
  accountInsights: MetaInsights | null;
  campaignInsights: MetaCampaignInsights[];
  adsetInsights: MetaAdSetInsights[];
  pixels: MetaPixel[];
  customAudiences: MetaCustomAudience[];
  dateRange?: { since: string; until: string };
  fetchedAt: string;
}

const INSIGHT_FIELDS = [
  "spend",
  "impressions",
  "reach",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "frequency",
  "cpp",
  "actions",
  "action_values",
  "purchase_roas",
  "cost_per_action_type",
].join(",");

export interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

function defaultRange(): DateRange {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  return { since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) };
}

export async function fetchMetaData(
  token: string,
  accountId: string,
  dateRange?: DateRange
): Promise<MetaFullData> {
  const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const t = token.trim();
  const range = dateRange ?? defaultRange();
  const timeRange = JSON.stringify({ since: range.since, until: range.until });

  const [
    account,
    campaigns,
    adsets,
    ads,
    accountInsightsRaw,
    campaignInsightsRaw,
    adsetInsightsRaw,
    pixels,
    customAudiences,
  ] = await Promise.all([
    // Account
    gql<MetaAccount>(`/${actId}`, {
      fields: "id,name,currency,account_status,timezone_name,amount_spent,balance,business",
      access_token: t,
    }),

    // Campaigns
    paginate<MetaCampaign>(`/${actId}/campaigns`, {
      fields:
        "id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_rebalance_flag,created_time",
      effective_status: '["ACTIVE","PAUSED","ARCHIVED"]',
      limit: "100",
      access_token: t,
    }),

    // Ad Sets
    paginate<MetaAdSet>(`/${actId}/adsets`, {
      fields:
        "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_strategy,targeting,learning_stage_info,attribution_spec,promoted_object,created_time",
      effective_status: '["ACTIVE","PAUSED","ADSET_PAUSED","IN_PROCESS","WITH_ISSUES"]',
      limit: "100",
      access_token: t,
    }),

    // Ads
    paginate<MetaAd>(`/${actId}/ads`, {
      fields:
        "id,name,adset_id,campaign_id,status,effective_status,creative{id,object_type,body,title,call_to_action_type,object_story_spec},created_time,updated_time",
      effective_status: '["ACTIVE","PAUSED","ARCHIVED"]',
      limit: "100",
      access_token: t,
    }),

    // Account-level insights
    gql<{ data: MetaInsights[] }>(`/${actId}/insights`, {
      fields: INSIGHT_FIELDS,
      time_range: timeRange,
      level: "account",
      access_token: t,
    }).then((r) => r.data?.[0] ?? null).catch(() => null),

    // Campaign-level insights
    paginate<MetaCampaignInsights>(`/${actId}/insights`, {
      fields: `campaign_id,campaign_name,objective,${INSIGHT_FIELDS}`,
      time_range: timeRange,
      level: "campaign",
      limit: "50",
      access_token: t,
    }).catch(() => []),

    // Ad set-level insights (for frequency per ad set)
    paginate<MetaAdSetInsights>(`/${actId}/insights`, {
      fields: `adset_id,adset_name,campaign_id,campaign_name,${INSIGHT_FIELDS}`,
      time_range: timeRange,
      level: "adset",
      limit: "100",
      access_token: t,
    }).catch(() => []),

    // Pixels
    paginate<MetaPixel>(`/${actId}/adspixels`, {
      fields: "id,name,last_fired_time,is_unavailable",
      limit: "10",
      access_token: t,
    }).catch(() => []),

    // Custom Audiences
    paginate<MetaCustomAudience>(`/${actId}/customaudiences`, {
      fields:
        "id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,time_updated,data_source",
      limit: "100",
      access_token: t,
    }).catch(() => []),
  ]);

  return {
    account,
    campaigns,
    adsets,
    ads,
    accountInsights: accountInsightsRaw,
    campaignInsights: campaignInsightsRaw,
    adsetInsights: adsetInsightsRaw,
    pixels,
    customAudiences,
    dateRange: range,
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Daily ads insights (time_increment=1 for per-day breakdown)
// ---------------------------------------------------------------------------

export interface DailyAdsInsight {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpm: string;
  frequency: string;
}

export async function fetchInsightsForPeriod(
  token: string,
  accountId: string,
  dateRange: DateRange
): Promise<MetaInsights | null> {
  const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const timeRange = JSON.stringify({ since: dateRange.since, until: dateRange.until });
  return gql<{ data: MetaInsights[] }>(`/${actId}/insights`, {
    fields: INSIGHT_FIELDS,
    time_range: timeRange,
    level: "account",
    access_token: token.trim(),
  }).then((r) => r.data?.[0] ?? null).catch(() => null);
}

export async function fetchDailyAdsInsights(
  token: string,
  accountId: string,
  dateRange?: DateRange
): Promise<DailyAdsInsight[]> {
  const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const range = dateRange ?? defaultRange();
  const timeRange = JSON.stringify({ since: range.since, until: range.until });

  return paginate<DailyAdsInsight>(`/${actId}/insights`, {
    fields: "spend,impressions,clicks,ctr,cpm,frequency",
    time_range: timeRange,
    time_increment: "1",
    level: "account",
    limit: "90",
    access_token: token.trim(),
  }).catch(() => []);
}

// ---------------------------------------------------------------------------
// Organic data types
// ---------------------------------------------------------------------------

export interface PagePost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  full_picture?: string;
  attachments?: { data: { media_type?: string; type?: string }[] };
  insights?: {
    data: {
      name: string;
      values: { value: number | Record<string, number> }[];
    }[];
  };
}

export interface IgMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  insights?: {
    data: { name: string; values: { value: number }[] }[];
  };
}

export interface PageInsightValue {
  name: string;
  values: { value: number | Record<string, number>; end_time: string }[];
}

export interface OrganicData {
  page: {
    id: string;
    name: string;
    fan_count: number;
    followers_count: number;
  } | null;
  pageInsights: PageInsightValue[];
  pagePosts: PagePost[];
  igInsights: PageInsightValue[];
  igAudienceDemographics: PageInsightValue[];
  igMedia: IgMedia[];
  dateRange: DateRange;
  fetchedAt: string;
}

// Like paginate, but stops following paging.next once any item's created_time
// goes before sinceMs. Used for /posts where next-page cursors go backward in time.
async function fetchPostsInWindow(
  path: string,
  params: Record<string, string>,
  sinceMs: number
): Promise<PagePost[]> {
  const results: PagePost[] = [];
  let nextUrl: string | null = `${BASE}${path}?${new URLSearchParams(params).toString()}`;

  while (nextUrl && results.length < 500) {
    const res = await fetch(nextUrl, { cache: "no-store" });
    const json = await res.json() as { data?: PagePost[]; error?: { message: string }; paging?: { next?: string } };
    if (json.error) throw new Error(`Meta API: ${json.error.message}`);
    const page: PagePost[] = json.data ?? [];
    results.push(...page);
    // Stop paginating as soon as any post on this page predates sinceMs
    const hasOldPost = page.some((p) => new Date(p.created_time).getTime() < sinceMs);
    nextUrl = hasOldPost ? null : (json.paging?.next ?? null);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Organic fetch
// ---------------------------------------------------------------------------

export async function fetchOrganicData(
  token: string,
  facebookPageId: string,
  instagramAccountId: string,
  dateRange?: DateRange
): Promise<OrganicData> {
  const t = token.trim();
  const range = dateRange ?? defaultRange();
  const sinceTs = String(Math.floor(new Date(range.since).getTime() / 1000));
  const untilTs = String(Math.floor(new Date(range.until).getTime() / 1000));

  // Page Insights requires a Page Access Token, not a system user token.
  // Exchange the system token for the page-specific token first.
  const pageToken = await gql<{ access_token?: string; id: string }>(
    `/${facebookPageId}`,
    { fields: "access_token", access_token: t }
  ).then((r) => r.access_token ?? t).catch(() => t);

  // IG reach has a hard 30-day window limit in the Meta API
  const igSinceTs = String(Math.max(
    Number(sinceTs),
    Math.floor(new Date(range.until).getTime() / 1000) - 30 * 86400
  ));

  const fetchFbMetric = (metric: string): Promise<PageInsightValue[]> =>
    gql<{ data: PageInsightValue[] }>(
      `/${facebookPageId}/insights`,
      { metric, period: "day", since: sinceTs, until: untilTs, access_token: pageToken }
    ).then((r) => r.data ?? []).catch(() => [] as PageInsightValue[]);

  const fetchIgMetric = (metric: string): Promise<PageInsightValue[]> =>
    gql<{ data: PageInsightValue[] }>(
      `/${instagramAccountId}/insights`,
      { metric, period: "day", since: igSinceTs, until: untilTs, access_token: t }
    ).then((r) => r.data ?? []).catch(() => [] as PageInsightValue[]);

  const [page, pageInsights, allPagePosts, igInsights, igAudienceDemographics, allIgMedia] =
    await Promise.all([
      // Page summary
      gql<{ id: string; name: string; fan_count: number; followers_count: number }>(
        `/${facebookPageId}`,
        { fields: "id,name,fan_count,followers_count", access_token: t }
      ).catch(() => null),

      // Valid FB page insights in Meta API v21 — page_impressions/engaged_users/fan_adds are deprecated
      Promise.all([
        "page_impressions_unique",
        "page_post_engagements",
        "page_impressions",
      ].map(fetchFbMetric)).then((results) => results.flat()),

      // Fetch most-recent FB posts then filter client-side.
      // since/until on /posts returns unreliable results; fetching without
      // them gives the latest posts in reverse-chron order which we then
      // trim to the selected window.
      // NOTE: insights.metric() sub-field omitted — it requires read_insights
      // on each post and causes the entire /posts request to fail with a
      // permission error. Aggregate page insights are fetched separately.
      fetchPostsInWindow(
        `/${facebookPageId}/posts`,
        {
          fields: [
            "id",
            "message",
            "story",
            "created_time",
            "full_picture",
            "attachments{media_type,type}",
          ].join(","),
          limit: "100",
          access_token: pageToken,
        },
        Number(sinceTs) * 1000
      ).catch(() => [] as PagePost[]),

      // IG metrics that support daily time-series (capped to 30-day window)
      // profile_views/accounts_engaged/website_clicks require metric_type=total_value (aggregates, no daily series)
      // impressions is not valid at account level in v21
      Promise.all([
        "reach",
        "follower_count",
      ].map(fetchIgMetric)).then((results) => results.flat()),

      // Instagram audience demographics — lifetime only (API limitation)
      gql<{ data: PageInsightValue[] }>(
        `/${instagramAccountId}/insights`,
        {
          metric: ["audience_gender_age", "audience_country", "audience_city"].join(","),
          period: "lifetime",
          access_token: t,
        }
      ).then((r) => r.data).catch(() => [] as PageInsightValue[]),

      // Recent IG posts (filtered client-side by date range)
      // NOTE: insights.metric() sub-field omitted — causes the entire /media
      // request to fail when the token lacks per-media read_insights permission.
      paginate<IgMedia>(`/${instagramAccountId}/media`, {
        fields: [
          "id",
          "caption",
          "media_type",
          "media_product_type",
          "timestamp",
          "like_count",
          "comments_count",
        ].join(","),
        limit: "50",
        access_token: t,
      }).catch(() => [] as IgMedia[]),
    ]);

  // Filter IG media by date range (the API doesn't support since/until on /media)
  const sinceMs = new Date(range.since).getTime();
  const untilMs = new Date(range.until).getTime() + 86400000; // include the until day
  const igMedia = allIgMedia.filter((m) => {
    const ts = new Date(m.timestamp).getTime();
    return ts >= sinceMs && ts <= untilMs;
  });

  // Filter FB posts by date range (since/until on /posts acts as cursor, not a date filter)
  const fbSinceMs = new Date(range.since).getTime();
  const fbUntilMs = new Date(range.until).getTime() + 86400000;
  const pagePosts = allPagePosts.filter((p) => {
    const ts = new Date(p.created_time).getTime();
    return ts >= fbSinceMs && ts <= fbUntilMs;
  });

  return {
    page,
    pageInsights,
    pagePosts,
    igInsights,
    igAudienceDemographics,
    igMedia,
    dateRange: range,
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Previous-period organic totals (for period-over-period momentum comparison)
// ---------------------------------------------------------------------------

export interface OrganicPeriodInsights {
  fbReach: number | null;
  fbEngagements: number | null;
  igReach: number | null;
  igFollowerGrowth: number | null;
}

export async function fetchOrganicInsightsForPeriod(
  token: string,
  facebookPageId: string,
  instagramAccountId: string,
  dateRange: DateRange
): Promise<OrganicPeriodInsights> {
  const t = token.trim();
  const sinceTs = String(Math.floor(new Date(dateRange.since).getTime() / 1000));
  const untilTs = String(Math.floor(new Date(dateRange.until).getTime() / 1000));

  const pageToken = await gql<{ access_token?: string; id: string }>(
    `/${facebookPageId}`,
    { fields: "access_token", access_token: t }
  ).then((r) => r.access_token ?? t).catch(() => t);

  // IG reach has a hard 30-day window limit in the Meta API
  const igSinceTs = String(Math.max(
    Number(sinceTs),
    Math.floor(new Date(dateRange.until).getTime() / 1000) - 30 * 86400
  ));

  const sum = (data: PageInsightValue[], name: string): number | null => {
    const item = data.find((i) => i.name === name);
    if (!item?.values?.length) return null;
    const total = item.values.reduce((s, v) => s + (typeof v.value === "number" ? v.value : 0), 0);
    return total > 0 ? total : null;
  };

  const [fbInsights, igInsights] = await Promise.all([
    Promise.all(
      ["page_impressions_unique", "page_post_engagements"].map((metric) =>
        gql<{ data: PageInsightValue[] }>(
          `/${facebookPageId}/insights`,
          { metric, period: "day", since: sinceTs, until: untilTs, access_token: pageToken }
        ).then((r) => r.data ?? []).catch(() => [] as PageInsightValue[])
      )
    ).then((r) => r.flat()),

    Promise.all(
      ["reach", "follower_count"].map((metric) =>
        gql<{ data: PageInsightValue[] }>(
          `/${instagramAccountId}/insights`,
          { metric, period: "day", since: igSinceTs, until: untilTs, access_token: t }
        ).then((r) => r.data ?? []).catch(() => [] as PageInsightValue[])
      )
    ).then((r) => r.flat()),
  ]);

  return {
    fbReach:          sum(fbInsights, "page_impressions_unique"),
    fbEngagements:    sum(fbInsights, "page_post_engagements"),
    igReach:          sum(igInsights, "reach"),
    igFollowerGrowth: sum(igInsights, "follower_count"),
  };
}
