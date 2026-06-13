export type CheckResult = "PASS" | "WARNING" | "FAIL" | "N/A";
export type Severity = "Critical" | "High" | "Medium" | "Low";
export type Grade = "A" | "B" | "C" | "D" | "F";
export type Impact = "HIGH" | "MEDIUM" | "LOW";

export interface AuditCheck {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  result: CheckResult;
  finding: string;
  recommendation: string | null;
}

export interface QuickWin {
  checkId: string;
  checkName: string;
  action: string;
  impact: Impact;
  timeEstimate: string;
  potentialGain: string;
}

export interface CategoryScore {
  score: number;
  weight: number;
  checksPass: number;
  checksTotal: number;
}

export interface AnalysisResult {
  healthScore: number;
  grade: Grade;
  summary: string;
  categories: {
    pixelCapi: CategoryScore;
    creative: CategoryScore;
    accountStructure: CategoryScore;
    audience: CategoryScore;
  };
  checks: AuditCheck[];
  quickWins: QuickWin[];
  insights: string;
  creativeFatigueAlerts: string[];
  emqStatus: "excellent" | "good" | "fair" | "poor" | "unknown";
  emqRecommendations: string;
  organicInsights?: string;
}

export interface ResonanceDimension {
  score: number;
  finding: string;
}

export interface ResonancePerformer {
  type: "ad" | "facebook_post" | "instagram_post";
  identifier: string;
  metric: string;
  whyItLands?: string;
  whyItMisses?: string;
}

export interface ResonanceRecommendation {
  type: "ad" | "post" | "audience" | "creative" | "messaging";
  target: string;
  currentState: string;
  suggestion: string;
  reasoning: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
}

export interface ResonanceScoreResult {
  score: number;
  grade: Grade;
  summary: string;
  dimensions: Record<string, ResonanceDimension>;
  topPerformers: ResonancePerformer[];
  bottomPerformers: ResonancePerformer[];
  recommendations: ResonanceRecommendation[];
  personaFit: {
    primaryPersonaName: string;
    matchScore: number;
    strengths: string[];
    gaps: string[];
  };
}

export interface ResonanceResult {
  ads: ResonanceScoreResult;
  organic: ResonanceScoreResult;
}

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface PerformanceData {
  ads: {
    spend: DailyMetric[];
    ctr: DailyMetric[];
    cpm: DailyMetric[];
    impressions: DailyMetric[];
    frequency: DailyMetric[];
    clicks: DailyMetric[];
  };
  organic: {
    fb: {
      reach: DailyMetric[];
      engagements: DailyMetric[];
    };
    ig: {
      reach: DailyMetric[];
      followerCount: DailyMetric[];
    };
    combined: {
      views: DailyMetric[];      // FB total impressions + IG reach (IG daily impressions unavailable in Meta API v21)
      viewers: DailyMetric[];    // FB unique reach + IG unique reach
      engagement: DailyMetric[]; // FB post engagements + IG likes+comments aggregated from posts
    };
  };
}

export interface AdMetrics {
  // Account
  businessType: string;
  monthlySpend: string;

  // Tracking
  pixelInstalled: string;
  capiActive: string;
  emqScore: string;
  eventDedup: string;
  domainVerified: string;
  aemConfigured: string;
  attributionWindow: string;

  // Creative
  creativeFormats: string;
  creativesPerAdset: string;
  daysSinceRefresh: string;
  fatigueDetected: string;
  ugcPercentage: string;
  videoAspectRatios: string;
  advantagePlusCreative: string;

  // Structure
  campaignCount: string;
  budgetType: string;
  dailyBudget: string;
  targetCpa: string;
  learningLimitedPct: string;
  advantagePlusSales: string;
  utmParameters: string;
  abTestingActive: string;

  // Audience
  customAudiences: string;
  lookalikeAudiences: string;
  purchaserExclusions: string;
  prospectingFrequency: string;
  retargetingFrequency: string;
  advantagePlusAudience: string;

  // Key Metrics
  ctr: string;
  cpc: string;
  roas: string;
  cpm: string;
  cpl: string;

  // Organic (optional)
  organicPostsPerWeek?: string;
  organicEngagementRate?: string;
  organicReachPerPost?: string;
  organicTopFormat?: string;
  additionalContext?: string;
}
