export default function DiffTab() {
  return (
    <div className="p-6 text-sm text-muted">
      <div className="mb-2 text-muted-strong font-medium">Diff</div>
      Connect a git repository to this session to see the diff of changes the
      agent made. The backend exposes{" "}
      <code className="text-muted-strong">GET /api/sessions/:id/diff</code> as a
      stub you can implement against{" "}
      <code className="text-muted-strong">simple-git</code> or the GitHub API.
    </div>
  );
}
