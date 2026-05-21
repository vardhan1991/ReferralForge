import type { CandidateProfile, JobData, MatchAnalysis } from "../shared/types.ts";
import { clampScore, cosineSimilarity, id, uniqueSorted } from "../lib/text.ts";

function overlap(left: string[], right: string[]): string[] {
  const leftSet = new Set(left.map((item) => item.toLowerCase()));
  return uniqueSorted(right.filter((item) => leftSet.has(item.toLowerCase())));
}

function impactScore(candidate: CandidateProfile): number {
  const bullets = candidate.experience.flatMap((item) => item.bullets);
  if (!bullets.length) return 35;
  const quantified = bullets.filter((bullet) => /\d+%|\$\d+|\b\d+x\b|\b\d+\+|\b\d+\s*(users|teams|services|tests|hours|days)\b/i.test(bullet)).length;
  const action = bullets.filter((bullet) => /\b(led|built|improved|reduced|increased|designed|automated|optimized|launched)\b/i.test(bullet)).length;
  return clampScore((quantified / bullets.length) * 55 + (action / bullets.length) * 35 + 10);
}

export function analyzeMatch(candidate: CandidateProfile, job: JobData): MatchAnalysis {
  const candidateSkills = candidate.skills.value;
  const requiredSkills = job.skills.value;
  const skillOverlap = overlap(candidateSkills, requiredSkills);
  const missingSkills = requiredSkills.filter((skill) => !skillOverlap.some((item) => item.toLowerCase() === skill.toLowerCase()));
  const keywordOverlap = overlap([...candidateSkills, ...candidate.rawText.toLowerCase().split(/\W+/)], job.keywords);
  const keywordCoverage = job.keywords.length ? (keywordOverlap.length / job.keywords.length) * 100 : 45;
  const skillCoverage = requiredSkills.length ? (skillOverlap.length / requiredSkills.length) * 100 : 45;
  const semanticSimilarity = cosineSimilarity(candidate.rawText, job.rawText);
  const impactStrength = impactScore(candidate);
  const atsCompatibility = clampScore(skillCoverage * 0.52 + keywordCoverage * 0.36 + (candidate.summary ? 12 : 0));
  const roleAlignment = clampScore(semanticSimilarity * 0.48 + skillCoverage * 0.42 + impactStrength * 0.1);
  const overallScore = clampScore(atsCompatibility * 0.32 + semanticSimilarity * 0.24 + keywordCoverage * 0.18 + impactStrength * 0.12 + roleAlignment * 0.14);
  const weakPhrases = candidate.experience.flatMap((item) => item.bullets).filter((bullet) => /\b(responsible for|worked on|helped|involved in|various)\b/i.test(bullet));
  const quantifiedImpactGaps = candidate.experience
    .flatMap((item) => item.bullets)
    .filter((bullet) => !/\d+%|\$\d+|\b\d+x\b|\b\d+\+/.test(bullet))
    .slice(0, 6);

  const recommendations = [
    missingSkills.length
      ? `Add truthful evidence for missing priority skills: ${missingSkills.slice(0, 6).join(", ")}.`
      : "Skill coverage is strong; keep the skills section concise and role-specific.",
    weakPhrases.length ? "Replace passive phrases such as responsible for/worked on with action-result bullets." : "Bullet phrasing is mostly action-oriented.",
    quantifiedImpactGaps.length
      ? "Where accurate, attach scope, scale, frequency, or impact metrics to the highest-value bullets."
      : "Quantified impact is visible in the resume.",
    keywordCoverage < 55
      ? "Mirror the JD's ATS terms naturally in summary, skills, and recent experience."
      : "Keyword coverage is healthy; avoid stuffing duplicate terms."
  ];

  return {
    id: id("match"),
    overallScore,
    breakdown: {
      atsCompatibility,
      semanticSimilarity,
      keywordCoverage: clampScore(keywordCoverage),
      impactStrength,
      roleAlignment
    },
    missingSkills: {
      value: missingSkills,
      confidence: requiredSkills.length ? 0.84 : 0.44,
      evidence: missingSkills.slice(0, 8)
    },
    keywordOverlap,
    weakPhrases,
    quantifiedImpactGaps,
    recommendations,
    sectionScores: {
      summary: candidate.summary ? 76 : 30,
      skills: clampScore(skillCoverage),
      experience: clampScore((impactStrength + semanticSimilarity) / 2),
      education: candidate.education.length ? 70 : 45,
      certifications: candidate.certifications.length ? 72 : 50
    },
    heatmap: [
      ...requiredSkills.map((skill) => ({ label: skill, score: skillOverlap.includes(skill) ? 90 : 28, kind: "skill" as const })),
      ...job.keywords.slice(0, 10).map((keyword) => ({ label: keyword, score: keywordOverlap.includes(keyword) ? 86 : 35, kind: "keyword" as const }))
    ],
    antiHallucinationNotes: [
      "Recommendations only ask the candidate to add evidence when it is truthful.",
      "Rewrite generation is constrained to existing resume context and marks missing facts as insufficient data."
    ],
    createdAt: new Date().toISOString()
  };
}
