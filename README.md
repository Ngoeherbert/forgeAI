# forgeAI

An open-source, Devin-inspired autonomous software-engineering agent platform.

forgeAI gives you the scaffolding to run your own agent: a dark-themed React + Tailwind UI with a sidebar of Sessions, a chat + Worklog + Diff + Shell layout, an Express backend backed by Neon Postgres via Drizzle ORM, Better-Auth (Neon-Auth-compatible) for login, and a real OpenAI-compatible tool-use agent loop running inside a sandboxed workspace.

> This is a **template / reference implementation**, not a drop-in replacement for Devin. It does **not** provision per-session VMs, stream a live desktop, or run an unrestricted shell. What it does give you is a complete, working, extensible foundation.

## Stack

| Layer      | Choice                                         |
| ---------- | ---------------------------------------------- |
| Frontend   | React 19 · Vite · Tailwind CSS · Zustand       |
| Backend    | Node.js · Express · Server-Sent Events         |
| Database   | Neon serverless Postgres                       |
| ORM        | Drizzle ORM                                    |
| Auth       | Better-Auth (Neon-Auth compatible schema)      |
| LLM        | Any OpenAI-compatible chat-completions endpoint |
| Icons      | lucide-react                                   |

## Features

- Auth — email+password, Google, GitHub (via Better-Auth social providers).
- Multi-tenant — organizations, memberships, roles.
- Session console — chat panel + Worklog + Diff + Shell + Desktop tabs, matching the UI shown in the reference screenshots.
- Agent loop — real tool-calling loop over `read_file`, `write_file`, `list_dir`, `run_command`, `finish`. Sandboxed per-session workspace under `.agent-workdir/<session-id>/`.
- Streaming — `/api/sessions/:id/agent/stream` is an SSE endpoint that pushes assistant / tool-call / tool-result events to the UI.
- Knowledge + Playbooks — persistent org-scoped wiki and reusable task playbooks, CRUDed through a REST API and editable from `/wiki`.
- Seeds — one command to populate a demo org, user, sample session, knowledge entries, and playbooks.

## Quickstart

### 1. Prerequisites

- Node.js 20+
- A Neon Postgres database (`DATABASE_URL`)
- An OpenAI API key or any OpenAI-compatible endpoint (`OPENAI_API_KEY`, optional `OPENAI_BASE_URL`)

### 2. Install

```bash
npm install
cp .env.example .env
# edit .env to set DATABASE_URL, BETTER_AUTH_SECRET, OPENAI_API_KEY
```

Generate a secret:

```bash
openssl rand -hex 32
```

### 3. Database

```bash
npm run db:push      # apply schema
npm run db:seed      # optional — load demo org/user/session/knowledge/playbooks
```

### 4. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:8787

Sign up at `/signup` (email + password works out of the box — social providers light up automatically if you set the `GOOGLE_*` / `GITHUB_*` env vars).

## Schema

Defined in `server/db/schema.js`:

| Table                   | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `user`                  | Better-Auth user                                               |
| `session`               | Better-Auth session token                                      |
| `account`               | OAuth / password credentials                                   |
| `verification`          | Email verification tokens                                      |
| `organization`          | Tenant container                                               |
| `organization_member`   | User↔Org with role (`owner` / `admin` / `member`)             |
| `agent_session`         | One agent run — title, status, repo, branch, model, metadata   |
| `message`               | Chat messages including `tool` / `assistant with tool_call`   |
| `task`                  | Agent's in-session todo list                                   |
| `tool_call`             | Every tool invocation with args, result, duration              |
| `artifact`              | Files the agent produced                                       |
| `knowledge`             | Org-scoped reference notes (Wiki)                              |
| `playbook`              | Reusable task runbooks                                         |
| `integration`           | Third-party integration configs (GitHub, Slack, Sentry…)       |

Run `npm run db:studio` to browse.

## Agent loop

`server/agent/loop.js` implements a minimal but production-shaped loop:

1. Load the system prompt + message history for the session.
2. Call `chat.completions.create` with the tool schemas.
3. If the model asks for tool calls, dispatch them against the sandboxed workspace and persist the results.
4. Loop until the model replies without a tool call (→ `awaiting_user`) or calls `finish` (→ `sleeping`).
5. Emits SSE events for the UI.

Tools live in `server/agent/tools.js` and are easy to extend — add a schema entry and a dispatcher case.

## Extending

- **More tools** — add entries to `TOOL_SCHEMAS` and `dispatchTool` (e.g. `git_*`, `browser_*`, `search_web`).
- **Child agents** — the `Agents` tab is a stub; implement by queueing sub-sessions and streaming their worklogs.
- **Live desktop** — wire a VNC/CDP bridge into `Desktop` tab (e.g. websockify + noVNC).
- **Diff view** — the `Diff` tab is stubbed; implement by running `git diff` against the session workdir on demand.

## Project layout

```
forgeAI/
├── server/
│   ├── index.js            # Express app, route mounting, SPA fallback
│   ├── auth.js             # Better-Auth config
│   ├── agent/              # Prompts, tools, loop
│   ├── db/                 # Drizzle schema, client, seed
│   └── routes/             # sessions, messages, agent, knowledge, playbooks, me
├── src/
│   ├── main.jsx
│   ├── App.jsx             # Router + auth guard
│   ├── index.css           # Tailwind + prose
│   ├── lib/                # api client, better-auth client
│   ├── store/              # Zustand stores
│   ├── components/         # Sidebar, AppShell, session tabs
│   └── pages/              # Sessions, Session, Ask, Wiki, Review, Login, Signup
├── prompts/system.md
├── drizzle.config.js
├── tailwind.config.js
├── vite.config.js
└── package.json
```

## License

MIT
