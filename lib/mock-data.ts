// All the data in this demo. Nothing here talks to a database or an API.
// It stands in for what the real dashboard loads (requireUser, loadWorkspaceOverview,
// loadOwnAgents, loadPointHistory ...), shaped the same.
import type { AppRole } from "@/lib/roles";
import type { DashboardAgent } from "@/lib/dashboard-overview";
import type { OverviewAssignedIssue } from "@/components/overview/assigned-issues-table";
import { startOfIsoWeek, type PointHistoryEntry } from "@/lib/points/history";

export const MOCK_USER = {
  id: "user-99plusone",
  name: "99plusOne",
  email: "99plusone@example.com",
  image: null as string | null,
  role: "user" as AppRole,
};

export const MOCK_WORKSPACE = { id: "tenant-zedu", name: "Zedu", slug: "zedu" };

export const MOCK_POINTS = 17095.12;
export const MOCK_SOLVED_TASKS = 41;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The five agents. `now` is passed in so "last seen" is always relative to the request. */
export function mockAgents(now: Date): DashboardAgent[] {
  const ago = (ms: number) => new Date(now.getTime() - ms);
  return [
    {
      id: "a3",
      name: "PlusOne Review 3",
      model: "Claude",
      level: "reviewer",
      status: "waiting",
      activity: "Asked whether #183 should fix web too",
      lastSeenAt: ago(2.5 * HOUR),
    },
    {
      id: "a1",
      name: "PlusOne Review 1",
      model: "Claude",
      level: "contributor",
      status: "working",
      activity: "Fixed #222 and linked a PR",
      lastSeenAt: ago(1.2 * HOUR),
    },
    {
      id: "a2",
      name: "PlusOne Review 2",
      model: "Claude",
      level: "reviewer",
      status: "working",
      activity: "Testing the PR for #29",
      lastSeenAt: ago(25 * 60_000),
    },
    {
      id: "a4",
      name: "PlusOne Review 4",
      model: "Claude",
      level: "triager",
      status: "idle",
      activity: "Checked 6 new reports",
      lastSeenAt: ago(3.5 * HOUR),
    },
    {
      id: "a5",
      name: "Claude",
      model: "Claude",
      level: "observer",
      status: "offline",
      activity: "No recent activity",
      lastSeenAt: ago(2 * DAY),
    },
  ];
}

/** Issues #107 and #106, the two assigned to the demo user. */
export const MOCK_ASSIGNED: OverviewAssignedIssue[] = [
  {
    id: "bug-107",
    number: 107,
    title: "[Design] Desktop Sign up screen doesn't fit in the default window",
    severity: "medium",
    status: "open",
    voteCount: 29,
    userVoted: false,
    typeName: "Design",
    commentCount: 3,
    createdAt: "2026-10-17T09:12:00.000Z",
    stage: "ready",
  },
  {
    id: "bug-106",
    number: 106,
    title: "[Design] Desktop Sign up screen doesn't fit in the default window",
    severity: "medium",
    status: "open",
    voteCount: 6,
    userVoted: false,
    typeName: "Design",
    commentCount: 2,
    createdAt: "2026-10-17T08:40:00.000Z",
    stage: "ready",
  },
];

/**
 * Eight weeks of points, ending with last week, so this week starts at "500 to go".
 * Built from `now` so the chart always shows the last eight weeks. Each week's
 * three awards land inside that ISO week.
 */
export function mockPointHistory(now: Date): PointHistoryEntry[] {
  const weeks = [310, 540, 655, 480, 720, 560, 505, 430];
  const thisWeek = startOfIsoWeek(now).getTime();
  const entries: PointHistoryEntry[] = [];
  weeks.forEach((total, i) => {
    const weekStart = thisWeek - (weeks.length - i) * 7 * DAY;
    const parts = [total * 0.5, total * 0.3, total * 0.2];
    parts.forEach((points, j) => {
      entries.push({ createdAt: new Date(weekStart + (j + 1) * DAY + 12 * HOUR), points: Math.round(points * 100) / 100 });
    });
  });
  return entries;
}
