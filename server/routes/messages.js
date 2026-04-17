import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireUser } from "../auth.js";

const router = Router({ mergeParams: true });

/**
 * Ensure the authenticated user belongs to the organization that owns
 * the session identified by req.params.sessionId. Responds 404 if not
 * (avoids leaking session existence via UUID enumeration).
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

router.get("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const session = await ensureSessionAccess(req, res, user);
  if (!session) return;

  const rows = await db.query.messages.findMany({
    where: eq(schema.messages.sessionId, session.id),
    orderBy: asc(schema.messages.createdAt),
  });
  res.json({ messages: rows });
});

router.post("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const session = await ensureSessionAccess(req, res, user);
  if (!session) return;

  const { content } = req.body ?? {};
  if (!content) return res.status(400).json({ error: "content required" });

  const [m] = await db
    .insert(schema.messages)
    .values({
      sessionId: session.id,
      role: "user",
      content,
    })
    .returning();

  await db
    .update(schema.agentSessions)
    .set({ status: "queued", updatedAt: new Date() })
    .where(eq(schema.agentSessions.id, session.id));

  res.status(201).json({ message: m });
});

export default router;
