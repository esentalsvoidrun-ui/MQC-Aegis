import { nowIso } from "../lib/utils.js";

export function normalizeEvent(payload = {}) {
  return {
    id: payload.id || Date.now(),
    type: payload.type || "unknown",
    user: payload.user || "anonymous",
    attempts: Number(payload.attempts || 0),
    amount: Number(payload.amount || 0),
    ip: payload.ip || "unknown",
    risk: Number(payload.risk || 0),
    geoMismatch: Boolean(payload.geoMismatch || false),
    velocitySpike: Boolean(payload.velocitySpike || false),
    deviceTrusted: payload.deviceTrusted === undefined ? true : Boolean(payload.deviceTrusted),
    timestamp: Date.now(),
    createdAt: nowIso()
  };
}

export function normalizeDecision({ mode, score, reasons = [], event, meta = {} }) {
  return {
    id: Date.now(),
    mode,
    type: event.type,
    user: event.user,
    riskScore: Number(score || 0),
    severity: meta.severity,
    action: meta.action,
    status: "pending_review",
    reasons,
    explanation: meta.explanation || "",
    event,
    createdAt: nowIso()
  };
}
