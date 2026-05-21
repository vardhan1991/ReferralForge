export type IntakeSource = "linkedin" | "indeed" | "foundit" | "monster" | "raw" | "file" | "unsupported";
export type ToneStyle = "concise" | "executive" | "technical" | "leadership";
export type OutreachType = "linkedin_dm" | "cold_email" | "referral_ask" | "follow_up" | "alumni_networking" | "recruiter_intro" | "hiring_manager";

export interface Evidence<T> {
  value: T;
  confidence: number;
  evidence: string[];
}

export interface JobData {
  id: string;
  source: IntakeSource;
  sourceUrl?: string;
  title: string;
  company: string;
  location: string;
  seniority: Evidence<string>;
  skills: Evidence<string[]>;
  responsibilities: string[];
  qualifications: string[];
  keywords: string[];
  atsTerms: string[];
  rawText: string;
  warnings: string[];
  createdAt: string;
}

export interface ExperienceItem {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
  bullets: string[];
}

export interface CandidateProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  summary: string;
  skills: Evidence<string[]>;
  experience: ExperienceItem[];
  education: string[];
  certifications: string[];
  projects: string[];
  achievements: string[];
  links: Record<string, string>;
  preferredRoles: string[];
  preferredLocations: string[];
  salaryExpectation?: string;
  rawText: string;
  warnings: string[];
  createdAt: string;
}

export interface ScoreBreakdown {
  atsCompatibility: number;
  semanticSimilarity: number;
  keywordCoverage: number;
  impactStrength: number;
  roleAlignment: number;
}

export interface MatchAnalysis {
  id: string;
  overallScore: number;
  breakdown: ScoreBreakdown;
  missingSkills: Evidence<string[]>;
  keywordOverlap: string[];
  weakPhrases: string[];
  quantifiedImpactGaps: string[];
  recommendations: string[];
  sectionScores: Record<string, number>;
  heatmap: Array<{ label: string; score: number; kind: "skill" | "keyword" | "section" }>;
  antiHallucinationNotes: string[];
  createdAt: string;
}

export interface RewriteResult {
  tone: ToneStyle;
  summary: string;
  bullets: Array<{ original: string; rewritten: string; guardrail: string }>;
  achievementSuggestions: string[];
  keywordDensity: Array<{ keyword: string; present: boolean }>;
  warnings: string[];
}

export interface ReferralContact {
  id: string;
  name: string;
  title: string;
  team: string;
  company: string;
  source: "linkedin_public" | "alumni" | "company_people" | "recruiter_directory" | "mock_adapter";
  relationship: "alumni" | "recruiter" | "employee" | "second_degree" | "hiring_manager";
  confidence: number;
  referralUsefulness: number;
  responseLikelihood: number;
  whyRelevant: string[];
  profileUrl?: string;
}

export interface OutreachMessage {
  type: OutreachType;
  subject?: string;
  body: string;
  tone: string;
  spamScore: number;
  aiDetectionRisk: number;
  personalizationSignals: string[];
  warnings: string[];
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  candidateId: string;
  company: string;
  role: string;
  stage: "saved" | "tailored" | "outreach" | "referred" | "applied" | "interview" | "offer" | "rejected";
  outreachStatus: "not_started" | "drafted" | "sent" | "followed_up" | "responded";
  referralStatus: "none" | "targeted" | "requested" | "confirmed" | "declined";
  resumeVersion: string;
  notes: string;
  updatedAt: string;
}

export interface UserProfileMemory {
  id: string;
  masterProfile?: CandidateProfile;
  careerHistory: ExperienceItem[];
  skills: string[];
  preferredRoles: string[];
  leadershipExamples: string[];
  techStack: string[];
  achievements: string[];
  preferredLocations: string[];
  salaryExpectations?: string;
  portfolioLinks: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
