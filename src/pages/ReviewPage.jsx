export default function ReviewPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold text-white mb-2">Review</h1>
        <p className="text-muted text-sm">
          Attach a GitHub / GitLab integration to let forgeAI review pull
          requests automatically. Configure OAuth in{" "}
          <code>server/auth.js</code> and add an <code>integration</code> row
          via the Wiki / Settings UI.
        </p>
      </div>
    </div>
  );
}
