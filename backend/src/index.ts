import "dotenv/config";
import express from "express";
import cors from "cors";

import agentsRouter from "./routes/agents";
import webhooksRouter from "./routes/webhooks";
import paymentsRouter from "./routes/payments";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");

// ── Middleware ─────────────────────────────────────────────────

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// JSON parser - skip for webhooks (they need raw body)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/webhooks") || req.path === "/api/payments/webhook") {
    next();
  } else {
    express.json({ limit: "1mb" })(req, res, next);
  }
});

// ── Routes ─────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

app.use("/api/agents", agentsRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/payments", paymentsRouter);

// ── 404 ────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

// ── Error handler ──────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err.message);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[zeroone] Backend listening on http://localhost:${PORT}`);
  console.log(`[zeroone] Env: ${process.env.NODE_ENV ?? "development"}`);
});

export default app;
