import type { CandidateProfile, JobData, RewriteResult, ToneStyle } from "../shared/types.ts";

const tonePrefix: Record<ToneStyle, string> = {
  concise: "Delivered",
  executive: "Led",
  technical: "Engineered",
  leadership: "Directed"
};

function rewriteBullet(original: string, job: JobData, tone: ToneStyle): string {
  const cleaned = original
    .replace(/\bresponsible for\b/gi, "owned")
    .replace(/\bworked on\b/gi, "contributed to")
    .replace(/\bhelped\b/gi, "supported");
  const matchingSkill = job.skills.value.find((skill) => cleaned.toLowerCase().includes(skill.toLowerCase()));
  const opener = tonePrefix[tone];
  const normalized = cleaned.replace(/^[A-Z][a-z]+ed\s+/i, "");
  const keywordClause = matchingSkill ? ` with ${matchingSkill}` : "";
  return `${opener} ${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}${keywordClause}`.replace(/\s+/g, " ").trim();
}

function buildSummary(candidate: CandidateProfile, job: JobData, tone: ToneStyle): string {
  const skills = candidate.skills.value.filter((skill) => job.skills.value.includes(skill)).slice(0, 5);
  const role = job.title === "Role title needs review" ? "target role" : job.title;
  const base = candidate.summary || `${candidate.name} has relevant experience documented in the uploaded resume.`;
  const emphasis = skills.length ? ` Emphasize ${skills.join(", ")} for the ${role}.` : ` Emphasize verified experience that maps to the ${role}.`;
  if (tone === "executive") return `${base} Position the profile around strategic ownership, measurable outcomes, and cross-functional influence.${emphasis}`;
  if (tone === "technical") return `${base} Lead with implementation depth, tooling, architecture decisions, and production-quality delivery.${emphasis}`;
  if (tone === "leadership") return `${base} Highlight mentoring, standards, stakeholder alignment, and repeatable operating systems.${emphasis}`;
  return `${base}${emphasis}`;
}

export function rewriteResume(candidate: CandidateProfile, job: JobData, tone: ToneStyle = "concise"): RewriteResult {
  const bullets = candidate.experience
    .flatMap((item) => item.bullets)
    .slice(0, 8)
    .map((original) => ({
      original,
      rewritten: rewriteBullet(original, job, tone),
      guardrail: "No new company, title, tool, team size, metric, certification, or tenure was added."
    }));

  const achievementSuggestions = candidate.experience
    .flatMap((item) => item.bullets)
    .filter((bullet) => !/\d+%|\$\d+|\b\d+x\b|\b\d+\+/.test(bullet))
    .slice(0, 5)
    .map((bullet) => `If accurate, add measurable scope to: "${bullet.slice(0, 120)}"`);

  return {
    tone,
    summary: buildSummary(candidate, job, tone),
    bullets,
    achievementSuggestions,
    keywordDensity: job.atsTerms.slice(0, 16).map((keyword) => ({
      keyword,
      present: candidate.rawText.toLowerCase().includes(keyword.toLowerCase())
    })),
    warnings: [
      "Insufficient facts are never filled in automatically.",
      "Metrics are suggested as prompts only; user must provide verified numbers."
    ]
  };
}
