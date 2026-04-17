export default function AskPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold text-white mb-2">Ask</h1>
        <p className="text-muted text-sm mb-6">
          A fast code-aware Q&amp;A mode. Uses the same agent loop with a
          read-only tool set. (Scaffold — wire to <code>/api/ask</code> when you
          add the route.)
        </p>
        <textarea
          rows={4}
          placeholder="Ask anything about your codebase…"
          className="w-full bg-bg-panel border border-bg-border rounded-md p-3 text-sm outline-none"
        />
      </div>
    </div>
  );
}
