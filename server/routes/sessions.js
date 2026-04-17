import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireUser } from "../auth.js";

const router = Router();

async function userOrgId(userId) {
  const m = await db.query.organizationMembers.findFirst({
    where: eq(schema.organizationMembers.userId, userId),
  });
  return m?.organizationId ?? null;
}

/**
 * Load a session and confirm the current user belongs to the session's
 * organization. Responds 404 if the session doesn't exist or the user
 * isn't a member of its org (avoids leaking existence of other orgs'
 * sessions via UUID enumeration).
 */
async function loadSessionForUser(req, res, user) {
  const session = await db.query.agentSessions.findFirst({
    where: eq(schema.agentSessions.id, req.params.id),
  });
  if (!session) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  const orgId = await userOrgId(user.id);
  if (!orgId || orgId !== session.organizationId) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  return session;
}

router.get("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const orgId = await userOrgId(user.id);
  if (!orgId) return res.json({ sessions: [] });

  const rows = await db.query.agentSessions.findMany({
    where: eq(schema.agentSessions.organizationId, orgId),
    orderBy: desc(schema.agentSessions.updatedAt),
    limit: 100,
  });
  res.json({ sessions: rows });
});

router.post("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const orgId = await userOrgId(user.id);
  if (!orgId) return res.status(400).json({ error: "No organization" });

  const { title, repo, branch, model, initialPrompt } = req.body ?? {};
  const [session] = await db
    .insert(schema.agentSessions)
    .values({
      organizationId: orgId,
      userId: user.id,
      title: title || "Untitled session",
      repo,
      branch,
      model,
      status: "queued",
    })
    .returning();

  if (initialPrompt) {
    await db.insert(schema.messages).values({
      sessionId: session.id,
      role: "user",
      content: initialPrompt,
    });
  }

  res.status(201).json({ session });
});

router.get("/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const session = await loadSessionForUser(req, res, user);
  if (!session) return;
  res.json({ session });
});

router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const session = await loadSessionForUser(req, res, user);
  if (!session) return;

  const { title, status, archivedAt } = req.body ?? {};
  const [updated] = await db
    .update(schema.agentSessions)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(archivedAt !== undefined ? { archivedAt } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.agentSessions.id, session.id))
    .returning();
  res.json({ session: updated });
});

router.delete("/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await db
    .delete(schema.agentSessions)
    .where(
      and(
        eq(schema.agentSessions.id, req.params.id),
        eq(schema.agentSessions.userId, user.id),
      ),
    );
  res.status(204).end();
});

export default router;
