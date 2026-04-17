import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

export default function Worklog({ sessionId, events }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    api.listMessages(sessionId).then((r) => setMessages(r.messages));
  }, [sessionId, events.length]);

  const items = messages
    .filter((m) => m.role === "assistant" || m.role === "tool")
    .map((m) => ({
      id: m.id,
      when: new Date(m.createdAt).toLocaleTimeString(),
      kind:
        m.role === "tool"
          ? "tool_result"
          : m.toolName
            ? "tool_call"
            : "thought",
      label: m.toolName || (m.role === "assistant" ? "reply" : "tool"),
      body:
        m.role === "tool"
          ? JSON.stringify(m.toolResult)
          : m.toolName
            ? JSON.stringify(m.toolArgs)
            : m.content,
    }));

  return (
    <div className="h-full overflow-y-auto p-4 text-sm">
      <div className="text-xs uppercase tracking-wide text-muted mb-2">
        Worklog ({items.length})
      </div>
      {items.length === 0 && (
        <div className="text-muted text-xs">Nothing recorded yet.</div>
      )}
      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.id}
            className="border border-bg-border rounded-md bg-bg-panel overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-bg-border text-xs">
              <span className="text-muted-strong">{it.label}</span>
              <span className="text-muted">{it.when}</span>
            </div>
            <pre className="p-3 text-xs whitespace-pre-wrap overflow-x-auto">
              {it.body?.slice(0, 2000)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
