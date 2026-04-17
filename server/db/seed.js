import "dotenv/config";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Aborting seed.");
  process.exit(1);
}

const db = drizzle(neon(process.env.DATABASE_URL), { schema });

async function upsertUser({ email, name }) {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  if (existing) return existing;
  const [u] = await db
    .insert(schema.users)
    .values({
      id: randomUUID(),
      email,
      name,
      emailVerified: true,
      role: "owner",
    })
    .returning();
  return u;
}

async function main() {
  console.log("Seeding forgeAI…");

  const demoUser = await upsertUser({
    email: "demo@forgeai.dev",
    name: "Demo User",
  });

  let org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, "forgeai-demo"),
  });
  if (!org) {
    const [row] = await db
      .insert(schema.organizations)
      .values({ slug: "forgeai-demo", name: "forgeAI Demo" })
      .returning();
    org = row;
  }

  const member = await db.query.organizationMembers.findFirst({
    where: eq(schema.organizationMembers.userId, demoUser.id),
  });
  if (!member) {
    await db.insert(schema.organizationMembers).values({
      organizationId: org.id,
      userId: demoUser.id,
      role: "owner",
    });
  }

  const existingKnowledge = await db.query.knowledge.findMany({
    where: eq(schema.knowledge.organizationId, org.id),
  });
  if (existingKnowledge.length === 0) {
    await db.insert(schema.knowledge).values([
      {
        organizationId: org.id,
        authorId: demoUser.id,
        title: "Use pnpm in this repo",
        body: "This repository uses pnpm for installation. Prefer `pnpm install` over `npm install`.",
        trigger: "when installing dependencies",
        pinned: true,
      },
      {
        organizationId: org.id,
        authorId: demoUser.id,
        title: "Run tests with `pnpm test`",
        body: "Tests are configured via vitest. Run `pnpm test` before opening a PR.",
        trigger: "before creating a PR",
      },
    ]);
  }

  const existingPlaybooks = await db.query.playbooks.findMany({
    where: eq(schema.playbooks.organizationId, org.id),
  });
  if (existingPlaybooks.length === 0) {
    await db.insert(schema.playbooks).values([
      {
        organizationId: org.id,
        authorId: demoUser.id,
        name: "Fix a failing CI job",
        description: "Reproduce the failure, locate root cause, land a fix.",
        tags: ["ci", "debug"],
        body: `1. Inspect the failing job log via \`git_ci_job_logs\`.
2. Reproduce the failure locally with the exact command the job ran.
3. Locate the root cause — do NOT silence the test.
4. Write a minimal patch.
5. Run the full lint + test suite locally.
6. Push to the PR branch and wait for CI.`,
      },
      {
        organizationId: org.id,
        authorId: demoUser.id,
        name: "Add a new Drizzle table",
        description: "Scaffold a new table end-to-end.",
        tags: ["db", "drizzle"],
        body: `1. Add the table definition to \`server/db/schema.js\`.
2. Add relations as needed.
3. Run \`pnpm db:generate\` to create the SQL migration.
4. Run \`pnpm db:push\` against the dev database.
5. Expose a CRUD router under \`server/routes/\`.
6. Wire the router in \`server/index.js\`.
7. Add seed rows if applicable.`,
      },
    ]);
  }

  const existingSession = await db.query.agentSessions.findFirst({
    where: eq(schema.agentSessions.userId, demoUser.id),
  });
  if (!existingSession) {
    const [sess] = await db
      .insert(schema.agentSessions)
      .values({
        organizationId: org.id,
        userId: demoUser.id,
        title: "Welcome to forgeAI",
        status: "sleeping",
        repo: "Ngoeherbert/forgeAI",
      })
      .returning();

    await db.insert(schema.messages).values([
      {
        sessionId: sess.id,
        role: "user",
        content: "Create a hello world program in C and compile it.",
      },
      {
        sessionId: sess.id,
        role: "assistant",
        content:
          "Welcome to forgeAI — this is a seeded demo session. Connect an OPENAI_API_KEY and ask a real question to see the agent loop run.",
      },
    ]);
  }

  console.log("Seed complete.");
  console.log(` Org: ${org.slug} (${org.id})`);
  console.log(` User: ${demoUser.email} (${demoUser.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
