import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireUser } from "../auth.js";

const router = Router();

/**
 * Idempotent first-run bootstrap: if the authenticated user has no
 * organization membership yet, create one inside a transaction. The
 * transaction re-checks membership first so two concurrent /api/me
 * requests from the same user can't race and create two orgs.
 */
async function ensureOrganizationForUser(user) {
  const existing = await db.query.organizationMembers.findFirst({
    where: eq(schema.organizationMembers.userId, user.id),
  });
  if (existing) {
    return db.query.organizations.findFirst({
      where: eq(schema.organizations.id, existing.organizationId),
    });
  }

  return db.transaction(async (tx) => {
    const race = await tx.query.organizationMembers.findFirst({
      where: eq(schema.organizationMembers.userId, user.id),
    });
    if (race) {
      return tx.query.organizations.findFirst({
        where: eq(schema.organizations.id, race.organizationId),
      });
    }

    const prefix = (user.email || "user").split("@")[0].toLowerCase();
    const slug = `${prefix}-org-${Date.now()}`;
    const [org] = await tx
      .insert(schema.organizations)
      .values({
        slug,
        name: `${user.name || "My"} workspace`,
      })
      .returning();

    await tx.insert(schema.organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      role: "owner",
    });

    return org;
  });
}

router.get("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const organization = await ensureOrganizationForUser(user);
  res.json({ user, organization });
});

export default router;
