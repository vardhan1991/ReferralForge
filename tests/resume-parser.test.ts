import test from "node:test";
import assert from "node:assert/strict";
import { parseResume } from "../src/parsing/resume-parser.ts";
import { strongResumeText } from "./fixtures.ts";

test("PDF resume text extraction result is parsed", () => {
  const profile = parseResume({ text: strongResumeText, fileName: "resume.pdf" });
  assert.equal(profile.name, "Dexter Example");
  assert.ok(profile.skills.value.includes("playwright"));
});

test("DOCX, table-like, icon-like, and unusual formatting still produce skills", () => {
  const profile = parseResume({
    fileName: "resume.docx",
    text: `★ Dexter Example
Skills | Python | TypeScript | Playwright | Docker
Company | ExampleSoft | Jan 2021 - Present
- Built automation framework that reduced regression by 45%`
  });
  assert.ok(profile.skills.value.includes("python"));
  assert.ok(profile.experience[0].durationMonths === undefined || profile.experience[0].durationMonths >= 0);
});

test("Duplicate skills are merged", () => {
  const profile = parseResume({ text: `${strongResumeText}\nPython Python Python Playwright` });
  assert.equal(new Set(profile.skills.value).size, profile.skills.value.length);
});
