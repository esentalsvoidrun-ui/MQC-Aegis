import { runSignalDesk } from "./signaldesk.js";
import { runMQC } from "./mqc.js";
import { clamp, pickAction, pickSeverity } from "../lib/utils.js";

export function runHybrid(event) {
  const signaldesk = runSignalDesk(event);
  const mqc = runMQC(event);

  const score = clamp(
    Math.round(signaldesk.score * 0.6 + mqc.score * 0.4),
    0,
    100
  );

  const reasons = [
    ...signaldesk.reasons,
    ...mqc.reasons
  ];

  return {
    mode: "hybrid",
    score,
    reasons,
    severity: pickSeverity(score),
    action: pickAction(score),
    explanation: "Hybrid blends SignalDesk and MQC into one decision",
    components: {
      signaldesk: signaldesk.score,
      mqc: mqc.score
    }
  };
}
