import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import SessionsPage from "./pages/SessionsPage.jsx";
import SessionPage from "./pages/SessionPage.jsx";
import AskPage from "./pages/AskPage.jsx";
import WikiPage from "./pages/WikiPage.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import { useSession } from "./lib/auth-client.js";
import { useAppStore } from "./store/useAppStore.js";

function RequireAuth({ children }) {
  const { data, isPending } = useSession();
  const location = useLocation();
  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        Loading…
      </div>
    );
  }
  if (!data?.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  const { data } = useSession();
  const loadMe = useAppStore((s) => s.loadMe);

  useEffect(() => {
    if (data?.user) loadMe();
  }, [data?.user, loadMe]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/sessions" replace />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/:id" element={<SessionPage />} />
        <Route path="/ask" element={<AskPage />} />
        <Route path="/wiki" element={<WikiPage />} />
        <Route path="/review" element={<ReviewPage />} />
      </Route>
    </Routes>
  );
}
