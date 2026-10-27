// Pure sentence logic for the roll call. No React, no DOM, easy to test.
import type { AgentEvent, EventName, RollAgent } from './data'

export type Tier = 'needs' | 'did' | 'quiet'

export type Summary = {
  agent: RollAgent
  tier: Tier
  /** One short line. Empty for quiet agents; they are grouped by buildRollCall. */
  sentence: string
  /** How many events the agent produced, used for ordering. */
  activity: number
  /** The issue a "needs you" question is about. */
  issue?: number
}

/** A line on the card. Quiet and offline agents share one: "Claude and X: nothing to report." */
export type RollRow = {
  id: string
  tier: Tier
  names: string
  sentence: string
  /** Whose robot to draw on this row. */
  agent: RollAgent
  issue?: number
}

const QUESTION_CHARS = 80
const MAX_FACTS = 2

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const ofName = (events: AgentEvent[], name: EventName) => events.filter((e) => e.name === name)

/** "#1", "#1 and #2", or "3 issues" when listing them would crowd the line. */
const issueList = (events: AgentEvent[]) => {
  const nums = [...new Set(events.map((e) => e.issue))]
  return nums.length <= MAX_FACTS ? nums.map((n) => `#${n}`).join(' and ') : `${nums.length} issues`
}

// One sentence per kind of work, in the order they matter. comment.created is
// last on purpose: it only speaks when it is all there is.
const FACTS: [EventName, (events: AgentEvent[]) => string][] = [
  ['issue.pr_linked', (e) => (e.length === 1 ? `Fixed #${e[0].issue} and linked a PR.` : `Fixed ${e.length} issues and linked PRs.`)],
  [
    'issue.test_verdict',
    (e) => {
      const passed = e.filter((v) => v.goodToMerge).length
      return `Reviewed ${plural(e.length, 'fix', 'fixes')}. ${passed} passed, ${e.length - passed} sent back.`
    },
  ],
  ['issue.validated', (e) => `Checked ${plural(e.length, 'new report', 'new reports')}.`],
  ['issue.created', (e) => `Filed ${plural(e.length, 'issue', 'issues')}.`],
  ['claim.accepted', (e) => `Took ${issueList(e)}.`],
  ['claim.released', (e) => `Gave ${issueList(e)} back.`],
  ['comment.created', (e) => `Left ${plural(e.length, 'comment', 'comments')}.`],
]

/** What one agent did while the owner was away, in at most two short facts. */
export function summarizeAgent(agent: RollAgent): Summary {
  const activity = agent.events.length

  if (agent.question) {
    const { text, issue } = agent.question
    const clipped = text.length > QUESTION_CHARS ? `${text.slice(0, QUESTION_CHARS).trimEnd()}…` : text
    return { agent, tier: 'needs', sentence: `Needs you: ${clipped}`, activity, issue }
  }

  const facts = FACTS.map(([name, say]) => {
    const found = ofName(agent.events, name)
    return { name, text: found.length ? say(found) : '' }
  }).filter((f) => f.text)
  const work = facts.filter((f) => f.name !== 'comment.created')
  const chosen = (work.length ? work : facts).slice(0, MAX_FACTS)

  if (!chosen.length) return { agent, tier: 'quiet', sentence: '', activity }
  return { agent, tier: 'did', sentence: chosen.map((f) => f.text).join(' '), activity }
}

const joinNames = (names: string[]) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/**
 * The card's lines, in order: needs you first, then agents that did work (most
 * activity first), then every quiet or offline agent on a single line.
 */
export function buildRollCall(agents: RollAgent[]): RollRow[] {
  const all = agents.map(summarizeAgent)
  const byName = (a: Summary, b: Summary) => a.agent.name.localeCompare(b.agent.name)
  const needs = all.filter((s) => s.tier === 'needs').sort(byName)
  const did = all.filter((s) => s.tier === 'did').sort((a, b) => b.activity - a.activity || byName(a, b))
  const quiet = all.filter((s) => s.tier === 'quiet').sort(byName)

  const rows: RollRow[] = [...needs, ...did].map((s) => ({
    id: s.agent.id,
    tier: s.tier,
    names: s.agent.name,
    sentence: s.sentence,
    agent: s.agent,
    issue: s.issue,
  }))

  if (quiet.length) {
    rows.push({
      id: 'quiet',
      tier: 'quiet',
      names: joinNames(quiet.map((s) => s.agent.name)),
      sentence: 'nothing to report.',
      agent: quiet[0].agent,
    })
  }
  return rows
}

/** "9 hours", "1 hour", "40 minutes". */
export function formatAway(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return plural(minutes, 'minute', 'minutes')
  const hours = Math.round(minutes / 60)
  if (hours < 48) return plural(hours, 'hour', 'hours')
  return plural(Math.round(hours / 24), 'day', 'days')
}
