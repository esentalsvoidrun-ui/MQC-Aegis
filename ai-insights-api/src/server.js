import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getInsights } from "./insights.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/insights", async (req, res) => {
  try {
    const result = await getInsights(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Insight engine failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Insights running on port ${PORT}`);
});
