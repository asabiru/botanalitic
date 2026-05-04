export interface CompetitorProfile {
  name: string;
  url: string;
  type: "telegram_bot" | "web_service" | "mobile_app";
  features: string[];
  pricing?: string;
  lastChecked: Date;
}

export interface CompetitorFeature {
  feature: string;
  competitors: string[];
  weHaveIt: boolean;
  priority: "high" | "medium" | "low";
  effort: "small" | "medium" | "large";
  description: string;
}

export interface CompetitorReport {
  generatedAt: Date;
  competitors: CompetitorProfile[];
  featureMatrix: CompetitorFeature[];
  topIdeas: CompetitorIdea[];
  summary: string;
}

export interface CompetitorIdea {
  title: string;
  source: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: "feature" | "ux" | "monetization" | "marketing" | "data";
}
