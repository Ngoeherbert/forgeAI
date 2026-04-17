import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[forgeAI] DATABASE_URL is not set. The server will start but DB calls will fail.",
  );
}

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export const db = sql ? drizzle(sql, { schema }) : null;
export { schema };
