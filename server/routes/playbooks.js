import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireUser } from "../auth.js";

const router = Router();

async function userOrgId(userId) {
  const m = await db.query.organizationMembers.findFirst({
    where: eq(schema.organizationMembers.userId, userId),
  });
  return m?.organizationId ?? null;
}

router.get("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const orgId = await userOrgId(user.id);
  if (!orgId) return res.json({ playbooks: [] });

  const rows = await db.query.playbooks.findMany({
    where: eq(schema.playbooks.organizationId, orgId),
    orderBy: desc(schema.playbooks.updatedAt),
  });
  res.json({ playbooks: rows });
});

router.post("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const orgId = await userOrgId(user.id);
  if (!orgId) return res.status(400).json({ error: "No org" });

  const { name, description, body, tags } = req.body ?? {};
  const [row] = await db
    .insert(schema.playbooks)
    .values({
      organizationId: orgId,
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
  const orgId = await userOrgId(user.id);
  if (!orgId) return res.status(404).json({ error: "Not found" });

  // Allow-list the mutable fields.
  const { name, description, body, tags } = req.body ?? {};
  const patch = {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(body !== undefined ? { body } : {}),
    ...(tags !== undefined ? { tags } : {}),
    updatedAt: new Date(),
  };

  const [row] = await db
    .update(schema.playbooks)
    .set(patch)
    .where(
      and(
        eq(schema.playbooks.id, req.params.id),
        eq(schema.playbooks.organizationId, orgId),
      ),
    )
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ playbook: row });
});

router.delete("/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const orgId = await userOrgId(user.id);
  if (!orgId) return res.status(404).json({ error: "Not found" });

  await db
    .delete(schema.playbooks)
    .where(
      and(
        eq(schema.playbooks.id, req.params.id),
        eq(schema.playbooks.organizationId, orgId),
      ),
    );
  res.status(204).end();
});

export default router;
