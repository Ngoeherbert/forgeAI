import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api.js";

export default function WikiPage() {
  const [knowledge, setKnowledge] = useState([]);
  const [form, setForm] = useState({ title: "", body: "", trigger: "" });

  async function refresh() {
    const r = await api.listKnowledge();
    setKnowledge(r.knowledge);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.title || !form.body) return;
    await api.createKnowledge(form);
    setForm({ title: "", body: "", trigger: "" });
    refresh();
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-white mb-6">Wiki</h1>

        <form
          onSubmit={submit}
          className="bg-bg-panel border border-bg-border rounded-lg p-4 mb-8 space-y-3"
        >
          <input
            placeholder="Knowledge title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-bg-subtle border border-bg-border rounded p-2 text-sm outline-none"
          />
          <input
            placeholder="When should this apply? (trigger)"
            value={form.trigger}
            onChange={(e) => setForm({ ...form, trigger: e.target.value })}
            className="w-full bg-bg-subtle border border-bg-border rounded p-2 text-sm outline-none"
          />
          <textarea
            rows={4}
            placeholder="Body — what the agent should know"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full bg-bg-subtle border border-bg-border rounded p-2 text-sm outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-md px-3 py-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add knowledge
          </button>
        </form>

        <div className="space-y-3">
          {knowledge.map((k) => (
            <div
              key={k.id}
              className="bg-bg-panel border border-bg-border rounded-md p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white">{k.title}</div>
                {k.pinned && (
                  <span className="text-[11px] text-accent">pinned</span>
                )}
              </div>
              {k.trigger && (
                <div className="text-[11px] text-muted mt-0.5">
                  trigger: {k.trigger}
                </div>
              )}
              <div className="text-sm text-muted-strong mt-2 whitespace-pre-wrap">
                {k.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
