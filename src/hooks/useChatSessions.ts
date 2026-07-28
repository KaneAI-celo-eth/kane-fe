// Multi-session chat, persisted to localStorage (ChatGPT/Claude.ai style).
//
// Each session is a full conversation (user turns + agent proposals). Sessions survive
// reloads, "New chat" opens a fresh one, and the sidebar lets you switch/delete. All state
// is plain-JSON serializable (IntentResult carries only data), so it round-trips cleanly.

import { useCallback, useEffect, useRef, useState } from "react";
import type { IntentResult } from "../config/agent";

export type Turn = { role: "user"; text: string } | { role: "agent"; result: IntentResult };

export type ChatSession = {
  id: string;
  title: string;
  messages: Turn[];
  createdAt: number;
};

const STORAGE_KEY = "kaneai.chat.v1";
const MAX_SESSIONS = 50;

type Persisted = { sessions: ChatSession[]; activeId: string | null };

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

/** First user line, trimmed to a short sidebar label. */
function titleFrom(messages: Turn[]): string {
  const first = messages.find((m) => m.role === "user") as Extract<Turn, { role: "user" }> | undefined;
  if (!first) return "New chat";
  const t = first.text.trim().replace(/\s+/g, " ");
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

function load(): Persisted {
  if (typeof window === "undefined") return { sessions: [], activeId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], activeId: null };
    const p = JSON.parse(raw) as Persisted;
    if (!Array.isArray(p.sessions)) return { sessions: [], activeId: null };
    return { sessions: p.sessions, activeId: p.activeId ?? p.sessions[0]?.id ?? null };
  } catch {
    return { sessions: [], activeId: null };
  }
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => load().sessions);
  const [activeId, setActiveId] = useState<string | null>(() => load().activeId);

  // Ref mirror so async callbacks (a mid-flight run) read the latest sessions without stale closures.
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  // Persist on any change (newest-first order is kept by the mutators).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const trimmed = sessions.slice(0, MAX_SESSIONS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: trimmed, activeId }));
    } catch {
      /* quota / private mode — chat still works in-memory this session */
    }
  }, [sessions, activeId]);

  const newSession = useCallback((): string => {
    const id = newId();
    const s: ChatSession = { id, title: "New chat", messages: [], createdAt: Date.now() };
    setSessions((prev) => [s, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  /** Return the active session id, creating a fresh one if none is active. */
  const ensureSession = useCallback((): string => {
    const cur = activeId && sessionsRef.current.some((s) => s.id === activeId) ? activeId : null;
    return cur ?? newSession();
  }, [activeId, newSession]);

  const selectSession = useCallback((id: string) => setActiveId(id), []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setActiveId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return next;
    });
  }, []);

  /** Apply an updater to one session's messages, refresh its title, and float it to the top. */
  const updateMessages = useCallback((id: string, updater: (prev: Turn[]) => Turn[]) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const messages = updater(prev[idx].messages);
      const updated: ChatSession = { ...prev[idx], messages, title: titleFrom(messages) };
      const rest = prev.filter((_, i) => i !== idx);
      return [updated, ...rest]; // most-recently-used first
    });
  }, []);

  /** Read a session's current messages without re-rendering (for building request history). */
  const getMessages = useCallback((id: string): Turn[] => {
    return sessionsRef.current.find((s) => s.id === id)?.messages ?? [];
  }, []);

  const active = sessions.find((s) => s.id === activeId) ?? null;

  return {
    sessions,
    activeId,
    active,
    newSession,
    ensureSession,
    selectSession,
    deleteSession,
    updateMessages,
    getMessages,
  };
}
