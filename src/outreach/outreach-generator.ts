import type { CandidateProfile, JobData, OutreachMessage, OutreachType, ReferralContact } from "../shared/types.ts";

function sharedSignals(candidate: CandidateProfile, job: JobData, contact: ReferralContact): string[] {
  const sharedSkills = candidate.skills.value.filter((skill) => job.skills.value.includes(skill)).slice(0, 3);
  return [
    ...sharedSkills.map((skill) => `shared ${skill} relevance`),
    contact.relationship === "alumni" ? "alumni-style warm path" : `${contact.team} team relevance`,
    `${job.company} ${job.title} opening`
  ];
}

function spamScore(body: string): number {
  let score = 5;
  if (body.length > 900) score += 25;
  if (/urgent|desperate|guarantee|please please|kindly do the needful/i.test(body)) score += 25;
  if ((body.match(/!/g) ?? []).length > 1) score += 10;
  return Math.min(100, score);
}

function aiRisk(body: string): number {
  let risk = 20;
  if (/I hope this message finds you well/i.test(body)) risk += 30;
  if (/leveraging my extensive experience|dynamic professional|passionate about innovation/i.test(body)) risk += 25;
  if (body.length < 420) risk -= 8;
  return Math.max(0, Math.min(100, risk));
}

export function generateOutreach(candidate: CandidateProfile, job: JobData, contact: ReferralContact, type: OutreachType): OutreachMessage {
  const skills = candidate.skills.value.filter((skill) => job.skills.value.includes(skill)).slice(0, 2).join(" and ") || "relevant experience";
  const shortRole = job.title.replace(/\s+/g, " ");
  const subject = type.includes("email") || type === "recruiter_intro" ? `Referral question for ${shortRole} at ${job.company}` : undefined;
  const intro = `Hi ${contact.name.split(" ")[0]}, I noticed your work around ${contact.team} at ${job.company}.`;
  const context = `I'm exploring the ${shortRole} role and my background includes ${skills}.`;
  const ask = contact.relationship === "recruiter"
    ? "Would it be reasonable to share my profile, or is there someone else on the hiring team you recommend?"
    : "If the role feels aligned, would you be open to a quick pointer on the team or a referral?";
  const close = "Happy to send a concise resume snapshot. Thanks either way.";
  const body = type === "linkedin_dm"
    ? `${intro} ${context} ${ask} ${close}`
    : [
      intro,
      "",
      `${context} I am mapping my resume only to experience I can back up, and this role looks close to my recent work.`,
      "",
      ask,
      "",
      close,
      candidate.name
    ].join("\n");

  return {
    type,
    ...(subject ? { subject } : {}),
    body,
    tone: "professional, human, concise",
    spamScore: spamScore(body),
    aiDetectionRisk: aiRisk(body),
    personalizationSignals: sharedSignals(candidate, job, contact),
    warnings: body.length > 1000 ? ["Message is long; shorten before sending."] : []
  };
}
