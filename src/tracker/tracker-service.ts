import type { ApplicationRecord, CandidateProfile, JobData } from "../shared/types.ts";
import { id } from "../lib/text.ts";

export function createApplication(job: JobData, candidate: CandidateProfile): ApplicationRecord {
  return {
    id: id("app"),
    jobId: job.id,
    candidateId: candidate.id,
    company: job.company,
    role: job.title,
    stage: "tailored",
    outreachStatus: "drafted",
    referralStatus: "targeted",
    resumeVersion: `${candidate.name}-${job.company}-${new Date().toISOString().slice(0, 10)}`,
    notes: "Created from match analysis.",
    updatedAt: new Date().toISOString()
  };
}
