import { create } from "zustand";
import { api } from "../lib/api.js";

export const useAppStore = create((set, get) => ({
  me: null,
  organization: null,
  sessions: [],
  loadingSessions: false,

  async loadMe() {
    try {
      const data = await api.me();
      set({ me: data.user, organization: data.organization });
    } catch {
      set({ me: null, organization: null });
    }
  },

  async loadSessions() {
    set({ loadingSessions: true });
    try {
      const { sessions } = await api.listSessions();
      set({ sessions });
    } finally {
      set({ loadingSessions: false });
    }
  },

  async createSession(payload) {
    const { session } = await api.createSession(payload);
    set({ sessions: [session, ...get().sessions] });
    return session;
  },

  upsertSession(session) {
    const list = get().sessions;
    const i = list.findIndex((s) => s.id === session.id);
    if (i === -1) set({ sessions: [session, ...list] });
    else {
      const copy = [...list];
      copy[i] = session;
      set({ sessions: copy });
    }
  },
}));
