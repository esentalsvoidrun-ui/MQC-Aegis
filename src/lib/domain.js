import { nowIso } from "./utils.js";
import { actionFromRisk } from "./risk.js";

export function buildNarrative(event, decision) {
  return {
    user: event.user || "unknown",
    summary: `User ${event.user || "unknown"} triggered ${decision.action || "log"}`,
    pattern: decision.label || "none",
    learning:
      decision.confidence === "high"
        ? "Strong pattern detected"
        : decision.confidence === "medium"
        ? "Multiple signals aligned"
        : "Weak signal observed",
    timestamp: nowIso()
  };
}

export function dedupeCooldownKey(event, action) {
  return `${event.type || "unknown"}:${event.user || "unknown"}:${action || "log"}`;
}

export function shouldCreateIncident(alertCooldown, event, riskScore, convergence) {
  const cooldownKey = dedupeCooldownKey(event, convergence.action || actionFromRisk(riskScore));
  const lastTs = alertCooldown.get(cooldownKey) || 0;
  const now = Date.now();

  if (now - lastTs < 30000) {
    return { allow: false, reason: "cooldown_active" };
  }

  alertCooldown.set(cooldownKey, now);

  if (riskScore >= 45) return { allow: true, reason: "risk_threshold" };
  if (convergence.label !== "none") return { allow: true, reason: "signal_convergence" };
  return { allow: false, reason: "below_threshold" };
}

export function buildReasonCodes(event, riskScore, convergence, memoryFactors = []) {
  const codes = [];
  if (riskScore >= 90) codes.push("RISK_OVER_90");
  else if (riskScore >= 72) codes.push("RISK_OVER_72");
  else if (riskScore >= 45) codes.push("RISK_OVER_45");

  if ((event.ip || "").toLowerCase() === "unknown") codes.push("UNSEEN_IP");
  if (event.velocitySpike) codes.push("VELOCITY_SPIKE");
  if (event.geoMismatch) codes.push("GEO_MISMATCH");

  const amount = Number(event.amount || 0);
  if (amount >= 25000) codes.push("VERY_LARGE_TRANSACTION");
  else if (amount >= 10000) codes.push("LARGE_TRANSACTION");

  if (convergence.label === "convergent-threat") codes.push("SIGNAL_CONVERGENCE_HIGH");
  if (convergence.label === "multi-signal-risk") codes.push("SIGNAL_CONVERGENCE_MEDIUM");
  if (convergence.source === "mqc-aegis") codes.push("MQC_OVERRIDE");

  for (const factor of memoryFactors) {
    codes.push(`MEMORY_${factor.toUpperCase()}`);
  }

  return codes.length ? codes : ["LOW_SIGNAL"];
}
