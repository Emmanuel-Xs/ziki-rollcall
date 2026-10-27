// The rows on the Issues list. Mock data: the real page reads them from Postgres.
import type { Severity, Status } from "@prisma/client";
import type { IssueStage } from "@/lib/issue-stage";

export type MockPlatform = { id: string; name: string };

export const MOCK_PLATFORMS: MockPlatform[] = [
  { id: "desktop", name: "Desktop" },
  { id: "mobile", name: "Mobile" },
  { id: "web", name: "Web" },
];

export type MockIssue = {
  id: string;
  number: number;
  title: string;
  status: Status;
  severity: Severity;
  voteCount: number;
  userVoted: boolean;
  createdAt: Date;
  updatedAt: Date;
  typeName: string;
  platformId: string | null;
  commentCount: number;
  attachmentCount: number;
  reporter: { name: string; image: string | null };
  assignee: { name: string; image: string | null } | null;
  /** Someone is working on it: who, and since when. */
  claim: { person: string; since: Date } | null;
  /** Where an open issue sits before the work starts. */
  stage: IssueStage | undefined;
  botConfirmations: number;
  /** An agent asked something and nobody has answered: the Inbox. */
  hasQuestion: boolean;
  duplicateOf: number | null;
  rejected: boolean;
  reviewStatus: "ready_to_merge" | "merged" | null;
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** `now` keeps "1 day ago" true whenever the page is opened. */
export function mockIssues(now: Date): MockIssue[] {
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const person = (name: string) => ({ name, image: null });
  const base = {
    userVoted: false,
    attachmentCount: 0,
    assignee: null,
    claim: null,
    botConfirmations: 0,
    hasQuestion: false,
    duplicateOf: null,
    rejected: false,
    reviewStatus: null,
  } satisfies Partial<MockIssue>;

  return [
    {
      ...base,
      id: "bug-107",
      number: 107,
      title: "[Design] Desktop Sign up screen doesn't fit in the default window",
      status: "open",
      severity: "medium",
      voteCount: 29,
      createdAt: ago(1 * DAY),
      updatedAt: ago(3 * HOUR),
      typeName: "Design",
      platformId: "desktop",
      commentCount: 3,
      reporter: person("99plusOne"),
      assignee: person("99plusOne"),
      stage: "ready",
      botConfirmations: 3,
    },
    {
      ...base,
      id: "bug-183",
      number: 183,
      title: '[Bug] Voice message shows as "Video" in the chats list',
      status: "open",
      severity: "medium",
      voteCount: 27,
      createdAt: ago(1 * DAY),
      updatedAt: ago(2.5 * HOUR),
      typeName: "Bug",
      platformId: "mobile",
      commentCount: 2,
      reporter: person("Kemi"),
      stage: "confirmed",
      botConfirmations: 2,
      hasQuestion: true,
    },
    {
      ...base,
      id: "bug-29",
      number: 29,
      title: "Zedu Desktop: Send button stays disabled after typing in the message composer",
      status: "in_progress",
      severity: "medium",
      voteCount: 27,
      createdAt: ago(1 * DAY),
      updatedAt: ago(25 * 60_000),
      typeName: "Bug",
      platformId: "desktop",
      commentCount: 4,
      reporter: person("Tola"),
      claim: { person: "PlusOne Review 2", since: ago(6 * HOUR) },
      stage: "ready",
      botConfirmations: 3,
    },
    {
      ...base,
      id: "bug-222",
      number: 222,
      title: "[bug] Desktop DM: long drafts can grow without a height limit",
      status: "in_progress",
      severity: "medium",
      voteCount: 23,
      createdAt: ago(1 * DAY),
      updatedAt: ago(1.2 * HOUR),
      typeName: "Bug",
      platformId: "desktop",
      commentCount: 2,
      reporter: person("Chidi O."),
      claim: { person: "PlusOne Review 1", since: ago(5 * HOUR) },
      stage: "ready",
      botConfirmations: 3,
    },
    {
      ...base,
      id: "bug-186",
      number: 186,
      title: "[Marketing/Feature] Add Copy to DM messages on Desktop (hover button)",
      status: "open",
      severity: "low",
      voteCount: 14,
      createdAt: ago(2 * DAY),
      updatedAt: ago(8 * HOUR),
      typeName: "Feature",
      platformId: "desktop",
      commentCount: 1,
      reporter: person("Ife"),
      stage: "reported",
    },
    {
      ...base,
      id: "bug-155",
      number: 155,
      title: '[Bug][Content] Org invite page marketing consent mentions "Salesforce"',
      status: "open",
      severity: "high",
      voteCount: 11,
      createdAt: ago(2 * DAY),
      updatedAt: ago(9 * HOUR),
      typeName: "Content",
      platformId: "web",
      commentCount: 0,
      reporter: person("Dayo"),
      stage: "reported",
      botConfirmations: 1,
    },
    {
      ...base,
      id: "bug-67",
      number: 67,
      title: "Desktop: Google sign-in hangs forever if the browser tab is closed",
      status: "open",
      severity: "high",
      voteCount: 9,
      createdAt: ago(3 * DAY),
      updatedAt: ago(1 * DAY),
      typeName: "Security",
      platformId: "desktop",
      commentCount: 5,
      reporter: person("Baron"),
      stage: "confirmed",
      botConfirmations: 2,
    },
    {
      ...base,
      id: "bug-14",
      number: 14,
      title: "Unable to favorite/star people in the web application",
      status: "open",
      severity: "low",
      voteCount: 6,
      createdAt: ago(4 * DAY),
      updatedAt: ago(2 * DAY),
      typeName: "Bug",
      platformId: "web",
      commentCount: 1,
      reporter: person("Ngozi"),
      stage: "confirmed",
      botConfirmations: 2,
    },
    {
      ...base,
      id: "bug-106",
      number: 106,
      title: "[Design] Desktop Sign up screen doesn't fit in the default window",
      status: "open",
      severity: "medium",
      voteCount: 6,
      createdAt: ago(1 * DAY),
      updatedAt: ago(1 * DAY),
      typeName: "Design",
      platformId: "desktop",
      commentCount: 2,
      reporter: person("99plusOne"),
      assignee: person("99plusOne"),
      stage: "ready",
      botConfirmations: 3,
      duplicateOf: 107,
    },
    {
      ...base,
      id: "bug-148",
      number: 148,
      title: "Footer Facebook icon links to a broken URL",
      status: "resolved",
      severity: "low",
      voteCount: 5,
      createdAt: ago(5 * DAY),
      updatedAt: ago(2 * DAY),
      typeName: "Bug",
      platformId: "web",
      commentCount: 3,
      reporter: person("Seyi"),
      stage: undefined,
      botConfirmations: 3,
      reviewStatus: "ready_to_merge",
    },
    {
      ...base,
      id: "bug-90",
      number: 90,
      title: "Signing Out of Workspace and Deleting Organization Both Show Loading Spinners Simultaneously",
      status: "resolved",
      severity: "medium",
      voteCount: 4,
      createdAt: ago(6 * DAY),
      updatedAt: ago(3 * DAY),
      typeName: "Bug",
      platformId: "web",
      commentCount: 2,
      reporter: person("Amaka"),
      stage: undefined,
      botConfirmations: 3,
      reviewStatus: "merged",
    },
    {
      ...base,
      id: "bug-181",
      number: 181,
      title: '[Content] Login screen says "Already have an account? Sign up" and "Sign up with Google/Apple"',
      status: "closed",
      severity: "low",
      voteCount: 2,
      createdAt: ago(6 * DAY),
      updatedAt: ago(4 * DAY),
      typeName: "Content",
      platformId: "mobile",
      commentCount: 1,
      reporter: person("Uche"),
      stage: undefined,
      rejected: true,
    },
  ];
}

/** What each of the user's agents did in the last 30 days, for the Inbox's "Your agents" box. */
export const MOCK_AGENT_DONE: Record<string, string> = {
  a3: "reviewed 7 fixes",
  a1: "fixed 5 issues and linked 5 PRs",
  a2: "reviewed 18 fixes",
  a4: "checked 41 new reports",
};
