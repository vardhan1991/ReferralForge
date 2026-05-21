import type { CandidateProfile, JobData, ReferralContact } from "../shared/types.ts";
import { id } from "../lib/text.ts";

interface ContactSeed {
  name: string;
  title: string;
  relationship: ReferralContact["relationship"];
  team: string;
}

function baseSeeds(job: JobData): ContactSeed[] {
  const functionWord = /test|qa|sdet/i.test(job.title) ? "Quality Engineering" : /data|ai|ml/i.test(job.title) ? "AI Platform" : "Engineering";
  return [
    { name: "Priya Menon", title: `Senior ${functionWord} Manager`, relationship: "hiring_manager", team: functionWord },
    { name: "Arjun Rao", title: "Technical Recruiter", relationship: "recruiter", team: "Talent" },
    { name: "Maya Iyer", title: `${job.seniority.value === "Senior" ? "Principal" : "Senior"} Engineer`, relationship: "employee", team: functionWord },
    { name: "Nikhil Sharma", title: "Alumni Engineering Lead", relationship: "alumni", team: functionWord },
    { name: "Sara Thomas", title: "2nd Degree Product Engineer", relationship: "second_degree", team: "Product Engineering" }
  ];
}

export function findReferralContacts(candidate: CandidateProfile, job: JobData): ReferralContact[] {
  const candidateSkills = new Set(candidate.skills.value.map((skill) => skill.toLowerCase()));
  return baseSeeds(job).map((seed, index) => {
    const sharedSkillCount = job.skills.value.filter((skill) => candidateSkills.has(skill.toLowerCase())).length;
    const relationshipBoost = seed.relationship === "hiring_manager" ? 18 : seed.relationship === "recruiter" ? 16 : seed.relationship === "alumni" ? 14 : 8;
    const usefulness = Math.min(96, 45 + relationshipBoost + sharedSkillCount * 4 - index * 3);
    const response = Math.min(90, 42 + (seed.relationship === "alumni" ? 18 : 0) + (seed.relationship === "recruiter" ? 12 : 0) + sharedSkillCount * 2);
    const whyRelevant = [
      `${seed.relationship.replace("_", " ")} for ${job.company}`,
      seed.team === "Talent" ? "Likely to understand recruiting process" : `Team alignment with ${job.title}`,
      sharedSkillCount ? `${sharedSkillCount} shared role-relevant skills detected` : "Use manual personalization before outreach"
    ];
    return {
      id: id("contact"),
      name: seed.name,
      title: seed.title,
      team: seed.team,
      company: job.company,
      source: "mock_adapter",
      relationship: seed.relationship,
      confidence: Math.min(0.92, 0.58 + usefulness / 300),
      referralUsefulness: usefulness,
      responseLikelihood: response,
      whyRelevant,
      profileUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${seed.name} ${job.company}`)}`
    };
  }).sort((a, b) => b.referralUsefulness - a.referralUsefulness);
}
