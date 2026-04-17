import { Router } from "express";
import { eq } from "drizzle-orm";
import { runAgentStep } from "../agent/loop.js";
import { db, schema } from "../db/index.js";
import { requireUser } from "../auth.js";

const router = Router({ mergeParams: true });

/**
 * Ensure the authenticated user belongs to the organization that owns
 * the session identified by req.params.sessionId. Responds 404 if not.
 */
async function ensureSessionAccess(req, res, user) {
  const session = await db.query.agentSessions.findFirst({
    where: eq(schema.agentSessions.id, req.params.sessionId),
  });
  if (!session) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  const membership = await db.query.organizationMembers.findFirst({
    where: eq(schema.organizationMembers.userId, user.id),
  });
  if (!membership || membership.organizationId !== session.organizationId) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  return session;
}

router.post("/run", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const session = await ensureSessionAccess(req, res, user);
  if (!session) return;
  try {
    const result = await runAgentStep(session.id);
    res.json(result);
  } catch (err) {
    console.error("[agent]", err);
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

router.get("/stream", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const session = await ensureSessionAccess(req, res, user);
  if (!session) return;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const emit = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const result = await runAgentStep(session.id, { emit });
    emit({ type: "done", ...result });
  } catch (err) {
    emit({ type: "error", error: String(err.message ?? err) });
  }
  res.end();
});

export default router;
