import { createHash, randomUUID } from "node:crypto";

export const SKILL_DICTIONARY = [
  "accessibility", "agile", "ai testing", "api testing", "automation", "aws", "azure", "beautifulsoup",
  "ci/cd", "cypress", "data analysis", "docker", "fastapi", "git", "graphql", "java", "javascript",
  "jest", "langchain", "leadership", "llm evaluation", "machine learning", "microservices", "next.js",
  "node.js", "openai", "performance testing", "playwright", "postgresql", "prisma", "python", "qa",
  "react", "redis", "selenium", "sql", "tailwindcss", "test architecture", "typescript", "ux", "zod"
];

export function id(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function stableId(prefix: string, text: string): string {
  return `${prefix}_${createHash("sha1").update(text).digest("hex").slice(0, 10)}`;
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z0-9.+/#-]{1,}/g) ?? [];
}

export function sentences(text: string): string[] {
  return text
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 18);
}

export function detectSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return uniqueSorted(SKILL_DICTIONARY.filter((skill) => lower.includes(skill)));
}

export function extractKeywords(text: string, limit = 32): string[] {
  const stop = new Set(["and", "the", "with", "for", "you", "are", "our", "will", "this", "that", "from", "have", "has", "your", "job", "role", "team"]);
  const counts = new Map<string, number>();
  for (const word of words(text)) {
    if (word.length < 3 || stop.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

export function cosineSimilarity(leftText: string, rightText: string): number {
  const left = new Map<string, number>();
  const right = new Map<string, number>();
  for (const word of words(leftText)) left.set(word, (left.get(word) ?? 0) + 1);
  for (const word of words(rightText)) right.set(word, (right.get(word) ?? 0) + 1);
  const vocab = new Set([...left.keys(), ...right.keys()]);
  let dot = 0;
  let leftMag = 0;
  let rightMag = 0;
  for (const token of vocab) {
    const a = left.get(token) ?? 0;
    const b = right.get(token) ?? 0;
    dot += a * b;
    leftMag += a * a;
    rightMag += b * b;
  }
  if (!leftMag || !rightMag) return 0;
  return Math.round((dot / (Math.sqrt(leftMag) * Math.sqrt(rightMag))) * 100);
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function inferSeniority(text: string): { value: string; confidence: number; evidence: string[] } {
  const lower = text.toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ["Executive", /\b(vp|vice president|chief|head of|director)\b/],
    ["Senior", /\b(senior|sr\.|lead|principal|staff|architect)\b/],
    ["Mid-level", /\b(associate|software engineer|qa engineer|sdet|analyst)\b/],
    ["Entry-level", /\b(junior|jr\.|graduate|intern|entry[- ]level)\b/]
  ];
  for (const [value, pattern] of rules) {
    const match = lower.match(pattern);
    if (match) return { value, confidence: value === "Mid-level" ? 0.68 : 0.82, evidence: [match[0]] };
  }
  return { value: "Insufficient data", confidence: 0.35, evidence: [] };
}

export function monthDiff(start?: string, end?: string): number | undefined {
  if (!start) return undefined;
  const parse = (value: string): Date | undefined => {
    if (/present|current/i.test(value)) return new Date();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  const left = parse(start);
  const right = parse(end ?? "present");
  if (!left || !right) return undefined;
  return Math.max(0, (right.getFullYear() - left.getFullYear()) * 12 + right.getMonth() - left.getMonth());
}
