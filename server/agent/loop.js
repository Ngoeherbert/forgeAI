import path from "node:path";
import OpenAI from "openai";
import { eq, asc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { FORGE_SYSTEM_PROMPT } from "./prompts.js";
import {
  TOOL_SCHEMAS,
  dispatchTool,
  ensureWorkdir,
} from "./tools.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_STEPS = Number(process.env.AGENT_MAX_STEPS || 24);

async function loadHistory(sessionId) {
  const rows = await db.query.messages.findMany({
    where: eq(schema.messages.sessionId, sessionId),
    orderBy: asc(schema.messages.createdAt),
  });

  const msgs = [];
  for (const m of rows) {
    if (m.role === "tool") {
      msgs.push({
        role: "tool",
        tool_call_id: m.toolCallId,
        content: JSON.stringify(m.toolResult ?? {}),
      });
    } else if (m.role === "assistant" && m.toolName) {
      msgs.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: [
          {
            id: m.toolCallId,
            type: "function",
            function: {
              name: m.toolName,
              arguments: JSON.stringify(m.toolArgs ?? {}),
            },
          },
        ],
      });
    } else {
      msgs.push({ role: m.role, content: m.content });
    }
  }
  return msgs;
}

async function record(sessionId, row) {
  const [m] = await db.insert(schema.messages).values({
    sessionId,
    role: row.role,
    content: row.content ?? "",
    toolCallId: row.toolCallId,
    toolName: row.toolName,
    toolArgs: row.toolArgs,
    toolResult: row.toolResult,
  }).returning();
  return m;
}

export async function runAgentStep(sessionId, { emit } = {}) {
  if (!db) throw new Error("DB not configured");
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const session = await db.query.agentSessions.findFirst({
    where: eq(schema.agentSessions.id, sessionId),
  });
  if (!session) throw new Error("Session not found");

  const workdir = path.resolve(
    process.env.AGENT_WORKDIR || ".agent-workdir",
    sessionId,
  );
  await ensureWorkdir(workdir);

  const system = session.systemPrompt || FORGE_SYSTEM_PROMPT;
  const history = await loadHistory(sessionId);

  const messages = [{ role: "system", content: system }, ...history];

  await db
    .update(schema.agentSessions)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(schema.agentSessions.id, sessionId));

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await openai.chat.completions.create({
      model: session.model || MODEL,
      messages,
      tools: TOOL_SCHEMAS,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const msg = choice.message;

    if (msg.tool_calls?.length) {
      for (const call of msg.tool_calls) {
        const args = safeJson(call.function.arguments);
        const assistantRow = {
          role: "assistant",
          content: msg.content ?? "",
          toolCallId: call.id,
          toolName: call.function.name,
          toolArgs: args,
        };
        await record(sessionId, assistantRow);
        emit?.({ type: "assistant_tool_call", ...assistantRow });

        const start = Date.now();
        let result;
        try {
          result = await dispatchTool(workdir, call.function.name, args);
        } catch (err) {
          result = { error: String(err.message ?? err) };
        }
        const durationMs = Date.now() - start;

        await db.insert(schema.toolCalls).values({
          sessionId,
          name: call.function.name,
          args,
          result,
          status: result?.error ? "error" : "ok",
          durationMs,
        });

        await record(sessionId, {
          role: "tool",
          content: "",
          toolCallId: call.id,
          toolName: call.function.name,
          toolResult: result,
        });
        emit?.({
          type: "tool_result",
          name: call.function.name,
          result,
          durationMs,
        });

        messages.push({
          role: "assistant",
          content: msg.content ?? null,
          tool_calls: [call],
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });

        if (call.function.name === "finish") {
          await db
            .update(schema.agentSessions)
            .set({ status: "sleeping", updatedAt: new Date() })
            .where(eq(schema.agentSessions.id, sessionId));
          emit?.({ type: "finished", summary: result.summary });
          return { status: "finished", summary: result.summary };
        }
      }
      continue;
    }

    await record(sessionId, {
      role: "assistant",
      content: msg.content ?? "",
    });
    emit?.({ type: "assistant_message", content: msg.content ?? "" });

    await db
      .update(schema.agentSessions)
      .set({ status: "awaiting_user", updatedAt: new Date() })
      .where(eq(schema.agentSessions.id, sessionId));
    return { status: "awaiting_user", content: msg.content ?? "" };
  }

  await db
    .update(schema.agentSessions)
    .set({ status: "error", updatedAt: new Date() })
    .where(eq(schema.agentSessions.id, sessionId));
  emit?.({ type: "error", error: "Max steps exceeded" });
  return { status: "error", error: "Max steps exceeded" };
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
