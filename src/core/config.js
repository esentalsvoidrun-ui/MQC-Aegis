export const APP_CONFIG = {
  port: Number(process.env.PORT || 3000),
  engineMode: process.env.ENGINE_MODE || "signaldesk", // signaldesk | mqc | shadow | hybrid
  baselineRisk: Number(process.env.BASELINE_RISK || 35),
  baselineVolume: Number(process.env.BASELINE_VOLUME || 100),
  tolerance: Number(process.env.TOLERANCE || 0.20),
  logDecisions: String(process.env.LOG_DECISIONS || "true") === "true"
};

export function getSafeMode(mode) {
  const allowed = new Set(["signaldesk", "mqc", "shadow", "hybrid"]);
  return allowed.has(mode) ? mode : "signaldesk";
}
