import express from "express";

const app = express();
const PORT = 3000;

app.use(express.static("public_dashboard"));

// 🔥 AI endpoint
app.get("/ai", (req, res) => {
  res.json({
    insight: "Spike in anomaly signals detected across active sessions.",
    recommendation: "Intervene: tighten validation rules and monitor clusters.",
    confidence: 91,
    decision: {
      action: "INTERVENE",
      reason: "High risk + anomaly spike",
      priority: "HIGH"
    },
    users: 11269,
    revenue: 1661969,
    risk: 98
  });
});

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
