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

/**
 * Load persisted messages and reconstruct them into the format the
 * OpenAI chat-completions API expects.
 *
 * Assistant messages that included tool_calls are stored in the DB in two
 * possible shapes:
 *   1. Batch (current): one row with `toolName === null` and `toolArgs`
 *      as an array of `{id, name, arguments}` objects — one entry per
 *      tool call in the original LLM response.
 *   2. Legacy (pre-fix rows): one row per tool call with `toolName`
 *      set to the function name and `toolArgs` as the argument object.
 *
 * The reconstructed API messages always look like:
 *   assistant { tool_calls: [c1, c2, ...] } → tool{c1} → tool{c2} → ...
 * which is the shape OpenAI requires.
 */
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
      continue;
    }

    if (m.role !== "assistant") {
      msgs.push({ role: m.role, content: m.content });
      continue;
    }

    // Batch row: toolArgs is an array of tool_call descriptors.
    if (Array.isArray(m.toolArgs)) {
      msgs.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolArgs.map((c) => ({
          id: c.id,
          type: "function",
          function: {
            name: c.name,
            arguments:
              typeof c.arguments === "string"
                ? c.arguments
                : JSON.stringify(c.arguments ?? {}),
          },
        })),
      });
      continue;
    }

    // Legacy single-tool-call row.
    if (m.toolName) {
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
      continue;
    }

    // Plain assistant text.
    msgs.push({ role: "assistant", content: m.content });
  }
  return msgs;
}

async function insertMessage(sessionId, row) {
  const [m] = await db
    .insert(schema.messages)
    .values({
      sessionId,
      role: row.role,
      content: row.content ?? "",
      toolCallId: row.toolCallId ?? null,
      toolName: row.toolName ?? null,
      toolArgs: row.toolArgs ?? null,
      toolResult: row.toolResult ?? null,
    })
    .returning();
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
      // Persist and push ONE assistant message containing ALL tool_calls
      // from this completion, per OpenAI's required format.
      const toolCallDescriptors = msg.tool_calls.map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: safeJson(call.function.arguments),
      }));

      await insertMessage(sessionId, {
        role: "assistant",
        content: msg.content ?? "",
        toolArgs: toolCallDescriptors,
      });
      emit?.({
        type: "assistant_tool_call",
        content: msg.content ?? "",
        toolCalls: toolCallDescriptors,
      });

      messages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: msg.tool_calls,
      });

      // Execute each tool call and append tool result messages in order.
      let finished = null;
      for (const call of msg.tool_calls) {
        const args = safeJson(call.function.arguments);
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

        await insertMessage(sessionId, {
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
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });

        if (call.function.name === "finish") {
          finished = result;
        }
      }

      if (finished) {
        await db
          .update(schema.agentSessions)
          .set({ status: "sleeping", updatedAt: new Date() })
          .where(eq(schema.agentSessions.id, sessionId));
        emit?.({ type: "finished", summary: finished.summary });
        return { status: "finished", summary: finished.summary };
      }
      continue;
    }

    await insertMessage(sessionId, {
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
  if (s == null) return {};
  if (typeof s !== "string") return s;
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
