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
  if (!orgId) return res.json({ knowledge: [] });

  const rows = await db.query.knowledge.findMany({
    where: eq(schema.knowledge.organizationId, orgId),
    orderBy: desc(schema.knowledge.updatedAt),
  });
  res.json({ knowledge: rows });
});

router.post("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const orgId = await userOrgId(user.id);
  if (!orgId) return res.status(400).json({ error: "No org" });

  const { title, body, trigger, repoScope, pinned } = req.body ?? {};
  const [row] = await db
    .insert(schema.knowledge)
    .values({
      organizationId: orgId,
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
  const orgId = await userOrgId(user.id);
  if (!orgId) return res.status(404).json({ error: "Not found" });

  // Allow-list the mutable fields — never trust the request body to
  // reassign organizationId / authorId / id.
  const { title, body, trigger, repoScope, pinned } = req.body ?? {};
  const patch = {
    ...(title !== undefined ? { title } : {}),
    ...(body !== undefined ? { body } : {}),
    ...(trigger !== undefined ? { trigger } : {}),
    ...(repoScope !== undefined ? { repoScope } : {}),
    ...(pinned !== undefined ? { pinned: !!pinned } : {}),
    updatedAt: new Date(),
  };

  const [row] = await db
    .update(schema.knowledge)
    .set(patch)
    .where(
      and(
        eq(schema.knowledge.id, req.params.id),
        eq(schema.knowledge.organizationId, orgId),
      ),
    )
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ knowledge: row });
});

router.delete("/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const orgId = await userOrgId(user.id);
  if (!orgId) return res.status(404).json({ error: "Not found" });

  await db
    .delete(schema.knowledge)
    .where(
      and(
        eq(schema.knowledge.id, req.params.id),
        eq(schema.knowledge.organizationId, orgId),
      ),
    );
  res.status(204).end();
});

export default router;
