"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { MAIN_CONTENT_ID } from "@/components/skip-link";
import { POINTS_EARNED } from "./data";
import { RollCall } from "./RollCall";
import { useRollCallStore } from "./store";
import { buildRollCall, formatAway } from "./summarize";

type RollCallContext = ReturnType<typeof useRollCallStore> & {
  /** The OS setting or the demo's "Preview reduced motion" control. */
  reduced: boolean;
  previewReduced: boolean;
  setPreviewReduced: (on: boolean) => void;
  /** Reset the "Your agents" dots that robots turned green. */
  simulate: () => void;
  reset: () => void;
};

const Context = createContext<RollCallContext | null>(null);

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (notify: () => void) => {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};
const osReducedNow = () => window.matchMedia(REDUCED_QUERY).matches;

/** Robots turn a row's dot green when they land; put them back for a new visit. */
function clearLandedDots() {
  document.querySelectorAll<HTMLElement>("[data-rollcall-dot]").forEach((dot) => {
    dot.style.backgroundColor = "";
    dot.style.transition = "";
  });
}

export function RollCallProvider({ children }: { children: ReactNode }) {
  const store = useRollCallStore();
  const [previewReduced, setPreviewReduced] = useState(false);
  const osReduced = useSyncExternalStore(subscribeReduced, osReducedNow, () => false);

  const value: RollCallContext = {
    ...store,
    reduced: osReduced || previewReduced,
    previewReduced,
    setPreviewReduced,
    simulate: () => {
      clearLandedDots();
      store.simulate();
    },
    reset: () => {
      clearLandedDots();
      store.reset();
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRollCall(): RollCallContext {
  const value = useContext(Context);
  if (!value) throw new Error("useRollCall must be used inside RollCallProvider");
  return value;
}

/** The card, at the top of the dashboard. Nothing renders until there is news. */
export function RollCallCard() {
  const rc = useRollCall();
  if (!rc.ready || !rc.hasNews || !rc.saved) return null;

  const done = (kind: "gotit" | "disable") => {
    if (kind === "gotit") rc.gotIt();
    else rc.setEnabled(false);
    // The card is gone; keep keyboard focus on the page.
    document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
  };

  return (
    <div className="rc-motion" data-reduce={rc.previewReduced}>
      <RollCall
        key={rc.visit}
        rows={buildRollCall(rc.agents)}
        returnId={rc.saved.returnAt}
        awayLabel={formatAway(rc.awayMs)}
        points={POINTS_EARNED}
        reduced={rc.reduced}
        answerHref="/issues"
        onDone={done}
      />
    </div>
  );
}
