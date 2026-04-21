import { getSafeMode } from "./config.js";
import { runSignalDesk } from "../modes/signaldesk.js";
import { runMQC } from "../modes/mqc.js";
import { runShadow } from "../modes/shadow.js";
import { runHybrid } from "../modes/hybrid.js";

export function evaluateEvent(event, requestedMode) {
  const mode = getSafeMode(requestedMode);

  switch (mode) {
    case "mqc":
      return runMQC(event);
    case "shadow":
      return runShadow(event);
    case "hybrid":
      return runHybrid(event);
    case "signaldesk":
    default:
      return runSignalDesk(event);
  }
}
