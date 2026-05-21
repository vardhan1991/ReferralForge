const state = {
  job: null,
  candidate: null,
  analysis: null,
  contacts: [],
  selectedContact: null,
  rewrite: null,
  message: null
};

const $ = (id) => document.getElementById(id);

const sampleJob = `Senior SDET Test Architect
Company: Acme Cloud
Location: Bengaluru Hybrid
Responsibilities
- Lead Playwright automation, API testing, CI/CD quality gates, and test architecture
- Partner with engineering managers on release reliability metrics
Qualifications
- Python, TypeScript, Playwright, Docker, PostgreSQL, leadership, performance testing`;

const sampleResume = `Dexter Example
dexter@example.com
Summary
Senior QA automation engineer with Playwright, Python, TypeScript, API testing, Docker, CI/CD, and leadership experience.
Experience
Lead SDET at ExampleSoft
Jan 2021 - Present
- Built Playwright automation framework that reduced regression time by 45%
- Led API testing standards across 4 product squads
- Improved CI/CD quality gates for release confidence
Education
Example University`;

const workflowSteps = [
  { key: "job", label: "Job", panel: "jobPanel", done: () => Boolean(state.job) },
  { key: "resume", label: "Resume", panel: "resumePanel", done: () => Boolean(state.candidate), enabled: () => Boolean(state.job) },
  {
    key: "analysis",
    label: "Match",
    panel: "scorePanel",
    done: () => Boolean(state.analysis),
    enabled: () => Boolean(state.job && state.candidate)
  },
  { key: "rewrite", label: "Rewrite", panel: "rewritePanel", done: () => Boolean(state.rewrite), enabled: () => Boolean(state.analysis) },
  { key: "referral", label: "Referrals", panel: "referralPanel", done: () => state.contacts.length > 0, enabled: () => Boolean(state.analysis) },
  { key: "outreach", label: "Outreach", panel: "outreachPanel", done: () => Boolean(state.message), enabled: () => Boolean(state.selectedContact) }
];

function toast(message, kind = "info") {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  if (kind === "error") node.style.borderColor = "var(--danger)";
  $("toastRegion").append(node);
  setTimeout(() => node.remove(), 4200);
}

async function api(path, payload) {
  const response = await fetch(path, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "content-type": "application/json" } : {},
    body: payload ? JSON.stringify(payload) : undefined
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Request failed");
  return json;
}

async function filePayload(input) {
  const file = input.files?.[0];
  if (!file) return {};
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { fileName: file.name, fileBase64: btoa(binary) };
}

function nextStep() {
  return workflowSteps.find((step) => !step.done());
}

function stepEnabled(step) {
  return step.enabled ? step.enabled() : true;
}

function setBusy(button, busy) {
  button.disabled = busy;
  button.dataset.original ??= button.textContent;
  button.textContent = busy ? "Working..." : button.dataset.original;
}

function scrollToPanel(id) {
  $(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetDownstream(from) {
  if (from === "job") state.candidate = null;
  state.analysis = null;
  state.contacts = [];
  state.selectedContact = null;
  state.rewrite = null;
  state.message = null;
  $("scoreValue").textContent = "--";
  $("scoreBreakdown").innerHTML = "";
  $("heatmap").className = "heatmap empty";
  $("heatmap").textContent = "Run analysis to see coverage.";
  $("rewriteOutput").innerHTML = "";
  $("contacts").className = "contact-list empty";
  $("contacts").textContent = "Contacts appear after the match analysis is complete.";
  $("outreachOutput").className = "message-card empty";
  $("outreachOutput").textContent = "Select a contact to generate outreach.";
}

function renderWorkflow() {
  workflowSteps.forEach((step) => {
    const panel = $(step.panel);
    if (!panel) return;
    panel.classList.toggle("locked", !stepEnabled(step));
    panel.classList.toggle("complete", step.done());
    panel.classList.toggle("current", nextStep()?.key === step.key);
  });

  $("workflowStepper").innerHTML = workflowSteps.map((step, index) => {
    const status = step.done() ? "done" : stepEnabled(step) ? "current" : "locked";
    return `<div class="step ${status}"><span>${index + 1}</span><strong>${step.label}</strong></div>`;
  }).join("");

  const next = nextStep();
  const guide = {
    job: ["Start with the job description.", "Paste the JD or load the sample. The resume step unlocks after the job is parsed."],
    resume: ["Now add the resume.", "ReferralForge will extract skills, experience, projects, and impact signals."],
    analysis: ["Run the match analysis.", "This computes ATS coverage, semantic fit, missing skills, and impact gaps."],
    rewrite: [
      "Review gaps and improve wording.",
      "The rewrite step improves phrasing without adding fake tools, metrics, companies, or certifications."
    ],
    referral: ["Find the warmest referral path.", "Contacts are scored by relevance, response likelihood, and referral usefulness."],
    outreach: ["Generate a concise outreach draft.", "Pick the best contact, choose a message type, and personalize before sending."]
  };

  if (!next) {
    $("guideTitle").textContent = "Workflow complete. Your tracker is ready.";
    $("guideCopy").textContent = "Review the outreach, refine the resume language, and move the application through the pipeline.";
  } else {
    const [title, copy] = guide[next.key];
    $("guideTitle").textContent = title;
    $("guideCopy").textContent = copy;
  }

  $("parseResume").disabled = !state.job;
  $("runAnalysis").disabled = !(state.job && state.candidate);
  $("runRewrite").disabled = !state.analysis;
  $("findReferrals").disabled = !state.analysis;
  $("generateOutreach").disabled = !state.selectedContact;
}

function renderAnalysis() {
  if (!state.analysis) return;
  $("scoreValue").textContent = String(state.analysis.overallScore);
  $("scoreBreakdown").innerHTML = Object.entries(state.analysis.breakdown)
    .map(([label, value]) => {
      const readable = label.replace(/[A-Z]/g, " $&");
      return `<div class="metric"><span>${readable}</span><div class="bar"><i style="width:${value}%"></i></div></div>`;
    })
    .join("");
  $("heatmap").classList.remove("empty");
  $("heatmap").innerHTML = state.analysis.heatmap
    .map((item) => `<span class="chip ${item.score > 70 ? "hot" : "cold"}">${item.label} / ${item.score}</span>`)
    .join("");
}

function renderContacts() {
  const box = $("contacts");
  box.classList.remove("empty");
  box.innerHTML = state.contacts.map((contact, index) => `
    <div class="contact ${state.selectedContact?.id === contact.id ? "selected" : ""}" data-contact="${index}" tabindex="0">
      <strong>${contact.name}</strong>
      <p>${contact.title} / ${contact.company}</p>
      <div class="contact-meta">
        <span>${contact.relationship.replace("_", " ")}</span>
        <span>Usefulness ${contact.referralUsefulness}</span>
        <span>Confidence ${Math.round(contact.confidence * 100)}%</span>
      </div>
    </div>
  `).join("");
  box.querySelectorAll("[data-contact]").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedContact = state.contacts[Number(node.dataset.contact)];
      renderContacts();
      renderWorkflow();
    });
  });
}

function renderRewrite(rewrite) {
  const cards = rewrite.bullets.map((item) => `
    <div class="rewrite-card">
      <p><strong>Before:</strong> ${item.original}</p>
      <p><strong>After:</strong> ${item.rewritten}</p>
      <small>${item.guardrail}</small>
    </div>
  `).join("");
  $("rewriteOutput").innerHTML = `
    <div class="rewrite-card"><strong>Summary</strong><p>${rewrite.summary}</p></div>
    ${cards}
  `;
  state.rewrite = rewrite;
  renderWorkflow();
}

async function renderTracker() {
  const { applications } = await api("/api/tracker/applications");
  const stages = ["tailored", "outreach", "referred", "interview"];
  $("kanban").innerHTML = stages.map((stage) => {
    const cards = applications.filter((app) => app.stage === stage);
    const cardHtml = cards.map((app) => `
      <div class="kanban-card">
        <b>${app.role}</b>
        <p>${app.company}</p>
        <small>${app.outreachStatus} / ${app.referralStatus}</small>
      </div>
    `).join("");
    return `<div class="kanban-col"><strong>${stage}</strong>${cardHtml}</div>`;
  }).join("");
}

async function parseJob() {
  const button = $("parseJob");
  setBusy(button, true);
  try {
    const payload = { url: $("jobUrl").value, text: $("jobText").value, ...(await filePayload($("jobFile"))) };
    const { job } = await api("/api/jobs/parse", payload);
    state.job = job;
    resetDownstream("job");
    $("jobSummary").classList.remove("empty");
    $("jobSummary").innerHTML = `<strong>${job.title}</strong><span>${job.company} / ${job.location}</span>`;
    $("resumeSummary").textContent = "Ready for resume input.";
    renderWorkflow();
    toast(`Parsed ${job.title} at ${job.company}`);
    scrollToPanel("resumePanel");
  } finally {
    setBusy(button, false);
  }
}

async function parseResume() {
  const button = $("parseResume");
  setBusy(button, true);
  try {
    const payload = { text: $("resumeText").value, ...(await filePayload($("resumeFile"))) };
    const { candidate } = await api("/api/resumes/parse", payload);
    state.candidate = candidate;
    resetDownstream("resume");
    $("resumeSummary").classList.remove("empty");
    $("resumeSummary").innerHTML = `<strong>${candidate.name}</strong><span>${candidate.skills.value.length} skills detected</span>`;
    renderWorkflow();
    toast(`Parsed profile for ${candidate.name}`);
    scrollToPanel("scorePanel");
  } finally {
    setBusy(button, false);
  }
}

async function runAnalysis() {
  if (!state.job || !state.candidate) throw new Error("Parse a job and resume first.");
  const button = $("runAnalysis");
  $("heatmap").classList.add("skeleton");
  setBusy(button, true);
  try {
    const { analysis } = await api("/api/analyze", { job: state.job, candidate: state.candidate });
    state.analysis = analysis;
    renderAnalysis();
    await renderTracker();
    renderWorkflow();
    toast("Match analysis complete");
    scrollToPanel("rewritePanel");
  } finally {
    $("heatmap").classList.remove("skeleton");
    setBusy(button, false);
  }
}

async function runRewrite() {
  if (!state.job || !state.candidate) throw new Error("Parse a job and resume first.");
  const { rewrite } = await api("/api/rewrite", { job: state.job, candidate: state.candidate, tone: $("rewriteTone").value });
  renderRewrite(rewrite);
  toast("Guarded rewrites generated");
  scrollToPanel("referralPanel");
}

async function findReferrals() {
  if (!state.job || !state.candidate) throw new Error("Parse a job and resume first.");
  const { contacts } = await api("/api/referrals/search", { job: state.job, candidate: state.candidate });
  state.contacts = contacts;
  state.selectedContact = contacts[0] || null;
  renderContacts();
  renderWorkflow();
  toast("Referral contacts ranked");
  scrollToPanel("outreachPanel");
}

async function generateMessage() {
  if (!state.job || !state.candidate || !state.selectedContact) throw new Error("Select a contact first.");
  const { message } = await api("/api/outreach/generate", {
    job: state.job,
    candidate: state.candidate,
    contact: state.selectedContact,
    type: $("messageType").value
  });
  $("outreachOutput").classList.remove("empty");
  const subject = message.subject ? `<strong>${message.subject}</strong>` : "";
  const body = `<p>${message.body.replace(/\n/g, "<br>")}</p>`;
  $("outreachOutput").innerHTML = `${subject}${body}<small>Spam ${message.spamScore} / AI risk ${message.aiDetectionRisk}</small>`;
  state.message = message;
  renderWorkflow();
  toast("Outreach draft ready");
}

function wire() {
  $("parseJob").addEventListener("click", () => parseJob().catch((error) => toast(error.message, "error")));
  $("parseResume").addEventListener("click", () => parseResume().catch((error) => toast(error.message, "error")));
  $("runAnalysis").addEventListener("click", () => runAnalysis().catch((error) => toast(error.message, "error")));
  $("runRewrite").addEventListener("click", () => runRewrite().catch((error) => toast(error.message, "error")));
  $("findReferrals").addEventListener("click", () => findReferrals().catch((error) => toast(error.message, "error")));
  $("generateOutreach").addEventListener("click", () => generateMessage().catch((error) => toast(error.message, "error")));
  $("refreshTracker").addEventListener("click", () => renderTracker().catch((error) => toast(error.message, "error")));
  $("loadSample").addEventListener("click", () => {
    $("jobUrl").value = "https://www.linkedin.com/jobs/view/senior-sdet-test-architect";
    $("jobText").value = sampleJob;
    $("resumeText").value = sampleResume;
    toast("Sample job and resume loaded");
  });
  $("themeButton").addEventListener("click", () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  });
  $("commandButton").addEventListener("click", () => $("commandDialog").showModal());
  document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", async () => {
    $("commandDialog").close();
    const command = button.dataset.command;
    if (command === "theme") $("themeButton").click();
    if (command === "parse") {
      await parseJob();
      await parseResume();
    }
    if (command === "analyze") await runAnalysis();
    if (command === "referrals") await findReferrals();
    if (command === "outreach") await generateMessage();
  }));
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("commandDialog").showModal();
    }
  });
}

api("/api/health")
  .then(() => { $("healthStatus").textContent = "API online"; })
  .catch(() => { $("healthStatus").textContent = "API offline"; });

wire();
renderWorkflow();
renderTracker().catch(() => undefined);
