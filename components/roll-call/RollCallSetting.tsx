"use client";

import "./rollcall.css";
import { useState } from "react";
import { useRollCallStore } from "./store";

/**
 * Settings → Preferences: the "Agent roll call" switch, styled like Ziki's
 * Keyboard shortcuts switch (components/keyboard-shortcut-settings.tsx).
 * Default on. Off means the card never renders. Saved on this device.
 */
export function RollCallSetting() {
  const store = useRollCallStore();
  const [message, setMessage] = useState<string | null>(null);
  const enabled = store.enabled;

  return (
    <div className="rc-motion space-y-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-lg font-bold text-zk-text">Agent roll call</h2>
          <p id="roll-call-help" className="m-0 text-[13px] text-zk-muted">
            When you come back, your agents line up and say in one line what they did. Shown once per return, and only
            when there is news.
          </p>
        </div>
        <button
          type="button"
          id="roll-call-switch"
          role="switch"
          aria-checked={enabled}
          aria-label="Show the agent roll call"
          aria-describedby="roll-call-help"
          disabled={!store.ready}
          onClick={() => {
            const next = !enabled;
            store.setEnabled(next);
            setMessage(next ? "Agent roll call turned on." : "Agent roll call turned off.");
          }}
          className={`rc-track relative h-7 w-[46px] shrink-0 rounded-full border-0 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 ${
            enabled ? "bg-electric-blue-strong" : "bg-zk-chip"
          } ${store.ready ? "" : "cursor-not-allowed opacity-45"}`}
        >
          <span
            className="rc-knob pointer-events-none absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
            style={{ transform: enabled ? "translateX(18px)" : "none" }}
          />
        </button>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-zk-ok-fg empty:hidden">
        {message ?? ""}
      </p>
    </div>
  );
}
