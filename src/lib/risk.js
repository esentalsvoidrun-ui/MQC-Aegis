import { clamp } from "./utils.js";

export function evaluateRiskScore(event) {
  const baseRisk = Number(event.risk || 0);
  let riskScore = baseRisk;

  if (event.type === "login") {
    const attempts = Number(event.attempts || 0);
    if (attempts >= 8) riskScore += 16;
    else if (attempts >= 6) riskScore += 12;
    else if (attempts >= 4) riskScore += 8;
  }

  if (event.velocitySpike) riskScore += 9;
  if (event.geoMismatch) riskScore += 11;
  if ((event.ip || "").toLowerCase() === "unknown") riskScore += 5;

  if (event.type === "payment") {
    const amount = Number(event.amount || 0);
    if (amount >= 50000) riskScore += 18;
    else if (amount >= 25000) riskScore += 12;
    else if (amount >= 10000) riskScore += 8;
  }

  if (riskScore > 85) {
    riskScore = 85 + (riskScore - 85) * 0.35;
  } else if (riskScore > 70) {
    riskScore = 70 + (riskScore - 70) * 0.6;
  }

  return Math.round(clamp(riskScore, 0, 100));
}

export function severityFromRisk(riskScore) {
  if (riskScore >= 90) return "critical";
  if (riskScore >= 72) return "high";
  if (riskScore >= 45) return "medium";
  return "low";
}

export function actionFromRisk(riskScore) {
  if (riskScore >= 90) return "block";
  if (riskScore >= 72) return "manual_review";
  if (riskScore >= 45) return "rate_limit";
  return "log";
}

export function actionPriority(action) {
  if (action === "block") return 4;
  if (action === "manual_review") return 3;
  if (action === "rate_limit") return 2;
  return 1;
}

export function detectTrendAnomaly(event, trendStore) {
  const key = event.type || "unknown";
  const bucket = trendStore.get(key) || { count: 0, recentRisk: [] };

  bucket.count += 1;
  bucket.recentRisk.push(Number(event.risk || 0));
  if (bucket.recentRisk.length > 20) bucket.recentRisk.shift();

  trendStore.set(key, bucket);

  const avgRisk =
    bucket.recentRisk.length > 0
      ? bucket.recentRisk.reduce((sum, n) => sum + n, 0) / bucket.recentRisk.length
      : 0;

  if (bucket.count >= 5 && avgRisk >= 50) return "surge";
  if (bucket.count >= 3 && avgRisk >= 30) return "spike";
  return "stable";
}

export function detectSignalConvergence(event, context) {
  let score = 0;

  if (Number(event.risk || 0) > 70) score += 1;
  if (event.velocitySpike) score += 1;
  if (event.geoMismatch) score += 1;
  if (context.recentIncidents > 3) score += 1;

  if (score >= 3) {
    return {
      label: "convergent-threat",
      action: "block",
      confidence: "high",
      source: "signaldesk"
    };
  }

  if (score === 2) {
    return {
      label: "multi-signal-risk",
      action: "manual_review",
      confidence: "medium",
      source: "signaldesk"
    };
  }

  return {
    label: "none",
    action: null,
    confidence: "low",
    source: "signaldesk"
  };
}
