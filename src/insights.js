function computeMetrics(data) {
  const revenue = Number(data.revenue);
  const previousRevenue = Number(data.previousRevenue);
  const churn = Number(data.churn);
  const previousChurn = Number(data.previousChurn);

  if ([revenue, previousRevenue, churn, previousChurn].some(Number.isNaN)) {
    throw new Error("Invalid numeric input");
  }

  if (previousRevenue === 0) {
    throw new Error("previousRevenue cannot be 0");
  }

  const revenueGrowth = ((revenue - previousRevenue) / previousRevenue) * 100;
  const churnDelta = churn - previousChurn;

  let risk = "LOW";
  if (churnDelta > 5 || revenueGrowth < -10) risk = "HIGH";
  else if (churnDelta > 2 || revenueGrowth < 0) risk = "MEDIUM";

  return { revenueGrowth, churnDelta, risk };
}

function humanLayer(risk) {
  if (risk === "HIGH") return "Det här kräver direkt uppmärksamhet.";
  if (risk === "MEDIUM") return "Små signaler som är bra att se tidigt.";
  return "Det ser stabilt ut just nu.";
}

export async function getInsights(data) {
  const { revenueGrowth, churnDelta, risk } = computeMetrics(data);

  let insight = "";
  let action = "";
  let whyItMatters = "";

  if (risk === "HIGH") {
    insight = "Growth is declining and churn is rising sharply.";
    action = "Investigate retention and revenue drivers immediately.";
    whyItMatters = "This combination can quickly erode business stability.";
  } else if (risk === "MEDIUM") {
    insight = "Revenue is growing, but churn is also increasing.";
    action = "Review retention and onboarding before scaling further.";
    whyItMatters = "Higher churn reduces long-term value.";
  } else {
    insight = "Growth and retention look healthy.";
    action = "Continue monitoring and optimize gradually.";
    whyItMatters = "Stable metrics indicate sustainable growth.";
  }

  return {
    insight,
    whyItMatters,
    action,
    risk,
    revenueGrowth,
    churnDelta,
    humanLayer: humanLayer(risk),
  };
}
