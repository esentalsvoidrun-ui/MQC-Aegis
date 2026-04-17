import { WebSocketServer } from "ws";

const PORT = 3002;
const wss = new WebSocketServer({ port: PORT });

console.log(`⚡ SignalDesk Live WS running on ws://localhost:${PORT}`);

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const state = {
  users: 1284,
  revenue: 48920,
  risk: 18,
  recentEvents: []
};

function makeInsight() {
  const last = state.recentEvents[0];
  const eventText = last
    ? `Latest signal: ${last.event} was ${last.status.toLowerCase()}.`
    : `No fresh event spike detected yet.`;

  let riskText = "Risk remains contained.";
  if (state.risk >= 45) {
    riskText = "Risk conditions are elevated and require tighter monitoring.";
  } else if (state.risk >= 20) {
    riskText = "Risk is elevated but still manageable.";
  }

  let revenueText = "Commercial activity is steady.";
  if (state.revenue >= 60000) {
    revenueText = "Revenue momentum is running strongly above baseline.";
  } else if (state.revenue >= 40000) {
    revenueText = "Revenue is trending in a healthy direction.";
  }

  let userText = "User activity is stable.";
  if (state.users >= 1600) {
    userText = "User activity is unusually strong.";
  } else if (state.users <= 950) {
    userText = "User activity softened in the latest cycle.";
  }

  let recommendation = "Recommendation: maintain current thresholds and continue observation.";
  if (state.risk >= 45) {
    recommendation = "Recommendation: review anomaly thresholds and inspect the latest flagged events immediately.";
  } else if (last && last.status === "Flagged") {
    recommendation = "Recommendation: inspect the newest flagged signal before widening approvals.";
  }

  return `${userText} ${revenueText} ${riskText} ${eventText} ${recommendation}`;
}

function pushMetrics() {
  state.users = Math.max(800, state.users + rand(-22, 30));
  state.revenue = Math.max(10000, state.revenue + rand(-1200, 2600));
  state.risk = Math.max(4, Math.min(99, state.risk + rand(-4, 6)));

  broadcast({
    type: "metrics",
    data: {
      users: state.users,
      revenue: state.revenue,
      risk: state.risk
    }
  });
}

function pushEvent() {
  const event = {
    event: pick(["Payment review", "User anomaly", "Access request", "Revenue spike", "Geo mismatch"]),
    status: pick(["Approved", "Flagged", "Observed", "Queued"]),
    time: new Date().toLocaleTimeString()
  };

  state.recentEvents.unshift(event);
  state.recentEvents = state.recentEvents.slice(0, 8);

  broadcast({
    type: "event",
    data: event
  });
}

function pushActivity() {
  const item = {
    title: pick([
      "Live system signal",
      "Decision flow updated",
      "Anomaly watch active",
      "Revenue pulse received"
    ]),
    text: pick([
      "SignalDesk received fresh backend event flow.",
      "A new operational batch has entered the stream.",
      "Behavioral inputs shifted slightly in the latest cycle.",
      "System telemetry continues above baseline."
    ])
  };

  broadcast({
    type: "activity",
    data: item
  });
}

function pushAIInsight() {
  broadcast({
    type: "ai_insight",
    data: {
      insight: makeInsight(),
      timestamp: Date.now()
    }
  });
}

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({
    type: "activity",
    data: {
      title: "WebSocket connected",
      text: "SignalDesk live stream attached successfully."
    }
  }));

  ws.send(JSON.stringify({
    type: "metrics",
    data: {
      users: state.users,
      revenue: state.revenue,
      risk: state.risk
    }
  }));

  ws.send(JSON.stringify({
    type: "ai_insight",
    data: {
      insight: makeInsight(),
      timestamp: Date.now()
    }
  }));
});

setInterval(pushMetrics, 3000);
setInterval(pushEvent, 4500);
setInterval(pushActivity, 6500);
setInterval(pushAIInsight, 7000);
