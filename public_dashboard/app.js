let token = localStorage.getItem("token") || "";

function setStatus(text) {
  const el = document.getElementById("authStatus");
  if (el) el.textContent = text;
}

async function registerUser() {
  setStatus("Registering...");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Register failed");

    setStatus("Registered. Now log in.");
  } catch (err) {
    setStatus("Register error: " + err.message);
  }
}

async function loginUser() {
  setStatus("Logging in...");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    token = data.token;
    localStorage.setItem("token", token);
    setStatus("Logged in");
    await loadInsights();
  } catch (err) {
    setStatus("Login error: " + err.message);
  }
}

async function loadInsights() {
  const insightEl = document.getElementById("insight");
  const riskEl = document.getElementById("risk");
  const actionEl = document.getElementById("action");
  const humanLayerEl = document.getElementById("humanLayer");
  const btn = document.getElementById("analyzeBtn");

  if (!token) {
    insightEl.textContent = "Login required";
    riskEl.textContent = "-";
    actionEl.textContent = "Please register or log in.";
    humanLayerEl.textContent = "-";
    return;
  }

  btn.textContent = "Analyzing...";
  insightEl.textContent = "Loading...";
  riskEl.textContent = "-";
  actionEl.textContent = "-";
  humanLayerEl.textContent = "-";
  riskEl.className = "";

  try {
    const res = await fetch("/api/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({
        revenue: Number(document.getElementById("revenue").value),
        previousRevenue: Number(document.getElementById("prevRevenue").value),
        churn: Number(document.getElementById("churn").value),
        previousChurn: Number(document.getElementById("prevChurn").value),
        users: 1000
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load insights");

    insightEl.textContent = data.insight || "No insight";
    riskEl.textContent = data.risk || "No risk";
    actionEl.textContent = data.action || "No action";
    humanLayerEl.textContent = data.humanLayer || "No message";

    if (data.risk === "LOW") riskEl.className = "risk-low";
    if (data.risk === "MEDIUM") riskEl.className = "risk-medium";
    if (data.risk === "HIGH") riskEl.className = "risk-high";
  } catch (err) {
    insightEl.textContent = "Failed to load AI insights";
    riskEl.textContent = "ERROR";
    actionEl.textContent = err.message;
    humanLayerEl.textContent = "Kontrollen tappades, men inte bygget.";
  } finally {
    btn.textContent = "Analyze";
  }
}

window.registerUser = registerUser;
window.loginUser = loginUser;
window.loadInsights = loadInsights;

document.addEventListener("DOMContentLoaded", async () => {
  if (token) {
    setStatus("Logged in");
    await loadInsights();
  } else {
    setStatus("Not logged in");
  }
});
