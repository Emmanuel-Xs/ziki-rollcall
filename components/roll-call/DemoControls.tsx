"use client";

import "./rollcall.css";
import { useRollCall } from "./RollCallHost";

const demoButton =
  "rc-press inline-flex min-h-9 items-center rounded-full border border-zk-border px-4 text-sm font-semibold text-zk-text";

/** Reviewer controls, outside the card and clearly labelled. */
export function DemoControls() {
  const rc = useRollCall();
  const status = !rc.ready
    ? "Loading"
    : !rc.enabled
      ? "Off in Settings"
      : rc.hasNews
        ? "Showing"
        : "Dismissed, waiting for news";

  return (
    <section aria-labelledby="demo-controls-title" className="rounded-[20px] border border-dashed border-zk-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="demo-controls-title" className="m-0 text-sm font-bold text-zk-accent">
            Proposal: Agent roll call by 99plusOne
          </h2>
          <p className="m-0 mt-0.5 text-[13px] text-zk-muted">
            The card below is the new part. Everything else is Ziki as it is today.
          </p>
        </div>
        <p className="m-0 text-[13px] text-zk-muted sm:ml-auto">
          Card: <strong className="font-semibold text-zk-text2">{status}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={demoButton} onClick={rc.simulate} disabled={!rc.ready}>
            Simulate coming back
          </button>
          <button
            type="button"
            className={`${demoButton} ${rc.previewReduced ? "bg-zk-tint" : ""}`}
            aria-pressed={rc.previewReduced}
            onClick={() => rc.setPreviewReduced(!rc.previewReduced)}
          >
            Preview reduced motion
          </button>
          <button type="button" className={demoButton} onClick={rc.reset} disabled={!rc.ready}>
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
