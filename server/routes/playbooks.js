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
  if (!m) return res.json({ playbooks: [] });
  const rows = await db.query.playbooks.findMany({
    where: eq(schema.playbooks.organizationId, m.organizationId),
    orderBy: desc(schema.playbooks.updatedAt),
  });
  res.json({ playbooks: rows });
});

router.post("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const m = await db.query.organizationMembers.findFirst({
    where: eq(schema.organizationMembers.userId, user.id),
  });
  if (!m) return res.status(400).json({ error: "No org" });

  const { name, description, body, tags } = req.body ?? {};
  const [row] = await db
    .insert(schema.playbooks)
    .values({
      organizationId: m.organizationId,
      authorId: user.id,
      name,
      description,
      body,
      tags: tags ?? [],
    })
    .returning();
  res.status(201).json({ playbook: row });
});

router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const [row] = await db
    .update(schema.playbooks)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(schema.playbooks.id, req.params.id))
    .returning();
  res.json({ playbook: row });
});

router.delete("/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await db.delete(schema.playbooks).where(eq(schema.playbooks.id, req.params.id));
  res.status(204).end();
});

export default router;
