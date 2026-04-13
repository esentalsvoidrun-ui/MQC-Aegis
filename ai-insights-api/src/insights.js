import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- deterministic logic ---
function computeMetrics(data) {
  const revenueGrowth =
    (data.revenue - data.previousRevenue) / data.previousRevenue * 100;

  const churnDelta = data.churn - data.previousChurn;

  let risk = "LOW";
  if (churnDelta > 5 || revenueGrowth < -10) risk = "HIGH";
  else if (churnDelta > 2 || revenueGrowth < 0) risk = "MEDIUM";

  return { revenueGrowth, churnDelta, risk };
}

// --- human layer ---
function humanLayer(risk, churnDelta, revenueGrowth) {
  if (risk === "HIGH") return "Det här är värt att titta på nu, inte sen.";
  if (churnDelta > 0) return "Små signaler som är bra att se tidigt.";
  if (revenueGrowth > 10) return "Det här bygger stabilt just nu.";
  return "Du har koll på läget.";
}

// --- AI call ---
async function callAI(input) {
  const prompt = `
You are a business analyst.

Metrics:
Revenue: ${input.revenue}
Users: ${input.users}
Churn: ${input.churn}
Revenue growth: ${input.revenueGrowth}%
Churn change: ${input.churnDelta}

Return JSON:
{
  "insight": "...",
  "whyItMatters": "...",
  "action": "..."
}

No motivational language.
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse(response.choices[0].message.content);
}

// --- main export ---
export async function getInsights(data) {
  const { revenueGrowth, churnDelta, risk } = computeMetrics(data);

  const ai = await callAI({ ...data, revenueGrowth, churnDelta });

  return {
    ...ai,
    risk,
    revenueGrowth,
    churnDelta,
    humanLayer: humanLayer(risk, churnDelta, revenueGrowth),
  };
}
