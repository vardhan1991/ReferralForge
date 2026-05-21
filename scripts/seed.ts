import { JsonStore } from "../src/storage/json-store.ts";
import { parseJobDescription } from "../src/parsing/job-parser.ts";
import { parseResume } from "../src/parsing/resume-parser.ts";
import { analyzeMatch } from "../src/analysis/match-engine.ts";
import { createApplication } from "../src/tracker/tracker-service.ts";

const job = parseJobDescription({
  url: "https://www.linkedin.com/jobs/view/senior-sdet-test-architect",
  text: `Senior SDET Test Architect
Company: Acme Cloud
Location: Bengaluru Hybrid
Responsibilities
- Lead Playwright and API testing strategy across CI/CD pipelines
- Improve automation reliability and quality metrics
Requirements
- Python, TypeScript, Playwright, Docker, PostgreSQL, test architecture, leadership`
});

const candidate = parseResume({
  text: `Dexter Example
dexter@example.com
Summary
Senior QA automation engineer focused on Playwright, Python, TypeScript, API testing, Docker, and CI/CD.
Experience
Lead SDET at ExampleSoft
Jan 2021 - Present
- Built Playwright automation framework that reduced regression time by 45%
- Led API testing standards across 4 product squads
Education
Example University`
});

const analysis = analyzeMatch(candidate, job);
const store = new JsonStore();
await store.write({
  jobs: [job],
  candidates: [candidate],
  analyses: [analysis],
  applications: [createApplication(job, candidate)]
});
console.log("Seeded ReferralForge sample data");
