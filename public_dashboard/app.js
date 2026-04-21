const state = {
  selectedMode: "shadow",
  summary: null,
  incidents: [],
  actions: [],
  lastEngineResponse: null,
  lastScenario: null
};

const el = (id) => document.getElementById(id);

function safeText(value, fallback = "—") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function formatAction(action = "") {
  return String(action || "observe").replaceAll("_", " ");
}

function actionClass(action = "") {
  return `action-${String(action || "log")}`;
}

function severityClass(sev = "") {
  return `sev-${String(sev || "low")}`;
}

function shortTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function topAction(actions = []) {
  const map = new Map();
  for (const item of actions) {
    const key = item.action || "log";
    map.set(key, (map.get(key) || 0) + 1);
  }
  let winner = "log";
  let best = -1;
  for (const [key, count] of map.entries()) {
    if (count > best) {
      winner = key;
      best = count;
    }
  }
  return winner;
}

function getBuckets(incidents = []) {
  const buckets = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const item of incidents) {
    const risk = Number(item.riskScore || 0);
    if (risk >= 90) buckets.critical += 1;
    else if (risk >= 72) buckets.high += 1;
    else if (risk >= 45) buckets.medium += 1;
    else buckets.low += 1;
  }
  return buckets;
}

function setBar(id, count, total) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const node = el(id);
  if (node) node.style.width = `${pct}%`;
}

function renderSummary() {
  const summary = state.summary || {};
  const drift = summary.drift || {};
  const incidents = state.incidents || [];
  const actions = state.actions || [];
  const status = safeText(drift.status, "unknown");
  const avgRisk = Number(drift.currentRisk || 0);
  const driftScore = Number(drift.driftScore || 0);

  el("statusValue").textContent = status;
  el("statusValue").className = `value status-${status}`;
  el("statusSub").textContent = status === "unstable"
    ? "Adaptive recalibration required"
    : "Operating within tolerance";

  el("driftValue").textContent = driftScore.toFixed(2);
  el("baselineRiskValue").textContent = safeText(drift.baselineRisk, "0");
  el("eventsLoadedValue").textContent = String(incidents.length);
  el("avgRiskValue").textContent = avgRisk.toFixed(0);

  const winner = topAction(actions);
  el("topActionValue").textContent = formatAction(winner);
  el("topActionValue").className = `value ${actionClass(winner)}`;

  el("systemReflection").textContent = summary.summary || "No system reflection available yet.";
}

function renderDecisionPanel() {
  const latest = state.incidents[0];
  const engine = state.lastEngineResponse;
  const currentAction = latest?.action || "observe";

  el("currentDecisionWord").textContent = formatAction(currentAction).toUpperCase();
  el("currentDecisionWord").className = `decision-word ${actionClass(currentAction)}`;
  el("currentDecisionSub").textContent = latest
    ? `Severity ${safeText(latest.severity, "unknown")} · User ${safeText(latest.user, "anonymous")} · ${safeText(latest.type, "unknown")}`
    : "No live decision yet.";

  const reasonList = el("reasonList");
  const memoryList = el("memoryList");
  const runtimeList = el("runtimeList");

  reasonList.innerHTML = "";
  memoryList.innerHTML = "";
  runtimeList.innerHTML = "";

  const reasons = Array.isArray(latest?.reasons) ? latest.reasons : [];
  if (reasons.length) {
    for (const reason of reasons.slice(0, 5)) {
      const li = document.createElement("li");
      li.textContent = reason;
      reasonList.appendChild(li);
    }
  } else {
    reasonList.innerHTML = "<li>No explicit reason codes yet.</li>";
  }

  const memoryFacts = [
    latest ? `Recent action: ${formatAction(latest.action)}` : "No recent action",
    latest ? `Risk score: ${latest.riskScore}` : "No risk score loaded",
    state.lastScenario ? `Last scenario: ${state.lastScenario}` : "No scenario injected",
  ];
  memoryFacts.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    memoryList.appendChild(li);
  });

  const runtimeFacts = [
    `UI mode request: ${state.selectedMode}`,
    `Loaded incidents: ${state.incidents.length}`,
    `Loaded actions: ${state.actions.length}`
  ];
  runtimeFacts.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    runtimeList.appendChild(li);
  });

  const sdWord = el("signaldeskWord");
  const sdSub = el("signaldeskSub");
  const mqcWord = el("mqcWord");
  const mqcSub = el("mqcSub");
  const divWord = el("divergenceWord");
  const divSub = el("divergenceSub");
  const nextActionWord = el("nextActionWord");
  const nextActionSub = el("nextActionSub");

  if (engine?.comparison) {
    const sd = engine.comparison.signaldesk || {};
    const mqc = engine.comparison.mqc || {};
    const divergence = Number(engine.comparison.divergence || 0);

    sdWord.textContent = formatAction(sd.action || "log");
    sdWord.className = `value ${actionClass(sd.action)}`;
    sdSub.textContent = `Score ${safeText(sd.score, "0")} · ${safeText(sd.explanation, "SignalDesk view")}`;

    mqcWord.textContent = formatAction(mqc.action || "log");
    mqcWord.className = `value ${actionClass(mqc.action)}`;
    mqcSub.textContent = `Score ${safeText(mqc.score, "0")} · ${safeText(mqc.explanation, "MQC view")}`;

    const diverged = (sd.action !== mqc.action) || divergence >= 10;
    divWord.textContent = diverged ? "Diverged" : "Aligned";
    divWord.className = `value ${diverged ? "action-block" : "action-log"}`;
    divSub.textContent = diverged
      ? `Signal gap ${divergence}. SignalDesk chose ${formatAction(sd.action)} while MQC suggested ${formatAction(mqc.action)}.`
      : `Engines broadly agree. Score gap ${divergence}.`;

    nextActionWord.textContent = diverged ? "Manual review" : formatAction(latest?.action || "observe");
    nextActionWord.className = `value ${diverged ? "action-manual_review" : actionClass(latest?.action)}`;
    nextActionSub.textContent = diverged
      ? "Engine disagreement detected. Human review is the sensible next move."
      : "No serious divergence detected.";
  } else if (engine?.components) {
    sdWord.textContent = `score ${safeText(engine.components.signaldesk, "0")}`;
    sdWord.className = "value";
    sdSub.textContent = "Hybrid source: SignalDesk weight";

    mqcWord.textContent = `score ${safeText(engine.components.mqc, "0")}`;
    mqcWord.className = "value";
    mqcSub.textContent = "Hybrid source: MQC weight";

    divWord.textContent = "Blended";
    divWord.className = "value action-rate_limit";
    divSub.textContent = "Hybrid mode merges both engines into one final call.";

    nextActionWord.textContent = formatAction(latest?.action || "observe");
    nextActionWord.className = `value ${actionClass(latest?.action)}`;
    nextActionSub.textContent = "Weighted decision currently active.";
  } else {
    sdWord.textContent = latest ? formatAction(latest.action) : "—";
    sdWord.className = `value ${actionClass(latest?.action)}`;
    sdSub.textContent = "No side-by-side comparison returned.";

    mqcWord.textContent = state.selectedMode === "mqc" ? formatAction(latest?.action) : "—";
    mqcWord.className = `value ${actionClass(latest?.action)}`;
    mqcSub.textContent = state.selectedMode === "mqc"
      ? "Direct MQC decision active."
      : "Run a shadow scenario for divergence.";

    divWord.textContent = "Pending";
    divWord.className = "value";
    divSub.textContent = "Inject a scenario in shadow mode to inspect engine disagreement.";

    nextActionWord.textContent = formatAction(latest?.action || "observe");
    nextActionWord.className = `value ${actionClass(latest?.action)}`;
    nextActionSub.textContent = latest
      ? `Current engine recommends ${formatAction(latest.action)}.`
      : "Need more live data.";
  }
}

function renderRiskDistribution() {
  const buckets = getBuckets(state.incidents);
  const total = state.incidents.length || 1;

  el("countLow").textContent = String(buckets.low);
  el("countMedium").textContent = String(buckets.medium);
  el("countHigh").textContent = String(buckets.high);
  el("countCritical").textContent = String(buckets.critical);

  setBar("barLow", buckets.low, total);
  setBar("barMedium", buckets.medium, total);
  setBar("barHigh", buckets.high, total);
  setBar("barCritical", buckets.critical, total);
}

function renderListFeed(targetId, rows, mapper) {
  const root = el(targetId);
  root.innerHTML = "";

  if (!rows.length) {
    root.innerHTML = `<div class="empty">No live rows yet.</div>`;
    return;
  }

  for (const row of rows) {
    root.appendChild(mapper(row));
  }
}

function makeFeedRow(parts) {
  const row = document.createElement("div");
  row.className = "feed-row";
  row.innerHTML = parts;
  return row;
}

function renderFeeds() {
  const incidents = state.incidents.slice(0, 6);
  const actions = state.actions.slice(0, 6);

  renderListFeed("decisionFeed", incidents, (item) => makeFeedRow(`
    <div class="mono">${shortTime(item.createdAt)}</div>
    <div>
      <div><strong>${safeText(item.type, "unknown")}</strong> · ${safeText(item.user, "anonymous")}</div>
      <div class="muted">${(item.reasons || []).slice(0, 2).join(" · ") || "No reason codes"}</div>
    </div>
    <div class="${severityClass(item.severity)}"><strong>${safeText(item.riskScore, 0)}</strong></div>
    <div class="${actionClass(item.action)}"><strong>${formatAction(item.action)}</strong></div>
  `));

  renderListFeed("liveEventsFeed", incidents, (item) => makeFeedRow(`
    <div class="mono">${shortTime(item.createdAt)}</div>
    <div>
      <div><strong>${safeText(item.user, "anonymous")}</strong> · ${safeText(item.type, "unknown")}</div>
      <div class="muted">mode ${safeText(item.mode, "unknown")} · status ${safeText(item.status, "pending")}</div>
    </div>
    <div class="${severityClass(item.severity)}"><strong>${safeText(item.severity, "low")}</strong></div>
    <div class="mono">risk ${safeText(item.riskScore, 0)}</div>
  `));

  renderListFeed("mqcFeed", actions, (item) => makeFeedRow(`
    <div class="mono">${shortTime(item.createdAt)}</div>
    <div>
      <div><strong>${formatAction(item.action)}</strong></div>
      <div class="muted">user ${safeText(item.user, "anonymous")} · mode ${safeText(item.mode, "unknown")}</div>
    </div>
    <div class="${severityClass(item.severity)}"><strong>${safeText(item.severity, "low")}</strong></div>
    <div class="${actionClass(item.action)}"><strong>${formatAction(item.action)}</strong></div>
  `));
}

async function fetchJson(url, options = undefined) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return res.json();
}

async function loadModes() {
  try {
    const data = await fetchJson("/api/modes");
    el("serverModeChip").textContent = `Server mode: ${safeText(data.current, "unknown")}`;
  } catch {
    el("serverModeChip").textContent = "Server mode: unavailable";
  }
}

async function loadAll() {
  try {
    const [summary, incidentsData, actionsData] = await Promise.all([
      fetchJson("/api/summary"),
      fetchJson("/api/incidents"),
      fetchJson("/api/actions")
    ]);

    state.summary = summary;
    state.incidents = Array.isArray(incidentsData.items) ? [...incidentsData.items].reverse() : [];
    state.actions = Array.isArray(actionsData.items) ? [...actionsData.items].reverse() : [];

    renderSummary();
    renderDecisionPanel();
    renderRiskDistribution();
    renderFeeds();
  } catch (error) {
    el("systemReflection").textContent = `Dashboard load error: ${error.message}`;
  }
}

function scenarioPayload(name, mode) {
  const base = { mode };

  switch (name) {
    case "trusted_user":
      return {
        ...base,
        type: "login",
        user: "trusted-user",
        attempts: 1,
        ip: "10.0.0.12",
        risk: 12,
        geoMismatch: false,
        velocitySpike: false,
        deviceTrusted: true
      };
    case "borderline_review":
      return {
        ...base,
        type: "login",
        user: "borderline-user",
        attempts: 4,
        ip: "unknown",
        risk: 46,
        geoMismatch: false,
        velocitySpike: true,
        deviceTrusted: true
      };
    case "mqc_payment_cluster":
      return {
        ...base,
        type: "payment",
        user: "cluster-user",
        amount: 25000,
        ip: "unknown",
        risk: 44,
        geoMismatch: true,
        velocitySpike: true,
        deviceTrusted: false
      };
    case "auth_cascade":
      return {
        ...base,
        type: "login",
        user: "auth-cascade",
        attempts: 7,
        ip: "unknown",
        risk: 61,
        geoMismatch: true,
        velocitySpike: true,
        deviceTrusted: false
      };
    case "repeat_offender":
      return {
        ...base,
        type: "login",
        user: "repeat-offender",
        attempts: 6,
        ip: "unknown",
        risk: 76,
        geoMismatch: true,
        velocitySpike: false,
        deviceTrusted: false
      };
    case "known_user_new_ip":
      return {
        ...base,
        type: "login",
        user: "known-user",
        attempts: 2,
        ip: "new-ip",
        risk: 31,
        geoMismatch: true,
        velocitySpike: false,
        deviceTrusted: true
      };
    default:
      return {
        ...base,
        type: "login",
        user: "default-user",
        attempts: 1,
        ip: "unknown",
        risk: 15,
        geoMismatch: false,
        velocitySpike: false,
        deviceTrusted: true
      };
  }
}

async function injectScenario(name) {
  const payload = scenarioPayload(name, state.selectedMode);
  state.lastScenario = name;

  el("systemReflection").textContent = `Injecting scenario "${name}" in ${state.selectedMode} mode...`;

  try {
    const data = await fetchJson("/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    state.lastEngineResponse = data.engine || null;
    await loadAll();
    el("systemReflection").textContent += `

Last inject:
${JSON.stringify(payload, null, 2)}`;
  } catch (error) {
    el("systemReflection").textContent = `Scenario injection failed: ${error.message}`;
  }
}

function bindModes() {
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedMode = btn.dataset.mode;
      document.querySelectorAll(".mode-btn").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      renderDecisionPanel();
    });
  });
}

function bindScenarios() {
  document.querySelectorAll(".scenario-btn").forEach((btn) => {
    btn.addEventListener("click", () => injectScenario(btn.dataset.scenario));
  });
}

async function boot() {
  bindModes();
  bindScenarios();
  await loadModes();
  await loadAll();
  setInterval(loadAll, 4000);
}

boot();
