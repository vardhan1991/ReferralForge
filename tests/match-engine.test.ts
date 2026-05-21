import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMatch } from "../src/analysis/match-engine.ts";
import { parseJobDescription } from "../src/parsing/job-parser.ts";
import { parseResume } from "../src/parsing/resume-parser.ts";
import { strongJobText, strongResumeText, weakResumeText } from "./fixtures.ts";

test("Strong technical match scores higher than weak match", () => {
  const job = parseJobDescription({ text: strongJobText });
  const strong = analyzeMatch(parseResume({ text: strongResumeText }), job);
  const weak = analyzeMatch(parseResume({ text: weakResumeText }), job);
  assert.ok(strong.overallScore > weak.overallScore);
  assert.ok(strong.breakdown.keywordCoverage >= weak.breakdown.keywordCoverage);
});

test("Missing skills and weak phrasing are detected", () => {
  const result = analyzeMatch(parseResume({ text: weakResumeText }), parseJobDescription({ text: strongJobText }));
  assert.ok(result.missingSkills.value.length > 0);
  assert.ok(result.weakPhrases.length > 0);
});

test("Leadership-heavy and technical-heavy profiles remain consistent", () => {
  const job = parseJobDescription({ text: strongJobText });
  const leadership = parseResume({ text: `${strongResumeText}\nLed strategy, mentoring, stakeholder alignment, and leadership rituals.` });
  const technical = parseResume({ text: `${strongResumeText}\nBuilt Python TypeScript Playwright Docker PostgreSQL automation.` });
  assert.ok(analyzeMatch(leadership, job).overallScore > 40);
  assert.ok(analyzeMatch(technical, job).overallScore > 40);
});
