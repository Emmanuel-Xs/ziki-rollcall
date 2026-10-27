"use client";

// What the demo remembers between refreshes. In real Ziki these would be columns
// on the User, like keyboardShortcuts. Every storage call is wrapped: private
// windows and blocked site data throw, and the demo must still work.
//
// The server never has a localStorage, so state loads after mount: `ready` is
// false for the first render, and nothing from here is drawn until it is true.
import { useCallback, useEffect, useState } from "react";
import { AGENTS, AWAY_HOURS, type RollAgent } from "./data";

const KEY = "ziki-rollcall:roll-call";
const HOUR = 3_600_000;

export type Saved = {
  /** The Settings switch. Off means the card never renders. */
  enabled: boolean;
  /** When the owner came back; the mock events are placed relative to it. */
  returnAt: number;
  /** When the owner last dismissed the card. Only newer activity brings it back. */
  lastSeen: number;
};

const fresh = (): Saved => {
  const returnAt = Date.now();
  return { enabled: true, returnAt, lastSeen: returnAt - AWAY_HOURS * HOUR };
};

function read(): Saved {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Saved>;
      if (typeof s.enabled === "boolean" && typeof s.returnAt === "number" && typeof s.lastSeen === "number") {
        return { enabled: s.enabled, returnAt: s.returnAt, lastSeen: s.lastSeen };
      }
    }
  } catch {
    // fall through to a fresh visit
  }
  return fresh();
}

function write(s: Saved) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // not saved; the demo still works for this visit
  }
}

function clear() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

/** The agents with only the events that happened after `lastSeen`. */
export function agentsSince(s: Saved): RollAgent[] {
  return AGENTS.map((a) => ({
    ...a,
    events: a.events.filter((e) => s.returnAt - e.hoursAgo * HOUR > s.lastSeen),
  }));
}

export function useRollCallStore() {
  const [saved, setSaved] = useState<Saved | null>(null);
  /** Bumps on "Simulate coming back" so the card remounts and its entrance plays again. */
  const [visit, setVisit] = useState(0);

  useEffect(() => {
    const s = read();
    write(s);
    setSaved(s);
  }, []);

  const update = useCallback((next: Saved) => {
    setSaved(next);
    write(next);
  }, []);

  const agents = saved ? agentsSince(saved) : [];
  const enabled = saved?.enabled ?? true;
  const hasNews = Boolean(saved) && enabled && agents.some((a) => a.events.length > 0);

  return {
    ready: saved !== null,
    saved,
    enabled,
    agents,
    hasNews,
    visit,
    awayMs: saved ? saved.returnAt - saved.lastSeen : 0,
    /** "Got it": the owner is briefed; nothing shows until there is news. */
    gotIt: () => saved && update({ ...saved, lastSeen: Date.now() }),
    setEnabled: (next: boolean) => saved && update({ ...saved, enabled: next }),
    /** Reviewer control: come back with fresh activity and replay the entrance. */
    simulate: () => {
      update({ ...fresh(), enabled: saved?.enabled ?? true });
      setVisit((v) => v + 1);
    },
    /** Reviewer control: turn the feature back on and forget everything saved. */
    reset: () => {
      clear();
      const s = fresh();
      setSaved(s);
      write(s);
      setVisit((v) => v + 1);
    },
  };
}
