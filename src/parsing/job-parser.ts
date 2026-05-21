import type { IntakeSource, JobData } from "../shared/types.ts";
import { cleanText } from "../shared/schema.ts";
import { detectSkills, extractKeywords, id, inferSeniority, sentences, uniqueSorted } from "../lib/text.ts";

export interface JobParseInput {
  url?: string;
  text?: string;
  fileName?: string;
  fileText?: string;
}

function sourceFromUrl(url?: string): IntakeSource {
  if (!url) return "raw";
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("indeed.")) return "indeed";
    if (host.includes("foundit.")) return "foundit";
    if (host.includes("monster")) return "monster";
    return "unsupported";
  } catch {
    return "unsupported";
  }
}

function titleFromText(text: string, url?: string): string {
  const titleLine = text.split("\n").find((line) => /\b(engineer|manager|architect|developer|analyst|designer|scientist|specialist|lead)\b/i.test(line));
  if (titleLine) return titleLine.replace(/job description|hiring for/gi, "").trim().slice(0, 90);
  if (url) {
    let slug = "";
    try {
      slug = new URL(url).pathname.split("/").filter(Boolean).pop()?.replace(/[-_]+/g, " ") ?? "";
    } catch {
      slug = "";
    }
    if (slug && /[a-z]/i.test(slug)) return slug.replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 90);
  }
  return "Role title needs review";
}

function companyFromText(text: string, url?: string): string {
  const patterns = [
    /(?:company|organization|employer)\s*[:\-]\s*([A-Z][A-Za-z0-9 &.,-]{2,60})/i,
    /(?:at|with)\s+([A-Z][A-Za-z0-9 &.,-]{2,60})\s+(?:is hiring|for)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.,]$/, "");
  }
  if (url) {
    try {
      const params = new URL(url).searchParams;
      const company = params.get("company") ?? params.get("cmp");
      if (company) return company;
    } catch {
      return "Company needs review";
    }
  }
  return "Company needs review";
}

function locationFromText(text: string): string {
  const match = text.match(/(?:location|job location)\s*[:\-]\s*([A-Za-z ,.-]{2,80})/i);
  if (match?.[1]) return match[1].trim();
  if (/\b(remote|hybrid|onsite)\b/i.test(text)) return text.match(/\b(remote|hybrid|onsite)\b/i)?.[0] ?? "Location needs review";
  return "Location needs review";
}

function sectionLines(text: string, heading: RegExp): string[] {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return [];
  const picked: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^(responsibilities|requirements|qualifications|skills|about|benefits)\b/i.test(line) && picked.length) break;
    if (line.length > 12) picked.push(line.replace(/^[-*•]\s*/, ""));
    if (picked.length >= 8) break;
  }
  return picked;
}

export function parseJobDescription(input: JobParseInput): JobData {
  const combined = cleanText([input.text, input.fileText].filter(Boolean).join("\n\n"));
  const source = input.fileName ? "file" : sourceFromUrl(input.url);
  const warnings: string[] = [];
  if (source === "unsupported" && input.url) warnings.push("Unsupported URL provider; paste the JD text for best extraction.");
  if (/captcha|verify you are human|unusual traffic/i.test(combined)) warnings.push("CAPTCHA detected; switched to user-assisted fallback.");
  if (!combined && input.url) warnings.push("No page scraping was attempted in this safe local build; paste visible JD text to enrich the result.");
  if (combined.length < 120) warnings.push("Description is incomplete; confidence and recommendations may be lower.");

  const text = combined || cleanText(input.url ?? "");
  const skills = detectSkills(text);
  const keywordSource = uniqueSorted([...extractKeywords(text), ...skills]);
  const responsibilityLines = sectionLines(text, /responsibilities|what you.*do|role/i);
  const qualificationLines = sectionLines(text, /requirements|qualifications|what you.*bring|must have/i);
  const fallbackSentences = sentences(text).slice(0, 8);

  return {
    id: id("job"),
    source,
    ...(input.url ? { sourceUrl: input.url } : {}),
    title: titleFromText(text, input.url),
    company: companyFromText(text, input.url),
    location: locationFromText(text),
    seniority: inferSeniority(text),
    skills: { value: skills, confidence: skills.length ? 0.86 : 0.42, evidence: skills.slice(0, 8) },
    responsibilities: responsibilityLines.length ? responsibilityLines : fallbackSentences.slice(0, 4),
    qualifications: qualificationLines.length ? qualificationLines : fallbackSentences.slice(4, 8),
    keywords: keywordSource.slice(0, 32),
    atsTerms: uniqueSorted([...skills, ...keywordSource.filter((keyword) => keyword.length > 4)]).slice(0, 40),
    rawText: text,
    warnings,
    createdAt: new Date().toISOString()
  };
}
