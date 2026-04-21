import { runSignalDesk } from "./signaldesk.js";
import { runMQC } from "./mqc.js";
import { pickAction, pickSeverity } from "../lib/utils.js";

export function runShadow(event) {
  const signaldesk = runSignalDesk(event);
  const mqc = runMQC(event);

  const score = Math.round((signaldesk.score + mqc.score) / 2);

  return {
    mode: "shadow",
    score,
    reasons: [
      ...signaldesk.reasons.map((r) => `SD:${r}`),
      ...mqc.reasons.map((r) => `MQC:${r}`)
    ],
    severity: pickSeverity(score),
    action: pickAction(score),
    explanation: "Shadow compares SignalDesk and MQC side-by-side",
    comparison: {
      signaldesk,
      mqc,
      divergence: Math.abs(signaldesk.score - mqc.score)
    }
  };
}
