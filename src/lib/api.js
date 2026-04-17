const BASE = "";

async function request(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  me: () => request("GET", "/api/me"),

  listSessions: () => request("GET", "/api/sessions"),
  createSession: (payload) => request("POST", "/api/sessions", payload),
  getSession: (id) => request("GET", `/api/sessions/${id}`),
  updateSession: (id, payload) =>
    request("PATCH", `/api/sessions/${id}`, payload),
  deleteSession: (id) => request("DELETE", `/api/sessions/${id}`),

  listMessages: (sessionId) =>
    request("GET", `/api/sessions/${sessionId}/messages`),
  sendMessage: (sessionId, content) =>
    request("POST", `/api/sessions/${sessionId}/messages`, { content }),

  runAgent: (sessionId) =>
    request("POST", `/api/sessions/${sessionId}/agent/run`),
  streamAgent: (sessionId, { onEvent, onDone, onError }) => {
    const es = new EventSource(`/api/sessions/${sessionId}/agent/stream`, {
      withCredentials: true,
    });
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "done") {
          onDone?.(data);
          es.close();
        } else {
          onEvent?.(data);
        }
      } catch (err) {
        onError?.(err);
      }
    };
    es.onerror = (err) => {
      onError?.(err);
      es.close();
    };
    return () => es.close();
  },

  listKnowledge: () => request("GET", "/api/knowledge"),
  createKnowledge: (payload) => request("POST", "/api/knowledge", payload),
  updateKnowledge: (id, payload) =>
    request("PATCH", `/api/knowledge/${id}`, payload),
  deleteKnowledge: (id) => request("DELETE", `/api/knowledge/${id}`),

  listPlaybooks: () => request("GET", "/api/playbooks"),
  createPlaybook: (payload) => request("POST", "/api/playbooks", payload),
};
