import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getInsights } from "./insights.js";
import { register, login, verify } from "./auth.js";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public_dashboard");

app.use(express.static(publicDir));

function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization;
    if (!token) throw new Error("No token");

    const user = verify(token);
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// --- AUTH ROUTES ---
app.post("/api/register", async (req, res) => {
  try {
    const user = await register(req.body.email, req.body.password);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const token = await login(req.body.email, req.body.password);
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- SAVE DATA ---
app.post("/api/metrics", authMiddleware, (req, res) => {
  const metrics = JSON.parse(fs.readFileSync("./data/metrics.json"));
  metrics.push({ userId: req.user.id, ...req.body });
  fs.writeFileSync("./data/metrics.json", JSON.stringify(metrics, null, 2));
  res.json({ success: true });
});

// --- INSIGHTS ---
app.post("/api/insights", authMiddleware, async (req, res) => {
  try {
    const result = await getInsights(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Insight engine failed" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`AI Product running on port ${PORT}`);
});
