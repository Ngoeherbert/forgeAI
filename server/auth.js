import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "./db/index.js";

const socialProviders = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = db
  ? betterAuth({
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      trustedOrigins: [
        process.env.APP_URL || "http://localhost:5173",
        process.env.BETTER_AUTH_URL || "http://localhost:3000",
      ],
      database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
          user: schema.users,
          session: schema.sessionsAuth,
          account: schema.accounts,
          verification: schema.verifications,
        },
      }),
      emailAndPassword: {
        enabled: true,
        autoSignIn: true,
      },
      socialProviders,
    })
  : null;

export async function requireUser(req, res) {
  if (!auth) {
    res.status(500).json({ error: "Auth not configured" });
    return null;
  }
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session.user;
}
