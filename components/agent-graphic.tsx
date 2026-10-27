import type { Ref } from "react";
import type { AgentStatus } from "@/lib/dashboard-overview";

// A body color per agent, picked from its name, so each one looks the same everywhere.
const BODY_COLORS = ["#3978F6", "#7C5CE0", "#0E9F8E", "#E07A2E", "#D04F7A", "#4A5BD4"];
const LIGHT: Record<AgentStatus, string> = {
  working: "#22C55E",
  waiting: "#F59E0B",
  idle: "#60A5FA",
  offline: "#94A3B8",
};

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return BODY_COLORS[hash % BODY_COLORS.length];
}

/** An arm gesture, played once. "wave" swings and settles; "raise" lifts and stays up; "salute" lifts to the brow. */
export type AgentGesture = "wave" | "raise" | "salute";

/**
 * A small robot standing for an agent: its own body color, and an antenna
 * light for its status (green working, amber waiting on you, blue standing
 * by, grey offline). A working agent's light pulses.
 *
 * Added for Agent Roll Call (all optional, the plain robot is unchanged):
 * - `gesture` draws an arm and plays it once. `gestureKey` replays it and
 *   `gestureDelay` (ms) holds it back. `still` shows its resting pose with no motion.
 * - `eyesRef` is the group holding the two eyes, so a parent can nudge them
 *   (they follow the cursor) without re-rendering.
 * - `sleep` closes the eyes ("asleep") or leaves one open ("peek") and draws a
 *   small "z". The motion is in components/roll-call/rollcall.css.
 * - `pulse={false}` keeps the antenna light still. The roll call has no loops.
 */
export function AgentGraphic({
  name,
  status,
  size = 40,
  gesture,
  gestureKey = 0,
  gestureDelay = 0,
  still = false,
  eyesRef,
  sleep,
  pulse = true,
}: {
  name: string;
  status: AgentStatus;
  size?: number;
  gesture?: AgentGesture;
  gestureKey?: number;
  gestureDelay?: number;
  still?: boolean;
  eyesRef?: Ref<SVGGElement>;
  sleep?: "asleep" | "peek";
  pulse?: boolean;
}) {
  const body = colorFor(name);
  const light = LIGHT[status];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className="shrink-0"
      data-sleep={sleep}
    >
      <rect x="1" y="1" width="38" height="38" rx="12" fill={body} opacity="0.12" />
      {/* antenna */}
      <line x1="20" y1="7" x2="20" y2="12" stroke={body} strokeWidth="2" strokeLinecap="round" />
      <circle
        cx="20"
        cy="6"
        r="2.6"
        fill={light}
        className={`rc-light${pulse && status === "working" ? " motion-safe:animate-pulse" : ""}`}
        data-antenna=""
      />
      {/* head */}
      <rect x="9" y="12" width="22" height="17" rx="6" fill={body} />
      <rect x="12.5" y="16" width="15" height="8.5" rx="4.25" fill="white" opacity="0.92" />
      <g ref={eyesRef} className="rc-eyes">
        <circle className="rc-eye rc-eye-l" cx="17" cy="20.25" r="1.9" fill={body} />
        <circle className="rc-eye rc-eye-r" cx="23" cy="20.25" r="1.9" fill={body} />
      </g>
      {/* ears */}
      <rect x="6.5" y="17" width="2.5" height="6" rx="1.25" fill={body} />
      <rect x="31" y="17" width="2.5" height="6" rx="1.25" fill={body} />
      {/* body */}
      <rect x="13" y="30" width="14" height="6" rx="3" fill={body} opacity="0.75" />
      {sleep ? (
        <text x="30" y="10.5" fontSize="7.5" fontWeight="700" fill={body} aria-hidden="true">
          z
        </text>
      ) : null}
      {/* arm: hangs from the right shoulder (28, 32) and turns about it; rollcall.css sets the pivot */}
      {gesture ? (
        <g
          key={gestureKey}
          className={`rc-arm rc-arm-${gesture}${still ? " rc-arm-still" : ""}`}
          style={{ animationDelay: `${gestureDelay}ms` }}
        >
          <line x1="28" y1="32" x2="34" y2="35.4" stroke={body} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="34" cy="35.4" r="2.1" fill={body} />
        </g>
      ) : null}
    </svg>
  );
}
