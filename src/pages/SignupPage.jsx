import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp, signIn } from "../lib/auth-client.js";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await signUp.email({ name, email, password });
      if (res.error) throw new Error(res.error.message);
      navigate("/sessions");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function social(provider) {
    await signIn.social({ provider, callbackURL: "/sessions" });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg text-muted-strong">
      <div className="w-full max-w-sm px-6">
        <div className="flex flex-col items-center mb-6">
          <div className="grid grid-cols-2 gap-1 mb-3 text-accent">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-accent" />
          </div>
          <h1 className="text-xl text-white">Welcome to forgeAI</h1>
          <p className="text-muted text-sm">Create a new account</p>
        </div>

        <div className="space-y-2 mb-4">
          <button
            onClick={() => social("github")}
            className="w-full py-2 rounded-md border border-bg-border bg-bg-panel hover:bg-bg-hover text-sm"
          >
            Continue with GitHub
          </button>
          <button
            onClick={() => social("google")}
            className="w-full py-2 rounded-md border border-bg-border bg-bg-panel hover:bg-bg-hover text-sm"
          >
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-2 my-4 text-xs text-muted">
          <div className="flex-1 h-px bg-bg-border" /> OR
          <div className="flex-1 h-px bg-bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full bg-bg-panel border border-bg-border rounded-md p-2.5 text-sm outline-none"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-bg-panel border border-bg-border rounded-md p-2.5 text-sm outline-none"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (8+ chars)"
            minLength={8}
            className="w-full bg-bg-panel border border-bg-border rounded-md p-2.5 text-sm outline-none"
            required
          />
          {err && <div className="text-xs text-red-400">{err}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white text-sm disabled:opacity-50"
          >
            {busy ? "Creating…" : "Sign up"}
          </button>
        </form>

        <div className="text-center text-sm text-muted mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-accent">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
