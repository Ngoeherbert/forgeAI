import { Router } from "express";
import { runAgentStep } from "../agent/loop.js";
import { requireUser } from "../auth.js";

const router = Router({ mergeParams: true });

router.post("/run", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const result = await runAgentStep(req.params.sessionId);
    res.json(result);
  } catch (err) {
    console.error("[agent]", err);
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

router.get("/stream", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const emit = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const result = await runAgentStep(req.params.sessionId, { emit });
    emit({ type: "done", ...result });
  } catch (err) {
    emit({ type: "error", error: String(err.message ?? err) });
  }
  res.end();
});

export default router;
