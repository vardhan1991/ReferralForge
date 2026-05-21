import test from "node:test";
import assert from "node:assert/strict";
import { strongJobText, strongResumeText } from "../fixtures.ts";

process.env.PORT = "5174";
const { server } = await import("../../src/server.ts");
const baseUrl = "http://localhost:5174";

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  assert.equal(response.ok, true);
  return await response.json() as Record<string, unknown>;
}

test("end-to-end API flow parses, scores, finds referrals, and generates outreach", async () => {
  const jobResponse = await post("/api/jobs/parse", { url: "https://www.linkedin.com/jobs/view/senior-sdet", text: strongJobText });
  const resumeResponse = await post("/api/resumes/parse", { text: strongResumeText });
  const job = jobResponse.job;
  const candidate = resumeResponse.candidate;
  const analysisResponse = await post("/api/analyze", { job, candidate });
  assert.ok((analysisResponse.analysis as { overallScore: number }).overallScore > 50);
  const referralResponse = await post("/api/referrals/search", { job, candidate });
  const contacts = referralResponse.contacts as Array<Record<string, unknown>>;
  assert.ok(contacts.length >= 3);
  const outreachResponse = await post("/api/outreach/generate", { job, candidate, contact: contacts[0], type: "linkedin_dm" });
  assert.match((outreachResponse.message as { body: string }).body, /Acme Cloud/);
});

test.after(() => {
  server.close();
});
