import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import ChatPanel from "../components/session/ChatPanel.jsx";
import Worklog from "../components/session/Worklog.jsx";
import DiffTab from "../components/session/DiffTab.jsx";
import ShellTab from "../components/session/ShellTab.jsx";
import TabsBar from "../components/session/TabsBar.jsx";

export default function SessionPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("worklog");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    setEvents([]);
    api.getSession(id).then((r) => setSession(r.session));
  }, [id]);

  if (!session) {
    return <div className="p-6 text-muted">Loading session…</div>;
  }

  return (
    <div className="flex-1 min-h-0 flex">
      {/* Left: chat */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-bg-border">
        <header className="border-b border-bg-border px-4 py-3 bg-bg-subtle flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted">
              Ask forgeAI
            </div>
            <div className="text-sm text-white truncate">{session.title}</div>
          </div>
          <span className="text-[11px] uppercase tracking-wide text-muted">
            {session.status.replaceAll("_", " ")}
          </span>
        </header>
        <div className="flex-1 min-h-0">
          <ChatPanel
            sessionId={id}
            onEvent={(e) => setEvents((prev) => [...prev, e])}
          />
        </div>
      </div>

      {/* Right: panels */}
      <aside className="w-[42%] min-w-[420px] flex flex-col bg-bg">
        <TabsBar active={tab} onChange={setTab} />
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === "worklog" && (
            <Worklog sessionId={id} events={events} />
          )}
          {tab === "diff" && <DiffTab sessionId={id} />}
          {tab === "shell" && <ShellTab sessionId={id} />}
          {tab === "desktop" && (
            <div className="p-6 text-sm text-muted">
              Live desktop streaming is a stub. Wire a VNC or CDP bridge and
              render it here.
            </div>
          )}
          {tab === "agents" && (
            <div className="p-6 text-sm text-muted">
              Child-agent orchestration UI goes here.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
