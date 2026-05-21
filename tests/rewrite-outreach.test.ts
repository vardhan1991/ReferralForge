import test from "node:test";
import assert from "node:assert/strict";
import { rewriteResume } from "../src/analysis/rewrite-engine.ts";
import { generateOutreach } from "../src/outreach/outreach-generator.ts";
import { parseJobDescription } from "../src/parsing/job-parser.ts";
import { parseResume } from "../src/parsing/resume-parser.ts";
import { findReferralContacts } from "../src/referrals/referral-engine.ts";
import { strongJobText, strongResumeText } from "./fixtures.ts";

test("Resume rewrite preserves existing experience and avoids fabricated facts", () => {
  const job = parseJobDescription({ text: strongJobText });
  const candidate = parseResume({ text: strongResumeText });
  const rewrite = rewriteResume(candidate, job, "technical");
  const joined = JSON.stringify(rewrite).toLowerCase();
  assert.doesNotMatch(joined, /kubernetes|aws certified|fortune 500|10 years/);
  assert.ok(rewrite.bullets.every((bullet) => /No new company/.test(bullet.guardrail)));
});

test("Outreach is concise, personalized, and not desperate", () => {
  const job = parseJobDescription({ text: strongJobText });
  const candidate = parseResume({ text: strongResumeText });
  const [contact] = findReferralContacts(candidate, job);
  const message = generateOutreach(candidate, job, contact, "linkedin_dm");
  assert.ok(message.body.includes(job.company));
  assert.ok(message.body.includes(contact.name.split(" ")[0]));
  assert.ok(message.body.length < 700);
  assert.doesNotMatch(message.body, /desperate|I hope this message finds you well/i);
  assert.ok(message.spamScore < 40);
  assert.ok(message.aiDetectionRisk < 60);
});
