import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireUser } from "../auth.js";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const rows = await db.query.messages.findMany({
    where: eq(schema.messages.sessionId, req.params.sessionId),
    orderBy: asc(schema.messages.createdAt),
  });
  res.json({ messages: rows });
});

router.post("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const { content } = req.body ?? {};
  if (!content) return res.status(400).json({ error: "content required" });

  const [m] = await db
    .insert(schema.messages)
    .values({
      sessionId: req.params.sessionId,
      role: "user",
      content,
    })
    .returning();

  await db
    .update(schema.agentSessions)
    .set({ status: "queued", updatedAt: new Date() })
    .where(eq(schema.agentSessions.id, req.params.sessionId));

  res.status(201).json({ message: m });
});

export default router;
