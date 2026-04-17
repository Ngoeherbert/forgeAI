import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Play } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api } from "../../lib/api.js";

function MessageBubble({ m }) {
  if (m.role === "tool") {
    return (
      <div className="my-2 border border-bg-border rounded-md bg-bg-panel text-xs">
        <div className="px-3 py-1.5 border-b border-bg-border text-muted">
          tool result · <span className="text-muted-strong">{m.toolName}</span>
        </div>
        <pre className="p-3 overflow-x-auto text-muted-strong">
          {JSON.stringify(m.toolResult, null, 2)}
        </pre>
      </div>
    );
  }

  if (m.role === "assistant" && m.toolName) {
    return (
      <div className="my-2 border border-accent/40 rounded-md bg-accent/5 text-xs">
        <div className="px-3 py-1.5 border-b border-accent/30 text-accent">
          call → {m.toolName}
        </div>
        <pre className="p-3 overflow-x-auto text-muted-strong">
          {JSON.stringify(m.toolArgs, null, 2)}
        </pre>
      </div>
    );
  }

  const isUser = m.role === "user";
  return (
    <div
      className={`my-3 flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-accent text-white"
            : "bg-bg-panel border border-bg-border text-muted-strong prose-forge"
        }`}
      >
        {isUser ? (
          m.content
        ) : (
          <ReactMarkdown>{m.content || "*(empty)*"}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel({ sessionId, onEvent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const endRef = useRef(null);

  const refresh = useCallback(async () => {
    const { messages } = await api.listMessages(sessionId);
    setMessages(messages);
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || running) return;
    const content = input;
    setInput("");
    await api.sendMessage(sessionId, content);
    await refresh();
    runAgent();
  }

  function runAgent() {
    setRunning(true);
    api.streamAgent(sessionId, {
      onEvent: (e) => {
        onEvent?.(e);
        refresh();
      },
      onDone: () => {
        setRunning(false);
        refresh();
      },
      onError: () => {
        setRunning(false);
      },
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="text-center text-muted py-20 text-sm">
            Start the conversation below.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        {running && (
          <div className="text-xs text-muted animate-pulse px-1 py-2">
            agent is working…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-bg-border bg-bg-subtle p-3">
        <div className="flex items-end gap-2 bg-bg-panel border border-bg-border rounded-lg px-3 py-2">
          <textarea
            rows={2}
            value={input}
            placeholder="Ask forgeAI to build features, fix bugs, or work on your code"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            className="flex-1 bg-transparent outline-none resize-none text-sm placeholder:text-muted"
          />
          <button
            onClick={runAgent}
            disabled={running}
            className="p-2 text-muted hover:text-muted-strong disabled:opacity-50"
            title="Run agent"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={send}
            disabled={running || !input.trim()}
            className="p-2 bg-accent text-white rounded-md disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 text-[11px] text-muted">
          ⌘/Ctrl + Enter to send · agent runs in a sandboxed workspace
        </div>
      </div>
    </div>
  );
}
