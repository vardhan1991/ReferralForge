import type { CandidateProfile, ExperienceItem } from "../shared/types.ts";
import { cleanText } from "../shared/schema.ts";
import { detectSkills, id, monthDiff, sentences, uniqueSorted } from "../lib/text.ts";

export interface ResumeParseInput {
  text: string;
  fileName?: string;
  documentWarnings?: string[];
}

function extractName(text: string): string {
  const firstLine = text.split("\n").map((line) => line.trim()).find((line) => /^[A-Z][A-Za-z .'-]{2,60}$/.test(line));
  return firstLine ?? "Candidate";
}

function extractLinks(text: string): Record<string, string> {
  const links: Record<string, string> = {};
  for (const url of text.match(/https?:\/\/[^\s)]+/gi) ?? []) {
    const lower = url.toLowerCase();
    if (lower.includes("linkedin")) links.linkedin = url;
    else if (lower.includes("github")) links.github = url;
    else links[`link${Object.keys(links).length + 1}`] = url;
  }
  return links;
}

function linesAfter(text: string, heading: RegExp): string[] {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^(experience|education|skills|projects|certifications|summary|achievements)\b/i.test(line) && out.length) break;
    out.push(line.replace(/^[-*•]\s*/, ""));
    if (out.length >= 12) break;
  }
  return out;
}

function extractExperience(text: string): ExperienceItem[] {
  const actionPattern = /\b(built|led|created|improved|reduced|increased|designed|implemented|tested|owned|managed|worked|helped)\b/i;
  const bullets = sentences(text).filter((line) => actionPattern.test(line));
  const companies = [...text.matchAll(/\b(?:at|@)\s+([A-Z][A-Za-z0-9 &.-]{2,50})/g)].map((match) => match[1] ?? "");
  const month = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*";
  const dateToken = `(?:${month}\\s+\\d{4}|\\d{4})`;
  const dateMatch = text.match(new RegExp(`(${dateToken})\\s*[-]\\s*((?:Present|Current)|${dateToken})`, "i"));
  const startDate = dateMatch?.[1];
  const endDate = dateMatch?.[2];
  return [{
    company: companies[0] || "Company needs review",
    title: text.match(/\b(Senior|Lead|Principal|Staff)?\s*(SDET|QA Engineer|Software Engineer|Test Architect|Developer|Manager)\b/i)?.[0] ?? "Role needs review",
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    durationMonths: monthDiff(startDate, endDate),
    bullets: bullets.slice(0, 8)
  }];
}

export function parseResume(input: ResumeParseInput): CandidateProfile {
  const text = cleanText(input.text);
  const skills = detectSkills(text);
  const warnings = [...(input.documentWarnings ?? [])];
  if (text.length < 160) warnings.push("Resume content is short; upload the full resume for stronger scoring.");
  if (!skills.length) warnings.push("No known skills were detected; check formatting or add a dedicated skills section.");

  const education = linesAfter(text, /education/i).slice(0, 6);
  const certifications = linesAfter(text, /certifications?/i).slice(0, 8);
  const projects = linesAfter(text, /projects?/i).slice(0, 8);
  const achievements = sentences(text).filter((line) => /\d+%|\$\d+|\b\d+x\b|\b\d+\+/.test(line)).slice(0, 12);

  return {
    id: id("candidate"),
    name: extractName(text),
    email: text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0],
    phone: text.match(/(?:\+?\d[\s-]?){8,14}\d/)?.[0],
    summary: linesAfter(text, /summary|profile|objective/i).slice(0, 3).join(" ") || sentences(text)[0] || "",
    skills: { value: skills, confidence: skills.length ? 0.84 : 0.35, evidence: skills.slice(0, 10) },
    experience: extractExperience(text),
    education,
    certifications: uniqueSorted(certifications),
    projects,
    achievements,
    links: extractLinks(text),
    preferredRoles: [],
    preferredLocations: [],
    rawText: text,
    warnings,
    createdAt: new Date().toISOString()
  };
}
