import express from "express";
import { APP_CONFIG } from "./core/config.js";
import { state } from "./core/state.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerEventRoute } from "./routes/event.js";
import { registerSummaryRoute } from "./routes/summary.js";

const app = express();
app.use(express.json());
app.use(express.static("public_dashboard"));

registerHealthRoute(app, APP_CONFIG);
registerEventRoute(app, APP_CONFIG, state);
registerSummaryRoute(app, APP_CONFIG, state);

app.get("/api/incidents", (_req, res) => {
  res.json({ ok: true, items: state.incidents });
});

app.get("/api/actions", (_req, res) => {
  res.json({ ok: true, items: state.actions });
});

app.get("/api/modes", (_req, res) => {
  res.json({
    ok: true,
    current: APP_CONFIG.engineMode,
    available: ["signaldesk", "mqc", "shadow", "hybrid"]
  });
});

app.listen(APP_CONFIG.port, () => {
  console.log(`SignalDesk listening on http://localhost:${APP_CONFIG.port}`);
  console.log(`Engine mode: ${APP_CONFIG.engineMode}`);
});
