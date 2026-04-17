import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireUser } from "../auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const m = await db.query.organizationMembers.findFirst({
    where: eq(schema.organizationMembers.userId, user.id),
  });
  if (!m) return res.json({ knowledge: [] });

  const rows = await db.query.knowledge.findMany({
    where: eq(schema.knowledge.organizationId, m.organizationId),
    orderBy: desc(schema.knowledge.updatedAt),
  });
  res.json({ knowledge: rows });
});

router.post("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const m = await db.query.organizationMembers.findFirst({
    where: eq(schema.organizationMembers.userId, user.id),
  });
  if (!m) return res.status(400).json({ error: "No org" });

  const { title, body, trigger, repoScope, pinned } = req.body ?? {};
  const [row] = await db
    .insert(schema.knowledge)
    .values({
      organizationId: m.organizationId,
      authorId: user.id,
      title,
      body,
      trigger,
      repoScope,
      pinned: !!pinned,
    })
    .returning();
  res.status(201).json({ knowledge: row });
});

router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const [row] = await db
    .update(schema.knowledge)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(schema.knowledge.id, req.params.id))
    .returning();
  res.json({ knowledge: row });
});

router.delete("/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await db.delete(schema.knowledge).where(eq(schema.knowledge.id, req.params.id));
  res.status(204).end();
});

export default router;
