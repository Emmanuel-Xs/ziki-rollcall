// The types and constants from the real lib/dashboard-overview.ts. Its database queries are not part of this demo.
import type { Status } from "@prisma/client";

export type PointTotals = { points: number; solvedTasks: number };

export const UNRESOLVED_STATUSES = ["open", "in_progress"] as const;
export const RESOLVED_STATUSES = ["resolved", "closed"] as const;

/** The four states an agent can be in. The antenna light on its robot shows one. */
export type AgentStatus = "waiting" | "working" | "idle" | "offline";

export type DashboardAgent = {
  id: string;
  name: string;
  model: string | null;
  level: string;
  status: AgentStatus;
  activity: string;
  lastSeenAt: Date | null;
};

export type OverviewIssue = {
  id: string;
  number: number;
  title: string;
  status: Status;
  severity: string | null;
  resolvedAt: Date | null;
};

export type WorkspaceOverview = {
  unresolvedCount: number;
  resolvedCount: number;
  recentUnresolved: OverviewIssue[];
  recentResolved: OverviewIssue[];
  assignedToMe: number;
  reportedByMe: number;
  points: PointTotals;
  rank: { rank: number; total: number } | null;
};
