import { normalizeEvent, normalizeDecision } from "../core/normalize.js";
import { evaluateEvent } from "../core/engine.js";

export function registerEventRoute(app, config, state) {
  app.post("/event", (req, res) => {
    try {
      const event = normalizeEvent(req.body || {});
      const requestedMode = req.body?.mode || config.engineMode;
      const result = evaluateEvent(event, requestedMode);

      const decision = normalizeDecision({
        mode: result.mode,
        score: result.score,
        reasons: result.reasons,
        event,
        meta: result
      });

      state.globalEvents.push(event);
      state.incidents.push(decision);
      state.actions.push({
        id: Date.now() + 1,
        action: decision.action,
        severity: decision.severity,
        user: decision.user,
        mode: decision.mode,
        createdAt: decision.createdAt
      });

      res.json({
        ok: true,
        event,
        decision,
        engine: result
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });
}
