import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/*  Enums                                                              */
/* ------------------------------------------------------------------ */

export const sessionStatusEnum = pgEnum("session_status", [
  "queued",
  "running",
  "awaiting_user",
  "sleeping",
  "archived",
  "error",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "system",
  "user",
  "assistant",
  "tool",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
  "blocked",
]);

export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);

export const integrationKindEnum = pgEnum("integration_kind", [
  "github",
  "gitlab",
  "slack",
  "linear",
  "notion",
  "sentry",
  "datadog",
  "custom",
]);

/* ------------------------------------------------------------------ */
/*  Better Auth / Neon Auth compatible tables                          */
/*  (Column shape matches `better-auth` defaults so `neon_auth.*`      */
/*   views can be layered on top if desired.)                          */
/* ------------------------------------------------------------------ */

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  displayName: text("displayName"),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const sessionsAuth = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  Domain tables                                                      */
/* ------------------------------------------------------------------ */

export const organizations = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    uniqMember: uniqueIndex("org_member_unique").on(t.organizationId, t.userId),
  }),
);

export const agentSessions = pgTable(
  "agent_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled session"),
    status: sessionStatusEnum("status").notNull().default("queued"),
    repo: text("repo"),
    branch: text("branch"),
    model: text("model"),
    systemPrompt: text("systemPrompt"),
    metadata: jsonb("metadata").$type().default({}),
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("agent_session_org_idx").on(t.organizationId),
    byUser: index("agent_session_user_idx").on(t.userId),
  }),
);

export const messages = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("sessionId")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull().default(""),
    toolCallId: text("toolCallId"),
    toolName: text("toolName"),
    toolArgs: jsonb("toolArgs").$type(),
    toolResult: jsonb("toolResult").$type(),
    tokens: integer("tokens"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    bySession: index("message_session_idx").on(t.sessionId, t.createdAt),
  }),
);

export const tasks = pgTable(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("sessionId")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    status: taskStatusEnum("status").notNull().default("pending"),
    orderIndex: integer("orderIndex").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    bySession: index("task_session_idx").on(t.sessionId, t.orderIndex),
  }),
);

export const toolCalls = pgTable(
  "tool_call",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("sessionId")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    messageId: uuid("messageId").references(() => messages.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    args: jsonb("args").$type().notNull().default({}),
    result: jsonb("result").$type(),
    status: text("status").notNull().default("pending"),
    durationMs: integer("durationMs"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    bySession: index("tool_call_session_idx").on(t.sessionId, t.createdAt),
  }),
);

export const artifacts = pgTable(
  "artifact",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("sessionId")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    kind: text("kind").notNull().default("file"),
    content: text("content"),
    bytes: integer("bytes"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    bySession: index("artifact_session_idx").on(t.sessionId),
  }),
);

export const knowledge = pgTable(
  "knowledge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    authorId: text("authorId").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    trigger: text("trigger"),
    repoScope: text("repoScope"),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("knowledge_org_idx").on(t.organizationId),
  }),
);

export const playbooks = pgTable(
  "playbook",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    authorId: text("authorId").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    body: text("body").notNull(),
    tags: jsonb("tags").$type().notNull().default([]),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("playbook_org_idx").on(t.organizationId),
  }),
);

export const integrations = pgTable(
  "integration",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: integrationKindEnum("kind").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type().notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("integration_org_idx").on(t.organizationId),
  }),
);

/* ------------------------------------------------------------------ */
/*  Relations                                                          */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  sessions: many(agentSessions),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  sessions: many(agentSessions),
  knowledge: many(knowledge),
  playbooks: many(playbooks),
  integrations: many(integrations),
}));

export const agentSessionsRelations = relations(
  agentSessions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [agentSessions.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [agentSessions.userId],
      references: [users.id],
    }),
    messages: many(messages),
    tasks: many(tasks),
    toolCalls: many(toolCalls),
    artifacts: many(artifacts),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(agentSessions, {
    fields: [messages.sessionId],
    references: [agentSessions.id],
  }),
}));
