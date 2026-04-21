import { clamp, pickAction, pickSeverity } from "../lib/utils.js";

export function runMQC(event) {
  let score = Number(event.risk || 0);
  const reasons = [];

  if (event.type === "payment" && event.amount > 10000) {
    score += 30;
    reasons.push("HIGH_VALUE_PAYMENT");
  }

  if (event.type === "login" && event.attempts >= 3) {
    score += 15;
    reasons.push("LOGIN_PRESSURE");
  }

  if (event.geoMismatch && event.velocitySpike) {
    score += 25;
    reasons.push("ADVERSARIAL_PATTERN");
  }

  score = clamp(score, 0, 100);

  return {
    mode: "mqc",
    score,
    reasons,
    severity: pickSeverity(score),
    action: pickAction(score),
    explanation: "MQC pattern and anomaly engine"
  };
}
