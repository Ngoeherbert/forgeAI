import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

export default function AppShell() {
  return (
    <div className="h-screen w-screen flex bg-bg text-muted-strong">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
