export interface InstagramPost {
  likes: number;
  comments: number;
  caption: string;
  type: string;
  timestamp: number;
}

export interface InstagramData {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  postCount: number;
  isVerified: boolean;
  externalUrl: string | null;
  recentPosts: InstagramPost[];
}

export interface FacebookPost {
  text: string;
  timestamp?: string;
}

export interface FacebookData {
  name: string;
  followers: number | null;
  likes: number | null;
  about: string | null;
  recentPosts: FacebookPost[];
}

export interface ScrapeResult {
  instagram: InstagramData | null;
  facebook: FacebookData | null;
  instagramError?: string;
  facebookError?: string;
}

export interface ResonanceDimension {
  name: string;
  score: number;
  grade: string;
  insight: string;
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  area: string;
  current: string;
  suggestion: string;
}

export interface ResonanceScoreResult {
  overallScore: number;
  grade: string;
  summary: string;
  dimensions: ResonanceDimension[];
  strengths: string[];
  gaps: string[];
  recommendations: Recommendation[];
  platformsAnalyzed: string[];
}
