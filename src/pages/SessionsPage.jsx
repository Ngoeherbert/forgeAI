import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles, GitBranch } from "lucide-react";
import { useAppStore } from "../store/useAppStore.js";

export default function SessionsPage() {
  const navigate = useNavigate();
  const { sessions, loadSessions, createSession } = useAppStore();
  const [prompt, setPrompt] = useState("");
  const [repo, setRepo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function create() {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const session = await createSession({
        title: prompt.split("\n")[0].slice(0, 80),
        repo: repo || null,
        initialPrompt: prompt,
      });
      navigate(`/sessions/${session.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 text-accent mb-3">
          <Sparkles className="h-5 w-5" />
          <span className="uppercase text-xs tracking-wider">
            forgeAI · autonomous coding agent
          </span>
        </div>
        <h1 className="text-3xl font-semibold text-white mb-6">
          Ask forgeAI to build features, fix bugs, or work on your code
        </h1>

        <div className="bg-bg-panel border border-bg-border rounded-lg p-3">
          <textarea
            rows={4}
            placeholder="Describe the task in detail…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-transparent outline-none resize-none text-sm placeholder:text-muted"
          />
          <div className="flex items-center justify-between border-t border-bg-border pt-3 mt-2">
            <div className="flex items-center gap-2 text-muted text-xs">
              <GitBranch className="h-3.5 w-3.5" />
              <input
                placeholder="optional repo (org/name)"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="bg-transparent outline-none"
              />
            </div>
            <button
              onClick={create}
              disabled={busy || !prompt.trim()}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Start session
            </button>
          </div>
        </div>

        <div className="mt-10">
          <div className="text-xs uppercase tracking-wide text-muted mb-2">
            Recent sessions
          </div>
          {sessions.length === 0 && (
            <div className="text-sm text-muted py-4">
              You haven't started any sessions yet.
            </div>
          )}
          <ul className="divide-y divide-bg-border border border-bg-border rounded-lg overflow-hidden">
            {sessions.map((s) => (
              <li
                key={s.id}
                onClick={() => navigate(`/sessions/${s.id}`)}
                className="px-4 py-3 hover:bg-bg-hover cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white truncate">
                    {s.title}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-muted">
                    {s.status.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {s.repo ?? "no repo"} ·{" "}
                  {new Date(s.updatedAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
