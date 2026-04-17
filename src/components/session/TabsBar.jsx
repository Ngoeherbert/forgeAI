import classNames from "classnames";
import {
  NotebookPen,
  Diff,
  Terminal,
  Monitor,
  Bot,
} from "lucide-react";

const TABS = [
  { id: "worklog", label: "Worklog", icon: NotebookPen },
  { id: "diff", label: "Diff", icon: Diff },
  { id: "shell", label: "Shell", icon: Terminal },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "agents", label: "Agents", icon: Bot },
];

export default function TabsBar({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-bg-border px-3 py-2 bg-bg-subtle">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={classNames(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
            active === t.id
              ? "bg-bg-hover text-white"
              : "text-muted hover:bg-bg-hover hover:text-muted-strong",
          )}
        >
          <t.icon className="h-3.5 w-3.5" />
          {t.label}
        </button>
      ))}
    </div>
  );
}
