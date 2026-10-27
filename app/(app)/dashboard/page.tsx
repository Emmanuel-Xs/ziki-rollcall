import Link from "next/link";
import type { Metadata } from "next";
import { RESOLVED_STATUSES, type WorkspaceOverview } from "@/lib/dashboard-overview";
import { DashboardAgents, type DashboardAgentView } from "@/components/dashboard-agents";
import { OverviewStatCards, type OverviewStat } from "@/components/overview/stat-cards";
import { AssignedIssuesTable } from "@/components/overview/assigned-issues-table";
import { PointsChart } from "@/components/overview/points-chart";
import { pointsThisWeek } from "@/lib/points/history";
import { formatPoints, TARGET_POINTS } from "@/lib/points/rules";
import { MOCK_ASSIGNED, MOCK_POINTS, MOCK_SOLVED_TASKS, MOCK_USER, mockAgents, mockPointHistory } from "@/lib/mock-data";
import { RollCallCard, RollCallProvider } from "@/components/roll-call/RollCallHost";
import { DemoControls } from "@/components/roll-call/DemoControls";

export const metadata: Metadata = { title: "Dashboard" };

// The real page loads all of this from Postgres. Here it comes from lib/mock-data.ts.
function firstName(name: string | null | undefined, email: string | null | undefined): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed.split(/\s+/)[0] ?? trimmed;
  const local = email?.split("@")[0]?.trim();
  return local || "there";
}

function buildStats(input: {
  overview: WorkspaceOverview;
  weekPoints: number;
  createdLast30: number;
  highPriorityAssigned: number;
  resolvedAssigned: number;
}): OverviewStat[] {
  const { overview, weekPoints, createdLast30, highPriorityAssigned, resolvedAssigned } = input;
  const toGo = Math.max(0, TARGET_POINTS - weekPoints);
  const assigned = overview.assignedToMe;
  const resolvedPct =
    assigned === 0 ? 0 : Math.min(100, Math.round((resolvedAssigned / assigned) * 100));

  return [
    {
      label: "Points",
      value: formatPoints(overview.points.points),
      href: "/workers",
      chip: weekPoints >= TARGET_POINTS ? "Goal met" : `${formatPoints(toGo)} to go`,
      chipTone: weekPoints >= TARGET_POINTS ? "ok" : "tint",
      note: "500 required this week",
    },
    {
      label: "Created by me",
      value: String(overview.reportedByMe),
      href: "/issues?mine=created",
      chip: createdLast30 > 0 ? `+${createdLast30}` : "0",
      chipTone: createdLast30 > 0 ? "ok" : "chip",
      note: "in the last 30 days",
    },
    {
      label: "Assigned to me",
      value: String(assigned),
      href: "/issues?mine=assigned",
      chip: String(highPriorityAssigned),
      chipTone: highPriorityAssigned > 0 ? "bad" : "chip",
      note: "high priority",
    },
    {
      label: "Resolved issues",
      value: String(resolvedAssigned),
      href: "/issues?mine=assigned&status=finished",
      chip: `${resolvedPct}%`,
      chipTone: "chip",
      note: "of issues assigned to me",
    },
  ];
}


export default async function DashboardPage() {
  const user = MOCK_USER;
  const now = new Date();

  const overview: WorkspaceOverview = {
    unresolvedCount: 2,
    resolvedCount: 0,
    recentUnresolved: [],
    recentResolved: [],
    assignedToMe: MOCK_ASSIGNED.length,
    reportedByMe: 2,
    points: { points: MOCK_POINTS, solvedTasks: MOCK_SOLVED_TASKS },
    rank: null,
  };
  const historyEntries = mockPointHistory(now);
  const createdLast30 = 2;
  const highPriorityAssigned = 0;
  const resolvedAssigned = MOCK_ASSIGNED.filter((issue) =>
    (RESOLVED_STATUSES as readonly string[]).includes(issue.status),
  ).length;
  const assignedIssues = MOCK_ASSIGNED;

  const agents: DashboardAgentView[] = mockAgents(now).map((agent) => ({
    ...agent,
    lastSeenAt: agent.lastSeenAt ? agent.lastSeenAt.toISOString() : null,
  }));

  const weekPoints = pointsThisWeek(historyEntries, now);
  const stats = buildStats({
    overview,
    weekPoints,
    createdLast30,
    highPriorityAssigned,
    resolvedAssigned,
  });

  const chartEntries = historyEntries.map((e) => ({
    createdAt: e.createdAt.toISOString(),
    points: e.points,
  }));

  const name = firstName(user.name, user.email);

  return (
    <RollCallProvider>
    <div className="min-w-0 space-y-5">
      <DemoControls />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-zk-text">
            Welcome back, {name}
          </h1>
          <p className="text-sm text-zk-muted">
            Issues, votes and your points for Ziki at a glance.
          </p>
        </div>
        <Link
          href="/issues/new"
          className="inline-flex h-[42px] items-center gap-2 rounded-full border border-zk-border bg-zk-surface px-5 text-sm font-semibold text-zk-text hover:bg-zk-chip"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New issue
        </Link>
      </div>

      <RollCallCard />

      <OverviewStatCards stats={stats} />

      <AssignedIssuesTable issues={assignedIssues} />

      <PointsChart entries={chartEntries} nowIso={now.toISOString()} />

      <DashboardAgents initial={agents} />
    </div>
    </RollCallProvider>
  );
}
