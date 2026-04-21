import { clamp, nowIso } from "./utils.js";
import { broadcast } from "./runtime.js";

export function getCurrentStats(globalEvents) {
  const recent = globalEvents.slice(-100);
  const avgRisk =
    recent.length > 0
      ? recent.reduce((sum, e) => sum + Number(e.risk || 0), 0) / recent.length
      : 0;

  return {
    avgRisk,
    volume: recent.length
  };
}

export function evaluateIdentityDrift(systemIdentity, currentStats) {
  const safeRiskBase = systemIdentity.baselineRisk || 1;
  const safeVolumeBase = systemIdentity.baselineVolume || 1;

  const riskDrift = currentStats.avgRisk - systemIdentity.baselineRisk;
  const volumeDrift = currentStats.volume - systemIdentity.baselineVolume;

  const driftScore =
    Math.abs(riskDrift) / safeRiskBase +
    Math.abs(volumeDrift) / safeVolumeBase;

  return {
    driftScore,
    status: driftScore > systemIdentity.tolerance ? "unstable" : "coherent",
    baselineRisk: systemIdentity.baselineRisk,
    baselineVolume: systemIdentity.baselineVolume,
    currentRisk: currentStats.avgRisk,
    currentVolume: currentStats.volume
  };
}

export function adaptSystemIdentity(systemIdentity, globalEvents, recentIncidents) {
  if (!recentIncidents.length) return systemIdentity;

  const avgRisk =
    recentIncidents.reduce((sum, i) => sum + Number(i.riskScore || 0), 0) /
    recentIncidents.length;

  systemIdentity.baselineRisk =
    Math.round(systemIdentity.baselineRisk * 0.8 + avgRisk * 0.2);

  const liveVolume = globalEvents.slice(-100).length;

  // snabbare live-match: mindre seg historik, mer vikt på nuet
  systemIdentity.baselineVolume = Math.max(
    10,
    Math.round(systemIdentity.baselineVolume * 0.65 + liveVolume * 0.35)
  );

  systemIdentity.lastUpdated = Date.now();
  return systemIdentity;
}

export function generateSystemReflection(identity, drift, incidents, engineMeta = {}) {
  return [
    `System status: ${drift.status}.`,
    `Drift score: ${drift.driftScore.toFixed(2)}.`,
    `Baseline risk: ${identity.baselineRisk}.`,
    `Baseline volume: ${identity.baselineVolume}.`,
    `Tolerance: ${Number(identity.tolerance).toFixed(2)}.`,
    `Learning cycles: ${identity.learningCycles || 0}.`,
    `Current avg risk: ${drift.currentRisk.toFixed(2)}.`,
    `Current volume: ${drift.currentVolume}.`,
    `Engine mode: ${engineMeta.mode || "signaldesk-only"}.`,
    `Engine source: ${engineMeta.source || "signaldesk"}.`,
    `Recent behavior indicates ${
      drift.status === "unstable"
        ? "adaptive recalibration required"
        : "stable operational coherence"
    }.`,
    `Total incidents: ${incidents.length}.`,
    `Recommendation: ${
      drift.status === "unstable"
        ? "tighten thresholds and monitor convergence"
        : "maintain current strategy"
    }`
  ].join(" ");
}

export async function getComparisonStats(db, limit = 200) {
  const rows = await db.all(`
    SELECT *
    FROM engine_comparisons
    ORDER BY id DESC
    LIMIT ?
  `, [limit]);

  const total = rows.length;
  const differs = rows.filter((r) => r.differs === 1).length;
  const promotedByMQC = rows.filter((r) => r.promotedByMQC === 1).length;
  const avgMergedRisk =
    total > 0
      ? rows.reduce((sum, r) => sum + Number(r.mergedRiskScore || 0), 0) / total
      : 0;

  return {
    total,
    differs,
    promotedByMQC,
    avgMergedRisk,
    diffRate: total ? differs / total : 0,
    promotionRate: total ? promotedByMQC / total : 0
  };
}

export async function runAutoLearn({ db, persistLearningLog, learningState, systemIdentity, globalEvents }) {
  if (!learningState.enabled) {
    return { ok: false, reason: "learning_disabled" };
  }

  const stats = await getComparisonStats(db, 200);
  if (stats.total < learningState.minComparisons) {
    return { ok: false, reason: "not_enough_samples", stats };
  }

  const previousBaselineRisk = systemIdentity.baselineRisk;
  const previousBaselineVolume = systemIdentity.baselineVolume;
  const previousTolerance = systemIdentity.tolerance;

  let note = "minor recalibration";
  let targetRisk = previousBaselineRisk;
  let targetVolume = previousBaselineVolume;
  let targetTolerance = previousTolerance;

  if (stats.diffRate >= 0.35) {
    targetTolerance = clamp(previousTolerance + 0.03, 0.1, 0.6);
    note = "high divergence: widened tolerance slightly";
  } else if (stats.diffRate <= 0.12) {
    targetTolerance = clamp(previousTolerance - 0.02, 0.1, 0.6);
    note = "low divergence: tightened tolerance slightly";
  }

  if (stats.promotionRate >= 0.25) {
    targetRisk = clamp(Math.round(previousBaselineRisk + 2), 15, 95);
    note += "; MQC promotions strong: raised baseline risk";
  } else if (stats.promotionRate <= 0.05) {
    targetRisk = clamp(Math.round(previousBaselineRisk - 1), 15, 95);
    note += "; MQC quiet: lowered baseline risk slightly";
  }

  const observedVolume = globalEvents.slice(-100).length || previousBaselineVolume;
  targetVolume = clamp(
    Math.round(previousBaselineVolume * 0.85 + observedVolume * 0.15),
    10,
    500
  );

  systemIdentity.baselineRisk = targetRisk;
  systemIdentity.baselineVolume = targetVolume;
  systemIdentity.tolerance = Number(targetTolerance.toFixed(2));
  systemIdentity.lastUpdated = Date.now();
  systemIdentity.learningCycles = Number(systemIdentity.learningCycles || 0) + 1;
  systemIdentity.lastLearningAt = nowIso();

  const log = {
    previousBaselineRisk,
    newBaselineRisk: systemIdentity.baselineRisk,
    previousBaselineVolume,
    newBaselineVolume: systemIdentity.baselineVolume,
    previousTolerance,
    newTolerance: systemIdentity.tolerance,
    diffRate: Number(stats.diffRate.toFixed(4)),
    promotionRate: Number(stats.promotionRate.toFixed(4)),
    samples: stats.total,
    note,
    createdAt: nowIso()
  };

  await persistLearningLog(db, log);
  broadcast("auto_learn", {
    ok: true,
    identity: systemIdentity,
    stats: {
      diffRate: log.diffRate,
      promotionRate: log.promotionRate,
      samples: log.samples
    },
    note: log.note
  });

  learningState.lastRunAt = Date.now();

  return { ok: true, log };
}
