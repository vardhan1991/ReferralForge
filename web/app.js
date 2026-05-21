const state = {
  job: null,
  candidate: null,
  analysis: null,
  contacts: [],
  selectedContact: null
};

const $ = (id) => document.getElementById(id);

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

function setBusy(button, busy) {
  button.disabled = busy;
  button.dataset.original ??= button.textContent;
  button.textContent = busy ? "Working..." : button.dataset.original;
}

function renderAnalysis() {
  if (!state.analysis) return;
  $("scoreValue").textContent = String(state.analysis.overallScore);
  $("scoreBreakdown").innerHTML = Object.entries(state.analysis.breakdown)
    .map(([label, value]) => `<div class="metric"><span>${label.replace(/[A-Z]/g, " $&")}</span><div class="bar"><i style="width:${value}%"></i></div></div>`)
    .join("");
  $("heatmap").classList.remove("empty");
  $("heatmap").innerHTML = state.analysis.heatmap
    .map((item) => `<span class="chip ${item.score > 70 ? "hot" : "cold"}">${item.label} · ${item.score}</span>`)
    .join("");
}

function renderContacts() {
  const box = $("contacts");
  box.classList.remove("empty");
  box.innerHTML = state.contacts.map((contact, index) => `
    <div class="contact ${state.selectedContact?.id === contact.id ? "selected" : ""}" data-contact="${index}" tabindex="0">
      <strong>${contact.name}</strong>
      <p>${contact.title} · ${contact.company}</p>
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
    toast(`Parsed ${job.title} at ${job.company}`);
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
    toast(`Parsed profile for ${candidate.name}`);
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
    toast("Match analysis complete");
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
}

async function findReferrals() {
  if (!state.job || !state.candidate) throw new Error("Parse a job and resume first.");
  const { contacts } = await api("/api/referrals/search", { job: state.job, candidate: state.candidate });
  state.contacts = contacts;
  state.selectedContact = contacts[0] || null;
  renderContacts();
  toast("Referral contacts ranked");
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
  $("themeButton").addEventListener("click", () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  });
  $("commandButton").addEventListener("click", () => $("commandDialog").showModal());
  document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", async () => {
    $("commandDialog").close();
    const command = button.dataset.command;
    if (command === "theme") $("themeButton").click();
    if (command === "parse") await Promise.all([parseJob(), parseResume()]);
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
renderTracker().catch(() => undefined);
