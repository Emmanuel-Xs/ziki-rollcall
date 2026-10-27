"use client";

import "./rollcall.css";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { AgentGraphic, type AgentGesture } from "@/components/agent-graphic";
import type { AgentStatus } from "@/lib/dashboard-overview";
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
  questionOpen,
  onToggleQuestion,
  peek,
  onPeek,
  answerHref,
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
  questionOpen: boolean;
  onToggleQuestion: (id: string) => void;
  peek: boolean;
  onPeek: (id: string) => void;
  answerHref: string;
  registerRobot: (id: string, el: HTMLElement | null) => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const offline = row.tier === "quiet" && row.agent.status === "offline";
  const saluting = phase !== "idle";
  const interactive = !reduced && phase === "idle";
  useEyeFollow(rowRef, eyesRef, !reduced && !offline);

  const hopDelay = ROW_START + index * ROW_STAGGER;
  const base = baseGesture(row);
  const gesture: AgentGesture | undefined = reduced ? undefined : saluting ? "salute" : base;
  const gestureMs = base === "raise" ? RAISE_MS : WAVE_MS;
  const firstEnds = hopDelay + GESTURE_AFTER + gestureMs;
  const gestureDelay = saluting ? index * SALUTE_STAGGER : again ? 0 : hopDelay + GESTURE_AFTER;
  const sleep = reduced || saluting ? undefined : offline ? (peek ? "peek" : "asleep") : undefined;
  // The light turns green mid-salute, except on a robot that really is offline.
  const status: AgentStatus = lit && !offline ? "working" : row.agent.status;

  const robot = (
    <AgentGraphic
      name={row.agent.name}
      status={status}
      size={44}
      gesture={gesture}
      gestureKey={again + (saluting ? 1000 : 0)}
      gestureDelay={gestureDelay}
      still={entranceStill && !again && !saluting}
      eyesRef={eyesRef}
      sleep={sleep}
      pulse={false}
    />
  );

  let wrapped: React.ReactNode = <span className="block h-11 w-11">{robot}</span>;
  if (interactive && row.tier === "needs") {
    wrapped = (
      <button
        type="button"
        aria-label={`${row.names}: ${questionOpen ? "hide" : "show"} the question`}
        aria-expanded={questionOpen}
        aria-controls={`rc-q-${row.id}`}
        onClick={() => onToggleQuestion(row.id)}
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
  return (
    <li ref={rowRef} className="relative flex gap-3.5 border-t border-zk-divider py-3.5 first:border-t-0">
      <div
        ref={(el) => registerRobot(row.id, el)}
        className="rc-robot shrink-0"
        data-flown={phase === "fly" || phase === "fold" ? "true" : undefined}
        style={{ "--rc-hop-delay": `${hopDelay}ms` } as CSSProperties}
      >
        {wrapped}
      </div>
      <div
        className="rc-line min-w-0 flex-1"
        style={{ "--rc-line-delay": `${hopDelay + LINE_AFTER}ms` } as CSSProperties}
      >
        <p className="m-0 text-[13px] font-bold text-zk-text">{row.names}</p>
        <p className="m-0 mt-0.5 text-sm leading-snug text-zk-text2">
          {row.tier === "needs" ? (
            <>
              <strong className="font-bold text-zk-warn-fg">Needs you:</strong>
              {row.sentence.replace(/^Needs you:/, "")}
            </>
          ) : (
            row.sentence
          )}
        </p>
        {row.tier === "needs" ? (
          <Link
            href={answerHref}
            className="mt-1 inline-flex min-h-8 items-center text-sm font-bold text-zk-accent hover:underline"
          >
            Answer <span aria-hidden="true">&nbsp;→</span>
          </Link>
        ) : null}
      </div>

      {!reduced && row.tier === "needs" && question ? (
        <div
          id={`rc-q-${row.id}`}
          role="group"
          aria-label={`Question from ${row.names}`}
          data-open={questionOpen ? "true" : "false"}
          className="rc-qcard absolute left-14 right-0 top-[calc(100%-8px)] z-20 rounded-[14px] border border-zk-border bg-zk-surface p-3.5"
        >
          <p className="m-0 text-xs font-semibold text-zk-muted">
            #{question.issue} · {question.title}
          </p>
          <p className="m-0 mt-1 text-sm leading-snug text-zk-text">{question.text}</p>
          <Link
            href={answerHref}
            tabIndex={questionOpen ? 0 : -1}
            className="mt-1 inline-flex min-h-8 items-center text-sm font-bold text-zk-accent hover:underline"
          >
            Answer <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </div>
      ) : null}

      {!reduced && offline ? (
        <span
          aria-hidden="true"
          data-show={peek ? "true" : "false"}
          className="rc-bubble pointer-events-none absolute -top-3 left-12 z-10 whitespace-nowrap rounded-full border border-zk-border bg-zk-surface px-2.5 py-0.5 text-xs font-semibold text-zk-text2"
        >
          Nothing to report
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
 * and the question slides out. "Got it": each robot salutes, its light turns
 * green, and it flies down into its own row in "Your agents"; then the card folds.
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
  answerHref,
  onDone,
}: {
  rows: RollRow[];
  /** Identifies this return, so the entrance plays once per return. */
  returnId: number;
  awayLabel: string;
  points: number;
  reduced: boolean;
  answerHref: string;
  onDone: (kind: Leaving) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [kind, setKind] = useState<Leaving>("gotit");
  const [lit, setLit] = useState(false);
  const [flyers, setFlyers] = useState<Flyer[] | null>(null);
  const [landed, setLanded] = useState(0);
  const [replays, setReplays] = useState<Record<string, number>>({});
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [peek, setPeek] = useState(false);
  const [entranceStill] = useState(() => entrancePlayed.has(returnId));
  const [mountedAt] = useState(() => performance.now());
  const robots = useRef(new Map<string, HTMLElement>());
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

  // "Got it", part 1: everyone salutes and their lights turn green, then they fly.
  useEffect(() => {
    if (phase !== "salute") return;
    const light = window.setTimeout(() => setLit(true), LIGHT_AT);
    const go = window.setTimeout(
      () => {
        const list: Flyer[] = [];
        rows.forEach((row, i) => {
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

  // The question card closes on Escape or a press outside the card.
  useEffect(() => {
    if (!openQuestion) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenQuestion(null);
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest(`#rc-q-${openQuestion}, [aria-controls="rc-q-${openQuestion}"]`)) {
        setOpenQuestion(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [openQuestion]);

  const gotIt = () => {
    if (phase !== "idle") return;
    if (reduced) return onDone("gotit");
    setOpenQuestion(null);
    setKind("gotit");
    setPhase("salute");
  };

  const dismiss = () => {
    if (phase !== "idle") return;
    if (reduced) return onDone("disable");
    setOpenQuestion(null);
    setKind("disable");
    setPhase("fold");
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
      className="rc-card rounded-[20px] border border-zk-border bg-zk-surface p-4 sm:p-6"
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
          className="rc-primary inline-flex min-h-10 shrink-0 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white disabled:cursor-default"
        >
          Got it
        </button>
      </div>

      <ul className="m-0 mt-2 list-none p-0">
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
            questionOpen={openQuestion === row.id}
            onToggleQuestion={(id) => setOpenQuestion((cur) => (cur === id ? null : id))}
            peek={peek}
            onPeek={wake}
            answerHref={answerHref}
            registerRobot={(id, el) => {
              if (el) robots.current.set(id, el);
              else robots.current.delete(id);
            }}
          />
        ))}
      </ul>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-zk-divider pt-3.5">
        <p className="m-0 text-[13px] text-zk-muted">You earned {points.toLocaleString("en-US")} pts while away.</p>
        <button
          type="button"
          onClick={dismiss}
          disabled={phase !== "idle"}
          className="rc-press -mr-2 inline-flex min-h-8 items-center rounded-full px-2 text-[13px] font-semibold text-zk-muted underline-offset-2 hover:text-zk-text hover:underline"
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
