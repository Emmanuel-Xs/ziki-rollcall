// Mock data for the Agent Roll Call demo. Shaped like real Ziki: the same four
// agent statuses as AgentGraphic, real event names, one points total for the owner.

import type { AgentStatus } from '@/lib/dashboard-overview'

export type { AgentStatus }

export type EventName =
  | 'issue.pr_linked'
  | 'issue.test_verdict'
  | 'issue.validated'
  | 'issue.created'
  | 'claim.accepted'
  | 'claim.released'
  | 'comment.created'

export type AgentEvent = {
  name: EventName
  issue: number
  title: string
  /** Hours before the owner came back. */
  hoursAgo: number
  /** issue.test_verdict only: did the fix pass? */
  goodToMerge?: boolean
}

/** Like Ziki's AgentQuestion: something the agent asked and nobody has answered. */
export type AgentQuestion = { issue: number; title: string; text: string }

export type RollAgent = {
  id: string
  name: string
  status: AgentStatus
  events: AgentEvent[]
  question?: AgentQuestion
}

/** How long the owner was away, and what they earned meanwhile. Points belong to the person, not the agent. */
export const AWAY_HOURS = 9
export const POINTS_EARNED = 1050

const T = {
  i183: '[Bug] Voice message shows as "Video" in the chats list',
  i222: 'Desktop DM: long drafts can grow without a height limit',
  i29: 'Zedu Desktop: Send button stays disabled after typing in the message composer',
  i107: "[Design] Desktop Sign up screen doesn't fit in the default window",
}

// The six reports PlusOne Review 4 checked.
const NEW_REPORTS: [number, string][] = [
  [2, 'Bug: Kebab menu ("More options") in DM header is unresponsive on the desktop app'],
  [90, 'Signing Out of Workspace and Deleting Organization Both Show Loading Spinners Simultaneously'],
  [148, 'Footer Facebook icon links to a broken URL'],
  [181, 'Login screen says "Already have an account? Sign up" and "Sign up with Google/Apple"'],
  [155, 'Org invite page marketing consent mentions "Salesforce"'],
  [186, 'Add Copy to DM messages on Desktop (hover button)'],
]

export const AGENTS: RollAgent[] = [
  {
    id: 'a3',
    name: 'PlusOne Review 3',
    status: 'waiting',
    events: [{ name: 'comment.created', issue: 183, title: T.i183, hoursAgo: 2.5 }],
    question: { issue: 183, title: T.i183, text: 'Should #183 fix the web app too, or only the mobile chats list?' },
  },
  {
    id: 'a1',
    name: 'PlusOne Review 1',
    status: 'working',
    events: [{ name: 'issue.pr_linked', issue: 222, title: T.i222, hoursAgo: 1.2 }],
  },
  {
    id: 'a2',
    name: 'PlusOne Review 2',
    status: 'working',
    events: [
      { name: 'issue.test_verdict', issue: 29, title: T.i29, hoursAgo: 6, goodToMerge: true },
      { name: 'issue.test_verdict', issue: 222, title: T.i222, hoursAgo: 4.5, goodToMerge: true },
      { name: 'issue.test_verdict', issue: 107, title: T.i107, hoursAgo: 3, goodToMerge: false },
    ],
  },
  {
    id: 'a4',
    name: 'PlusOne Review 4',
    status: 'idle',
    events: NEW_REPORTS.map(([issue, title], i) => ({ name: 'issue.validated' as const, issue, title, hoursAgo: 8 - i })),
  },
  { id: 'a5', name: 'Claude', status: 'offline', events: [] },
]
