"use client";

import "./rollcall.css";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { AgentGraphic, type AgentGesture } from "@/components/agent-graphic";
import type { AgentStatus } from "@/lib/dashboard-overview";
import type { AnswerChoice } from "./data";
import type { RollRow } from "./summarize";

// Motion timing, in ms. Keep in step with rollcall.css.
const ROW_START = 100; // first robot starts hopping
const ROW_STAGGER = 60; // between robots
const HOP_MS = 480;
const LINE_AFTER = 300; // a line appears as its robot steps forward
const GESTURE_AFTER = HOP_MS - 60;
const WAVE_MS = 800;
const RAISE_MS = 300;
const SALUTE_MS = 320;
const SALUTE_STAGGER = 50;
const LIGHT_AT = 200; // antenna lights turn green mid-salute
const FLY_MS = 520;
const FLY_STAGGER = 70;
const LEAVE_MS = 180;
const PEEK_MS = 2000; // how long a sleeping robot keeps an eye open

const GREEN = "#22C55E"; // the "working" antenna light
const ROBOT = 44; // px; only here, on the roll call card

type Phase = "idle" | "salute" | "fly" | "fold";
type Leaving = "gotit" | "disable";

// Returns whose entrance has already played. A card that mounts again for the
// same return (say, after following "Answer") shows still: once per return.
const entrancePlayed = new Set<number>();

type Box = { left: number; top: number; width: number; height: number };
type Flyer = { id: string; name: string; status: AgentStatus; from: Box; dot: HTMLElement | null; delay: number };

const baseGesture = (row: RollRow): AgentGesture | undefined =>
  row.tier === "needs" ? "raise" : row.tier === "did" ? "wave" : undefined;

/** Eyes follow the pointer while it is over the row: at most 2px, one frame at a time, fine pointers only. */
function useEyeFollow(rowRef: RefObject<HTMLElement | null>, eyesRef: RefObject<SVGGElement | null>, enabled: boolean) {
  useEffect(() => {
    const row = rowRef.current;
    if (!row || !enabled) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let last: { x: number; y: number } | null = null;

    const update = () => {
      raf = 0;
      const eyes = eyesRef.current;
      const svg = eyes?.ownerSVGElement;
      if (!eyes || !svg || !last) return;
      const r = svg.getBoundingClientRect();
      const dx = last.x - (r.left + r.width / 2);
      const dy = last.y - (r.top + r.height * 0.506);
      const d = Math.hypot(dx, dy) || 1;
      const px = Math.min(1, d / 60) * 2; // 2px at most
      const k = 40 / (r.width || 40); // CSS px -> the robot's 40-unit viewBox
      eyes.style.transform = `translate(${(dx / d) * px * k}px, ${(dy / d) * px * k}px)`;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      last = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = null;
      if (eyesRef.current) eyesRef.current.style.transform = "translate(0px, 0px)";
    };
    row.addEventListener("pointermove", onMove, { passive: true });
    row.addEventListener("pointerleave", onLeave);
    return () => {
      row.removeEventListener("pointermove", onMove);
      row.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rowRef, eyesRef, enabled]);
}

/** A robot on its way to its row in "Your agents": a clone, moved with transform only. */
function FlyingRobot({ flyer, onLand }: { flyer: Flyer; onLand: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { from, dot } = flyer;
    let dx = 0;
    let dy = 48;
    let scale = 0.5;
    if (dot) {
      const to = dot.getBoundingClientRect();
      dx = to.left + to.width / 2 - (from.left + from.width / 2);
      // A row below the fold is not on screen: head for the bottom edge and fade there.
      const y = Math.min(to.top + to.height / 2, window.innerHeight - 24);
      dy = y - (from.top + from.height / 2);
      scale = to.width / from.width;
    }
    const land = () => {
      if (dot && flyer.status !== "offline") {
        dot.style.transition = "background-color 240ms ease";
        dot.style.backgroundColor = GREEN;
      }
      onLand(flyer.id);
    };
    if (typeof el.animate !== "function") {
      land();
      return;
    }
    const animation = el.animate(
      [
        { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
        { opacity: 1, offset: 0.7 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
      ],
      { duration: FLY_MS, delay: flyer.delay, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "both" },
    );
    animation.finished.then(land, () => {});
    return () => animation.cancel();
  }, []);

  const { from } = flyer;
  return (
    <div
      ref={ref}
      className="rc-flyer"
      style={{ left: from.left, top: from.top, width: from.width, height: from.height, opacity: 0 }}
    >
      <AgentGraphic name={flyer.name} status={flyer.status} size={from.width} gesture="salute" still pulse={false} />
    </div>
  );
}

function Row({
  row,
  index,
  reduced,
  entranceStill,
  phase,
  lit,
  again,
  onReplay,
  replyOpen,
  onToggleReply,
  answer,
  nod,
  onAnswer,
  peek,
  onPeek,
  registerRobot,
}: {
  row: RollRow;
  index: number;
  reduced: boolean;
  entranceStill: boolean;
  phase: Phase;
  lit: boolean;
  again: number;
  onReplay: (id: string, firstEnds: number, ms: number) => void;
  replyOpen: boolean;
  onToggleReply: (id: string) => void;
  /** The option the owner picked for this row's question, once they have. */
  answer?: AnswerChoice;
  /** Counts the nods, so each answer plays one. */
  nod: number;
  onAnswer: (id: string, choice: AnswerChoice) => void;
  peek: boolean;
  onPeek: (id: string) => void;
  registerRobot: (id: string, el: HTMLElement | null) => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const answered = Boolean(answer);
  const offline = row.tier === "quiet" && row.agent.status === "offline";
  const saluting = phase !== "idle";
  const interactive = !reduced && phase === "idle";
  useEyeFollow(rowRef, eyesRef, !reduced && !offline);

  // The buttons that were pressed are gone once a choice is made: keep focus on the row's text.
  useEffect(() => {
    if (answered) lineRef.current?.focus({ preventScroll: true });
  }, [answered]);

  // The reply opens under its row; on a phone, keep it clear of the bottom nav.
  useEffect(() => {
    if (replyOpen) replyRef.current?.scrollIntoView({ block: "nearest" });
  }, [replyOpen]);

  const hopDelay = ROW_START + index * ROW_STAGGER;
  const base = baseGesture(row);
  const gesture: AgentGesture | undefined = reduced
    ? undefined
    : saluting
      ? "salute"
      : answered && base === "raise"
        ? "lower"
        : base;
  const gestureMs = base === "raise" ? RAISE_MS : WAVE_MS;
  const firstEnds = hopDelay + GESTURE_AFTER + gestureMs;
  const gestureDelay = saluting ? index * SALUTE_STAGGER : again || answered ? 0 : hopDelay + GESTURE_AFTER;
  const sleep = reduced || saluting ? undefined : offline ? (peek ? "peek" : "asleep") : undefined;
  // The light turns green when answered or mid-salute, except on a robot that really is offline.
  const status: AgentStatus = (lit || answered) && !offline ? "working" : row.agent.status;

  const robot = (
    <AgentGraphic
      name={row.agent.name}
      status={status}
      size={ROBOT}
      gesture={gesture}
      gestureKey={again + (saluting ? 1000 : 0) + (answered ? 500 : 0)}
      gestureDelay={gestureDelay}
      still={entranceStill && !again && !saluting && !answered}
      nod={reduced ? 0 : nod}
      eyesRef={eyesRef}
      sleep={sleep}
      pulse={false}
    />
  );

  let wrapped: React.ReactNode = <span className="block h-11 w-11">{robot}</span>;
  if (interactive && row.tier === "needs" && !answered) {
    wrapped = (
      <button
        type="button"
        aria-label={`${row.names}: ${replyOpen ? "hide" : "show"} the suggested answer`}
        aria-expanded={replyOpen}
        aria-controls={`rc-q-${row.id}`}
        onClick={() => onToggleReply(row.id)}
        className="block h-11 w-11 cursor-pointer rounded-xl border-0 bg-transparent p-0"
      >
        {robot}
      </button>
    );
  } else if (interactive && row.tier === "did") {
    const play = () => onReplay(row.id, firstEnds, gestureMs);
    wrapped = (
      <button
        type="button"
        aria-label={`${row.names}: wave again`}
        onPointerEnter={(e) => e.pointerType === "mouse" && play()}
        onPointerDown={(e) => e.pointerType !== "mouse" && play()}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && play()}
        className="block h-11 w-11 cursor-default rounded-xl border-0 bg-transparent p-0"
      >
        {robot}
      </button>
    );
  } else if (interactive && offline) {
    wrapped = (
      <button
        type="button"
        aria-label={`${row.names} is offline: tap to wake`}
        onClick={() => onPeek(row.id)}
        className="block h-11 w-11 cursor-pointer rounded-xl border-0 bg-transparent p-0"
      >
        {robot}
      </button>
    );
  }

  const question = row.agent.question;
  const asking = row.tier === "needs" && !answered;
  return (
    <li ref={rowRef} className="relative border-t border-zk-divider py-2 first:border-t-0">
      <div className="flex items-center gap-3">
        <div
          ref={(el) => registerRobot(row.id, el)}
          className="rc-robot shrink-0"
          data-flown={phase === "fly" || phase === "fold" ? "true" : undefined}
          style={{ "--rc-hop-delay": `${hopDelay}ms` } as CSSProperties}
        >
          {wrapped}
        </div>
        <div
          ref={lineRef}
          tabIndex={-1}
          aria-live={row.tier === "needs" ? "polite" : undefined}
          className="rc-line min-w-0 flex-1 outline-none"
          style={{ "--rc-line-delay": `${hopDelay + LINE_AFTER}ms` } as CSSProperties}
        >
          {row.tier === "quiet" ? (
            // Every quiet or offline agent on one line: "Claude and X: nothing to report."
            <p
              data-dim={offline && peek && !reduced ? "true" : undefined}
              className="rc-dim m-0 text-sm leading-snug text-zk-text2"
            >
              <strong className="font-bold text-zk-text">{row.names}</strong>: {row.sentence}
            </p>
          ) : (
            <>
              <p className="m-0 text-[13px] font-bold leading-tight text-zk-text">{row.names}</p>
              {answer ? (
                <p className="rc-swap m-0 mt-0.5 text-sm leading-snug text-zk-text2">
                  <strong className="font-bold text-zk-ok-fg">Got it:</strong> {answer.done}.
                </p>
              ) : (
                <p className="m-0 mt-0.5 text-sm leading-snug text-zk-text2">
                  {asking ? (
                    <>
                      <strong className="font-bold text-zk-warn-fg">Needs you:</strong>
                      {row.sentence.replace(/^Needs you:/, "")}
                      <button
                        type="button"
                        aria-expanded={replyOpen}
                        aria-controls={`rc-q-${row.id}`}
                        onClick={() => onToggleReply(row.id)}
                        className="ml-2 inline-flex min-h-7 cursor-pointer items-center whitespace-nowrap border-0 bg-transparent p-0 text-sm font-bold text-zk-accent hover:underline"
                      >
                        Answer <span aria-hidden="true">&nbsp;→</span>
                      </button>
                    </>
                  ) : (
                    row.sentence
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {replyOpen && asking && question ? (
        <div
          ref={replyRef}
          id={`rc-q-${row.id}`}
          role="group"
          aria-label={`Suggested answer from ${row.names}`}
          className="rc-reply ml-14 mt-2 rounded-[14px] border border-zk-border bg-zk-bg p-3 max-lg:scroll-mb-28"
        >
          <p className="m-0 text-xs font-semibold text-zk-muted">{row.names} suggests</p>
          <p className="m-0 mt-1 text-sm leading-snug text-zk-text">{question.suggestion}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {question.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onAnswer(row.id, choice)}
                className="rc-press inline-flex min-h-9 items-center rounded-full border border-zk-border bg-zk-surface px-4 text-sm font-semibold text-zk-text"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!reduced && offline ? (
        // To the right of the robot, level with it, so it never reaches the row above.
        <span aria-hidden="true" className="pointer-events-none absolute left-14 top-1/2 z-10 -translate-y-1/2">
          <span
            data-show={peek ? "true" : "false"}
            className="rc-bubble block whitespace-nowrap rounded-full border border-zk-border bg-zk-surface px-3 py-1 text-xs font-semibold text-zk-text2"
          >
            Nothing to report
          </span>
        </span>
      ) : null}
    </li>
  );
}

/**
 * "While you were away": one inline card at the top of the dashboard.
 *
 * Arrival (calm, about 1.5s): the card fades in, robots hop in from the left one
 * by one and step forward as their lines appear; one that needs you raises a
 * hand, one that did work waves once. Every line is real text.
 *
 * Everything else waits for the person. Hover a robot and its eyes follow the
 * cursor. Tap the sleeping one and it opens an eye for 2s. Tap the raised hand
 * (or "Answer") and the agent's suggestion opens under its row with two buttons;
 * pick one and the robot nods, its light turns green and the row says what you chose. "Got it": each robot salutes and its light turns
 * green; if "Your agents" is on screen each one then flies into its own row
 * there. Then the card folds.
 *
 * With reduced motion on, none of that runs: the card is its text and "Got it"
 * hides it at once.
 */
export function RollCall({
  rows,
  returnId,
  awayLabel,
  points,
  reduced,
  onDone,
}: {
  rows: RollRow[];
  /** Identifies this return, so the entrance plays once per return. */
  returnId: number;
  awayLabel: string;
  points: number;
  reduced: boolean;
  onDone: (kind: Leaving) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [kind, setKind] = useState<Leaving>("gotit");
  const [lit, setLit] = useState(false);
  const [flyers, setFlyers] = useState<Flyer[] | null>(null);
  const [landed, setLanded] = useState(0);
  const [replays, setReplays] = useState<Record<string, number>>({});
  const [openReply, setOpenReply] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerChoice>>({});
  const [nods, setNods] = useState<Record<string, number>>({});
  const [peek, setPeek] = useState(false);
  const [entranceStill] = useState(() => entrancePlayed.has(returnId));
  const [mountedAt] = useState(() => performance.now());
  const robots = useRef(new Map<string, HTMLElement>());
  // Whether "Your agents" is on screen right now. The walk into the table only
  // happens if it is; otherwise the robots salute and the card just folds.
  const tableInView = useRef(false);
  const busyUntil = useRef<Record<string, number>>({});
  const peekTimer = useRef(0);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    entrancePlayed.add(returnId);
  }, [returnId]);

  useEffect(() => () => window.clearTimeout(peekTimer.current), []);

  useEffect(() => {
    const section = document.querySelector('section[aria-labelledby="agents-heading"]');
    if (!section || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) tableInView.current = entry.isIntersecting;
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // "Got it", part 1: everyone salutes and their lights turn green, then they fly.
  useEffect(() => {
    if (phase !== "salute") return;
    const light = window.setTimeout(() => setLit(true), LIGHT_AT);
    const go = window.setTimeout(
      () => {
        const list: Flyer[] = [];
        rows.forEach((row, i) => {
          if (!tableInView.current) return;
          const el = robots.current.get(row.id);
          if (!el) return;
          const r = el.getBoundingClientRect();
          const dot = document.querySelector<HTMLElement>(
            `[data-rollcall-agent="${row.agent.id}"] [data-rollcall-dot]`,
          );
          list.push({
            id: row.id,
            name: row.agent.name,
            status: row.agent.status === "offline" ? "offline" : "working",
            from: { left: r.left, top: r.top, width: r.width, height: r.height },
            dot,
            delay: i * FLY_STAGGER,
          });
        });
        setFlyers(list);
        setLanded(0);
        setPhase(list.length ? "fly" : "fold");
      },
      SALUTE_MS + (rows.length - 1) * SALUTE_STAGGER + 80,
    );
    return () => {
      window.clearTimeout(light);
      window.clearTimeout(go);
    };
  }, [phase, rows]);

  // Part 2: when the last one has landed, the card folds away.
  useEffect(() => {
    if (phase === "fly" && flyers && landed >= flyers.length) setPhase("fold");
  }, [phase, flyers, landed]);

  // Part 3: fold, then hand over. A timer rather than animationend, so the
  // card can never get stuck if the animation does not run.
  useEffect(() => {
    if (phase !== "fold") return;
    const t = window.setTimeout(() => doneRef.current(kind), LEAVE_MS + 20);
    return () => window.clearTimeout(t);
  }, [phase, kind]);

  // The reply closes on Escape. A press elsewhere leaves it be: closing it would move the page under the pointer.
  useEffect(() => {
    if (!openReply) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenReply(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openReply]);

  const gotIt = () => {
    if (phase !== "idle") return;
    if (reduced) return onDone("gotit");
    setOpenReply(null);
    setKind("gotit");
    setPhase("salute");
  };

  const dismiss = () => {
    if (phase !== "idle") return;
    if (reduced) return onDone("disable");
    setOpenReply(null);
    setKind("disable");
    setPhase("fold");
  };

  // A choice: the robot nods (its arm comes down, its light turns green) and the row says what was chosen.
  const answer = (id: string, choice: AnswerChoice) => {
    setAnswers((a) => ({ ...a, [id]: choice }));
    setNods((n) => ({ ...n, [id]: (n[id] ?? 0) + 1 }));
    setOpenReply(null);
  };

  // A gesture that is still playing is left alone: restarting it would snap the
  // arm back to rest. `firstEnds` is when the arrival's own gesture finishes.
  const replay = (id: string, firstEnds: number, ms: number) => {
    const now = performance.now();
    if (now < (busyUntil.current[id] ?? (entranceStill ? 0 : mountedAt + firstEnds))) return;
    busyUntil.current[id] = now + ms;
    setReplays((r) => ({ ...r, [id]: (r[id] ?? 0) + 1 }));
  };

  // Tap the sleeping robot: one eye opens, "Nothing to report", then it closes again.
  const wake = () => {
    setPeek(true);
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeek(false), PEEK_MS);
  };

  return (
    <section
      className="rc-card rounded-[20px] border border-zk-border bg-zk-surface p-4 sm:px-5 sm:py-4"
      data-leaving={phase === "fold" ? "true" : undefined}
      data-still={entranceStill ? "true" : undefined}
      aria-labelledby="roll-call-title"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="roll-call-title" className="m-0 text-base font-bold text-zk-text sm:text-lg">
          While you were away <span className="whitespace-nowrap font-semibold text-zk-muted">· {awayLabel}</span>
        </h2>
        <button
          type="button"
          onClick={gotIt}
          disabled={phase !== "idle"}
          className="rc-primary inline-flex min-h-9 shrink-0 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white disabled:cursor-default"
        >
          Got it
        </button>
      </div>

      <ul className="m-0 mt-1 list-none p-0">
        {rows.map((row, i) => (
          <Row
            key={row.id}
            row={row}
            index={i}
            reduced={reduced}
            entranceStill={entranceStill}
            phase={phase}
            lit={lit}
            again={replays[row.id] ?? 0}
            onReplay={replay}
            replyOpen={openReply === row.id}
            onToggleReply={(id) => setOpenReply((cur) => (cur === id ? null : id))}
            answer={answers[row.id]}
            nod={nods[row.id] ?? 0}
            onAnswer={answer}
            peek={peek}
            onPeek={wake}
            registerRobot={(id, el) => {
              if (el) robots.current.set(id, el);
              else robots.current.delete(id);
            }}
          />
        ))}
      </ul>

      {/* Below lg the bottom nav covers the last ~4.5rem of the screen. <main> already pads the page
          (max-lg:pb-28); the scroll margin on "Don't show this" keeps it clear of the nav when it is tabbed to. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-zk-divider pt-2">
        <p className="m-0 text-[13px] text-zk-muted">You earned {points.toLocaleString("en-US")} pts while away.</p>
        <button
          type="button"
          onClick={dismiss}
          disabled={phase !== "idle"}
          className="rc-press -mr-2 inline-flex min-h-7 max-lg:scroll-mb-28 items-center rounded-full px-2 text-[13px] font-semibold text-zk-muted underline-offset-2 hover:text-zk-text hover:underline"
        >
          Don&apos;t show this
        </button>
      </div>

      {flyers && (phase === "fly" || phase === "fold")
        ? createPortal(
            flyers.map((f) => <FlyingRobot key={f.id} flyer={f} onLand={() => setLanded((n) => n + 1)} />),
            document.body,
          )
        : null}
    </section>
  );
}
