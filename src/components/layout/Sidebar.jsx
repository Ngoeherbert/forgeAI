import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Sparkles,
  BookOpen,
  GitPullRequest,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";
import classNames from "classnames";
import { useAppStore } from "../../store/useAppStore.js";
import { signOut } from "../../lib/auth-client.js";

const NAV = [
  { to: "/sessions", label: "Sessions", icon: MessageSquare },
  { to: "/ask", label: "Ask", icon: Sparkles },
  { to: "/wiki", label: "Wiki", icon: BookOpen },
  { to: "/review", label: "Review", icon: GitPullRequest },
];

function navCx({ isActive }) {
  return classNames(
    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
    isActive
      ? "bg-bg-hover text-white"
      : "text-muted hover:bg-bg-hover hover:text-muted-strong",
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { organization, sessions, loadSessions, me } = useAppStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <aside className="w-64 shrink-0 bg-bg-subtle border-r border-bg-border flex flex-col">
      <div className="p-3 border-b border-bg-border flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-bg-panel grid place-items-center text-accent">
          <div className="grid grid-cols-2 gap-[2px]">
            <span className="h-1 w-1 rounded-full bg-accent" />
            <span className="h-1 w-1 rounded-full bg-accent" />
            <span className="h-1 w-1 rounded-full bg-accent" />
            <span className="h-1 w-1 rounded-full bg-accent" />
          </div>
        </div>
        <div className="flex-1 text-sm font-medium text-white truncate">
          {organization?.name ?? "forgeAI"}
        </div>
      </div>

      <nav className="px-2 py-3 space-y-1">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={navCx}>
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 mt-2 flex items-center justify-between text-xs text-muted uppercase tracking-wide">
        <span>Recent</span>
        <button
          onClick={() => navigate("/sessions")}
          className="p-1 rounded hover:bg-bg-hover text-muted hover:text-muted-strong"
          title="New session"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {sessions.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted">No sessions</div>
        )}
        {sessions.map((s) => (
          <NavLink
            key={s.id}
            to={`/sessions/${s.id}`}
            className={({ isActive }) =>
              classNames(
                "block px-3 py-2 rounded-md text-sm truncate",
                isActive
                  ? "bg-bg-hover text-white"
                  : "text-muted-strong hover:bg-bg-hover",
              )
            }
          >
            {s.title}
            <div className="text-[11px] text-muted mt-0.5 capitalize">
              {s.status.replaceAll("_", " ")}
            </div>
          </NavLink>
        ))}
      </div>

      <div className="p-2 border-t border-bg-border space-y-1">
        {me && (
          <div className="px-3 py-1.5 text-xs text-muted truncate">
            {me.email}
          </div>
        )}
        <button
          onClick={() => {}}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted hover:bg-bg-hover hover:text-muted-strong"
        >
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted hover:bg-bg-hover hover:text-muted-strong"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
