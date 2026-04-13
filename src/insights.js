import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

function humanLayer(risk, churnDelta, revenueGrowth) {
  if (risk === "HIGH") return "Det här är värt att titta på nu, inte sen.";
  if (churnDelta > 0) return "Små signaler som är bra att se tidigt.";
  if (revenueGrowth > 10) return "Det här bygger stabilt just nu.";
  return "Du har koll på läget.";
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Model did not return valid JSON");
    }
    return JSON.parse(match[0]);
  }
}

async function callAI(input) {
  const prompt = `
You are a business analyst.

Analyze these metrics and return ONLY valid JSON.
No markdown. No code fences. No extra text.

Metrics:
- Revenue: ${input.revenue}
- Users: ${input.users}
- Churn: ${input.churn}
- Revenue growth: ${input.revenueGrowth.toFixed(2)}%
- Churn change: ${input.churnDelta.toFixed(2)}

Return exactly this shape:
{
  "insight": "one sentence",
  "whyItMatters": "one sentence",
  "action": "one sentence"
}
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "Return only valid JSON." },
      { role: "user", content: prompt }
    ],
  });

  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from AI");
  }

  console.log("RAW AI RESPONSE:", content);

  return extractJson(content);
}

export async function getInsights(data) {
  const { revenueGrowth, churnDelta, risk } = computeMetrics(data);

  let ai;
  try {
    ai = await callAI({
      ...data,
      revenueGrowth,
      churnDelta,
    });
  } catch (err) {
    console.error("AI FALLBACK TRIGGERED:", err.message);
    ai = {
      insight: "Revenue is growing, but churn is also increasing.",
      whyItMatters: "Higher churn can reduce the long-term value of growth.",
      action: "Review retention and onboarding before scaling further."
    };
  }

  return {
    insight: ai.insight,
    whyItMatters: ai.whyItMatters,
    action: ai.action,
    risk,
    revenueGrowth,
    churnDelta,
    humanLayer: humanLayer(risk, churnDelta, revenueGrowth),
  };
}
