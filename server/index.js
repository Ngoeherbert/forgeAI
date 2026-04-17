import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./auth.js";
import sessionsRouter from "./routes/sessions.js";
import messagesRouter from "./routes/messages.js";
import agentRouter from "./routes/agent.js";
import knowledgeRouter from "./routes/knowledge.js";
import playbooksRouter from "./routes/playbooks.js";
import meRouter from "./routes/me.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(
  cors({
    origin: (process.env.APP_URL || "http://localhost:5173").split(","),
    credentials: true,
  }),
);

if (auth) {
  app.all("/auth/*", toNodeHandler(auth));
}

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    db: !!process.env.DATABASE_URL,
    llm: !!process.env.OPENAI_API_KEY,
  });
});

app.use("/api/me", meRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/sessions/:sessionId/messages", messagesRouter);
app.use("/api/sessions/:sessionId/agent", agentRouter);
app.use("/api/knowledge", knowledgeRouter);
app.use("/api/playbooks", playbooksRouter);

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(__dirname, "../dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error("[forgeAI]", err);
  res.status(500).json({ error: String(err.message ?? err) });
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`[forgeAI] server listening on http://localhost:${port}`);
});
