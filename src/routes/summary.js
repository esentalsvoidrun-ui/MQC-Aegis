import { avg } from "../lib/utils.js";

export function registerSummaryRoute(app, config, state) {
  app.get("/api/summary", (_req, res) => {
    const recent = state.incidents.slice(-20);
    const risks = recent.map((x) => x.riskScore || 0);
    const currentRisk = avg(risks);
    const currentVolume = recent.length;

    const baselineRisk = config.baselineRisk;
    const baselineVolume = config.baselineVolume;
    const tolerance = config.tolerance;

    const riskGap = baselineRisk === 0 ? 0 : Math.abs(currentRisk - baselineRisk) / baselineRisk;
    const volumeGap = baselineVolume === 0 ? 0 : Math.abs(currentVolume - baselineVolume) / baselineVolume;
    const driftScore = Number((riskGap + volumeGap).toFixed(2));

    const status = driftScore > tolerance ? "unstable" : "stable";

    state.drift = {
      driftScore,
      status,
      baselineRisk,
      baselineVolume,
      currentRisk,
      currentVolume
    };

    res.json({
      ok: true,
      summary: `System status: ${status}. Drift score: ${driftScore}. Engine mode: ${config.engineMode}. Current avg risk: ${currentRisk.toFixed(2)}. Current volume: ${currentVolume}.`,
      drift: state.drift,
      incidents: state.incidents.length,
      actions: state.actions.length
    });
  });
}
