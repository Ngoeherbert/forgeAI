import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

function resolveSafe(workdir, p) {
  const abs = path.resolve(workdir, p);
  const rel = path.relative(workdir, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes workspace: ${p}`);
  }
  return abs;
}

export async function ensureWorkdir(workdir) {
  await fs.mkdir(workdir, { recursive: true });
}

export async function readFileTool(workdir, { path: p }) {
  const abs = resolveSafe(workdir, p);
  const content = await fs.readFile(abs, "utf8");
  return { path: p, content };
}

export async function writeFileTool(workdir, { path: p, content }) {
  const abs = resolveSafe(workdir, p);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
  const stat = await fs.stat(abs);
  return { path: p, bytes: stat.size };
}

export async function listDirTool(workdir, { path: p = "." }) {
  const abs = resolveSafe(workdir, p);
  const entries = await fs.readdir(abs, { withFileTypes: true });
  return {
    path: p,
    entries: entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "dir" : "file",
    })),
  };
}

export async function runCommandTool(workdir, { command, timeout_ms = 60_000 }) {
  const banned = /\b(sudo|rm\s+-rf\s+\/|curl\s+[^|]+\|\s*sh)\b/;
  if (banned.test(command)) {
    return {
      stdout: "",
      stderr: `Refused: command matches safety deny-list: ${command}`,
      exitCode: 1,
    };
  }
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workdir,
      timeout: timeout_ms,
      maxBuffer: 2 * 1024 * 1024,
      shell: "/bin/bash",
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? String(err.message ?? err),
      exitCode: err.code ?? 1,
    };
  }
}

export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a text file from the workspace.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write (create or overwrite) a text file in the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List entries in a workspace directory.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", default: "." } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a shell command in the workspace.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          timeout_ms: { type: "integer", default: 60000 },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finish",
      description: "Signal that the task is complete.",
      parameters: {
        type: "object",
        properties: { summary: { type: "string" } },
        required: ["summary"],
      },
    },
  },
];

export async function dispatchTool(workdir, name, args) {
  switch (name) {
    case "read_file":
      return readFileTool(workdir, args);
    case "write_file":
      return writeFileTool(workdir, args);
    case "list_dir":
      return listDirTool(workdir, args);
    case "run_command":
      return runCommandTool(workdir, args);
    case "finish":
      return { done: true, summary: args.summary };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
