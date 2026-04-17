import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

export default function ShellTab({ sessionId }) {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    api.listMessages(sessionId).then(({ messages }) => {
      setCalls(
        messages
          .filter((m) => m.toolName === "run_command" && m.role === "tool")
          .map((m) => m.toolResult),
      );
    });
  }, [sessionId]);

  return (
    <div className="h-full overflow-y-auto p-4 font-mono text-xs">
      {calls.length === 0 && (
        <div className="text-muted">No shell commands have run yet.</div>
      )}
      {calls.map((c, i) => (
        <div key={i} className="mb-4">
          <div className="text-accent">$ exit={c.exitCode ?? 0}</div>
          {c.stdout && (
            <pre className="whitespace-pre-wrap text-muted-strong">
              {c.stdout}
            </pre>
          )}
          {c.stderr && (
            <pre className="whitespace-pre-wrap text-red-400">{c.stderr}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
