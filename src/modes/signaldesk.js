import { clamp, pickAction, pickSeverity } from "../lib/utils.js";

export function runSignalDesk(event) {
  let score = Number(event.risk || 0);
  const reasons = [];

  if (event.attempts >= 5) {
    score += 20;
    reasons.push("HIGH_ATTEMPTS");
  }

  if (event.geoMismatch) {
    score += 25;
    reasons.push("GEO_MISMATCH");
  }

  if (event.velocitySpike) {
    score += 20;
    reasons.push("VELOCITY_SPIKE");
  }

  if (!event.deviceTrusted) {
    score += 15;
    reasons.push("UNTRUSTED_DEVICE");
  }

  score = clamp(score, 0, 100);

  return {
    mode: "signaldesk",
    score,
    reasons,
    severity: pickSeverity(score),
    action: pickAction(score),
    explanation: "SignalDesk weighted rule engine"
  };
}
