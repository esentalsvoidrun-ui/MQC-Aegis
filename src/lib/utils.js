export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function nowIso() {
  return new Date().toISOString();
}

export function avg(list) {
  if (!Array.isArray(list) || list.length === 0) return 0;
  return list.reduce((a, b) => a + Number(b || 0), 0) / list.length;
}

export function pickSeverity(score) {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function pickAction(score) {
  if (score >= 85) return "block";
  if (score >= 65) return "manual_review";
  if (score >= 40) return "rate_limit";
  return "log";
}
