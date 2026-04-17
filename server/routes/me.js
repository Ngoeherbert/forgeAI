import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireUser } from "../auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  let membership = await db.query.organizationMembers.findFirst({
    where: eq(schema.organizationMembers.userId, user.id),
    with: { },
  });

  let organization = null;
  if (membership) {
    organization = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, membership.organizationId),
    });
  } else {
    const slug = `${(user.email || "user").split("@")[0]}-org`.toLowerCase();
    const [org] = await db
      .insert(schema.organizations)
      .values({ slug: `${slug}-${Date.now()}`, name: `${user.name || "My"} workspace` })
      .returning();
    await db.insert(schema.organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      role: "owner",
    });
    organization = org;
  }

  res.json({ user, organization });
});

export default router;
