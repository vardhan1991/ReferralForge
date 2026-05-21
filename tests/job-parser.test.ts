import test from "node:test";
import assert from "node:assert/strict";
import { parseJobDescription } from "../src/parsing/job-parser.ts";
import { strongJobText } from "./fixtures.ts";

test("LinkedIn URL parsing extracts provider and skills", () => {
  const job = parseJobDescription({ url: "https://www.linkedin.com/jobs/view/senior-sdet", text: strongJobText });
  assert.equal(job.source, "linkedin");
  assert.equal(job.company, "Acme Cloud");
  assert.ok(job.skills.value.includes("playwright"));
  assert.equal(job.seniority.value, "Senior");
});

test("Indeed URL parsing is supported", () => {
  const job = parseJobDescription({ url: "https://in.indeed.com/viewjob?jk=123&company=Acme", text: strongJobText });
  assert.equal(job.source, "indeed");
  assert.ok(job.keywords.length > 5);
});

test("FoundIt and Monster URLs are categorized", () => {
  assert.equal(parseJobDescription({ url: "https://www.foundit.in/job/qa-lead", text: strongJobText }).source, "foundit");
  assert.equal(parseJobDescription({ url: "https://www.monsterindia.com/job/test-architect", text: strongJobText }).source, "monster");
});

test("Raw pasted JD deduplicates keywords", () => {
  const job = parseJobDescription({ text: `${strongJobText} Python Python Python` });
  assert.equal(job.source, "raw");
  assert.equal(new Set(job.keywords).size, job.keywords.length);
});

test("Broken and unsupported links return fallback warnings", () => {
  const broken = parseJobDescription({ url: "not a url", text: "captcha verify you are human" });
  assert.equal(broken.source, "unsupported");
  assert.ok(broken.warnings.some((warning) => /captcha/i.test(warning)));
});

test("Incomplete descriptions are marked", () => {
  const job = parseJobDescription({ text: "Engineer. Python." });
  assert.ok(job.warnings.some((warning) => /incomplete/i.test(warning)));
});
