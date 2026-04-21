export function nowIso() {
  return new Date().toISOString();
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function safeJson(v, fallback = []) {
  try {
    return JSON.stringify(v);
  } catch {
    return JSON.stringify(fallback);
  }
}

export function parseJsonSafe(v, fallback = null) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}
