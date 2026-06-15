import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";
import { findCandidateMatches } from "../services/weightedScoreMatching.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "lost_found_hub",
  waitForConnections: true,
  connectionLimit: 10,
});

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});

app.get("/api/matches/:lostPostId", async (req, res, next) => {
  try {
    const lostPostId = Number(req.params.lostPostId);

    if (!Number.isInteger(lostPostId) || lostPostId <= 0) {
      return res.status(400).json({ error: "lostPostId ຕ້ອງເປັນຕົວເລກຫຼາຍກວ່າ 0" });
    }

    const matches = await findCandidateMatches(pool, lostPostId, {
      threshold: Number(req.query.threshold ?? 70),
      dateWindowDays: Number(req.query.dateWindowDays ?? 7),
      limit: Number(req.query.limit ?? 50),
    });

    return res.json({
      lostPostId,
      threshold: Number(req.query.threshold ?? 70),
      storedIn: "matches",
      matches,
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: "ເກີດຂໍ້ຜິດພາດໃນ API",
    detail: error.message,
  });
});

app.listen(port, () => {
  console.log(`Matching API running at http://localhost:${port}`);
});
