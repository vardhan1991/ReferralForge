import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeMatch } from "./analysis/match-engine.ts";
import { rewriteResume } from "./analysis/rewrite-engine.ts";
import { generateOutreach } from "./outreach/outreach-generator.ts";
import { extractDocumentText } from "./parsing/document-extractor.ts";
import { parseJobDescription } from "./parsing/job-parser.ts";
import { parseResume } from "./parsing/resume-parser.ts";
import { findReferralContacts } from "./referrals/referral-engine.ts";
import { assertObject, assertSafeUpload, cleanText, optionalString, stringField } from "./shared/schema.ts";
import type { CandidateProfile, JobData, OutreachType, ReferralContact, ToneStyle, UserProfileMemory } from "./shared/types.ts";
import { log } from "./observability/logger.ts";
import { RateLimiter } from "./security/rate-limit.ts";
import { JsonStore } from "./storage/json-store.ts";
import { createApplication } from "./tracker/tracker-service.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const webRoot = join(root, "web");
const store = new JsonStore();
const limiter = new RateLimiter(90, 60_000);

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  assertObject(parsed, "Request body");
  return parsed;
}

async function staticFile(pathname: string, res: ServerResponse): Promise<void> {
  const safePath = normalize(pathname === "/" ? "/index.html" : pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(webRoot, safePath);
  const type = new Map([
    [".html", "text/html; charset=utf-8"],
    [".css", "text/css; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".svg", "image/svg+xml"]
  ]).get(extname(filePath)) ?? "text/plain; charset=utf-8";
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "content-type": type });
    res.end(content);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  const rate = limiter.take(req.socket.remoteAddress ?? "local");
  if (!rate.allowed) return sendJson(res, 429, { error: "Rate limit exceeded", resetAt: rate.resetAt });

  if (!url.pathname.startsWith("/api/")) return staticFile(url.pathname, res);

  const traceId = crypto.randomUUID().slice(0, 10);
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, service: "ReferralForge", traceId });
    }

    if (req.method === "POST" && url.pathname === "/api/jobs/parse") {
      const body = await readJson(req);
      let fileText = "";
      const fileName = optionalString(body, "fileName");
      const fileBase64 = optionalString(body, "fileBase64");
      const warnings: string[] = [];
      if (fileName && fileBase64) {
        assertSafeUpload(fileName, fileBase64);
        const extracted = await extractDocumentText(fileName, fileBase64);
        fileText = extracted.text;
        warnings.push(...extracted.warnings);
      }
      const job = parseJobDescription({ url: optionalString(body, "url"), text: stringField(body, "text"), fileName, fileText });
      job.warnings.push(...warnings);
      await store.mutate((data) => data.jobs.unshift(job));
      return sendJson(res, 200, { job, traceId });
    }

    if (req.method === "POST" && url.pathname === "/api/resumes/parse") {
      const body = await readJson(req);
      let text = stringField(body, "text");
      const fileName = optionalString(body, "fileName");
      const fileBase64 = optionalString(body, "fileBase64");
      const warnings: string[] = [];
      if (fileName && fileBase64) {
        assertSafeUpload(fileName, fileBase64);
        const extracted = await extractDocumentText(fileName, fileBase64);
        text = [text, extracted.text].filter(Boolean).join("\n\n");
        warnings.push(...extracted.warnings);
      }
      const candidate = parseResume({ text: cleanText(text), fileName, documentWarnings: warnings });
      await store.mutate((data) => data.candidates.unshift(candidate));
      return sendJson(res, 200, { candidate, traceId });
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const body = await readJson(req);
      assertObject(body.job, "job");
      assertObject(body.candidate, "candidate");
      const analysis = analyzeMatch(body.candidate as unknown as CandidateProfile, body.job as unknown as JobData);
      await store.mutate((data) => {
        data.analyses.unshift(analysis);
        data.applications.unshift(createApplication(body.job as unknown as JobData, body.candidate as unknown as CandidateProfile));
      });
      return sendJson(res, 200, { analysis, traceId });
    }

    if (req.method === "POST" && url.pathname === "/api/rewrite") {
      const body = await readJson(req);
      assertObject(body.job, "job");
      assertObject(body.candidate, "candidate");
      const tone = (stringField(body, "tone", "concise") as ToneStyle) || "concise";
      return sendJson(res, 200, { rewrite: rewriteResume(body.candidate as unknown as CandidateProfile, body.job as unknown as JobData, tone), traceId });
    }

    if (req.method === "POST" && url.pathname === "/api/referrals/search") {
      const body = await readJson(req);
      assertObject(body.job, "job");
      assertObject(body.candidate, "candidate");
      return sendJson(res, 200, { contacts: findReferralContacts(body.candidate as unknown as CandidateProfile, body.job as unknown as JobData), traceId });
    }

    if (req.method === "POST" && url.pathname === "/api/outreach/generate") {
      const body = await readJson(req);
      assertObject(body.job, "job");
      assertObject(body.candidate, "candidate");
      assertObject(body.contact, "contact");
      const type = (stringField(body, "type", "linkedin_dm") as OutreachType) || "linkedin_dm";
      const message = generateOutreach(
        body.candidate as unknown as CandidateProfile,
        body.job as unknown as JobData,
        body.contact as unknown as ReferralContact,
        type
      );
      return sendJson(res, 200, { message, traceId });
    }

    if (req.method === "GET" && url.pathname === "/api/tracker/applications") {
      const data = await store.read();
      return sendJson(res, 200, { applications: data.applications, traceId });
    }

    if (req.method === "GET" && url.pathname === "/api/profile") {
      const data = await store.read();
      return sendJson(res, 200, { profile: data.profile ?? null, traceId });
    }

    if (req.method === "POST" && url.pathname === "/api/profile") {
      const body = await readJson(req);
      const profile = {
        id: "profile_default",
        careerHistory: [],
        skills: [],
        preferredRoles: [],
        leadershipExamples: [],
        techStack: [],
        achievements: [],
        preferredLocations: [],
        portfolioLinks: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...body
      } as UserProfileMemory;
      await store.mutate((data) => { data.profile = profile; });
      return sendJson(res, 200, { profile, traceId });
    }

    return sendJson(res, 404, { error: "Route not found", traceId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log("error", "request_failed", { traceId, path: url.pathname, message });
    return sendJson(res, /validation/i.test(message) || /unsupported/i.test(message) ? 400 : 500, { error: message, traceId });
  }
}

const port = Number(process.env.PORT ?? 4173);
const server = createServer((req, res) => void route(req, res));
server.listen(port, () => log("info", "server_started", { port, url: `http://localhost:${port}` }));

export { server };
