import Link from "next/link";
import "./issues.css";
import { Avatar } from "@/components/avatar";
import { Suspense } from "react";
import type { Severity } from "@prisma/client";
import { InboxButton } from "@/components/inbox-button";
import { InboxAgents } from "@/components/inbox-agents";
import { IssueFilters } from "@/components/issue-filters";
import { RowAge, RowAssignee } from "@/components/issue-row-meta";
import { VoteButton } from "@/components/vote-button";
import { severityLabels } from "@/lib/labels";
import { severities } from "@/lib/validations/issue";
import { Highlighted, SearchSnippet } from "@/components/search-highlight";
import { formatIssueNumber } from "@/lib/issue-number";
import { SHOW_RESOLVED_PARAM, isDone, parseShowResolved, resultCountText } from "@/lib/issue-state";
import { calculatePagination } from "@/lib/pagination";
import { issueListPaginationParams } from "@/lib/issue-list-pagination";
import { DUPLICATES_PARAM, SHOW_DUPLICATES, parseShowDuplicates } from "@/lib/duplicates";
import { PaginationControls } from "@/components/pagination-controls";
import { createEmptyVoterSummary } from "@/lib/voters";
import { bugSortDescriptions, parseBugSort, sortBugs } from "@/lib/issues-sort";
import { defaultSortFor, parseMineFilter } from "@/lib/mine-filter";
import { highlightSegments, type Snippet } from "@/lib/search-snippet";
import { PLATFORM_NONE, PLATFORM_PARAM, parsePlatformFilter } from "@/lib/platform-filter";
import { PlatformMenu, type PlatformTab } from "@/components/platform-tabs";
import { IssueRowStatus } from "@/components/issue-row-status";
import { IssuesToolsToggle } from "@/components/issues-tools-toggle";
import { parseProjectAreaFilter } from "@/lib/project-area-filter";
import { parseIssueStageView, type IssueStage } from "@/lib/issue-stage";
import { issuePath } from "@/lib/issue-ref";
import { PROJECT_ALL_PARAM, showsAllProjects } from "@/lib/issue-list-filters";
import { parseTagFilter, serializeTags } from "@/lib/tag-filter";
import { toSingleQueryParam } from "@/lib/search";
import { MOCK_AGENT_DONE, MOCK_PLATFORMS, mockIssues, type MockIssue } from "@/lib/mock-issues";
import { MOCK_WORKSPACE, mockAgents } from "@/lib/mock-data";

/* Distinct browser-tab title; the root layout appends "· Ziki". */
export const metadata = { title: "Issues" };

// The real Issues list (tabs, Inbox, filters, rows), copied with its markup.
// What the real page reads from Postgres comes from lib/mock-issues.ts here,
// filtered in memory. Bulk actions, milestones and watching are not part of the demo.

/** `?status=all`: every issue. With no `?status=` the page opens on the Inbox. */
const ALL_STATUS = "all";
/** `?status=escalated`: the Inbox; kept so older links still open it. */
const ESCALATED_STATUS = "escalated";

/**
 * The Inbox's three lists, picked with `?inbox=` on the escalated view:
 * agent questions waiting on someone (the default), redesign proposals
 * waiting on a decision, and new ideas (reported, not yet confirmed).
 */
const INBOX_PARAM = "inbox";
type InboxView = "input" | "design" | "ideas";
const INBOX_TABS: { view: InboxView; label: string }[] = [
  { view: "input", label: "Need your input" },
  { view: "design", label: "Design feedback needed" },
  { view: "ideas", label: "New ideas" },
];
const AGENT_ORDER = { waiting: 0, working: 1, idle: 2, offline: 3 } as const;

/** `?status=rejected`: a reviewer agent found the issue isn't real (#1122). */
const REJECTED_STATUS = "rejected";
/** `?status=duplicate`: marked as a duplicate of another issue. */
const DUPLICATE_STATUS = "duplicate";
/** `?status=ready_to_merge`: resolved issues whose fix is ready for admin merge (#SDLC). */
const READY_TO_MERGE_STATUS = "ready_to_merge";
/** `?status=auto_merge`: resolved issues whose fix was auto-merged (#SDLC). */
const AUTO_MERGE_STATUS = "auto_merge";

/** The filters under the All tab. Open, In progress and Done have tabs of their own. */
const ALL_FILTERS = [
  { value: ALL_STATUS, label: "All" },
  { value: "closed", label: "Closed" },
  { value: REJECTED_STATUS, label: "Rejected" },
  { value: DUPLICATE_STATUS, label: "Duplicates" },
] as const;

/** New issue as a 32px + button; the name is kept for screen readers and the tooltip. */
function NewIssueButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/issues/new"
      title="New issue"
      className={`issues-new inline-flex w-8 items-center justify-center rounded-lg border border-zk-border bg-zk-surface text-zk-text hover:bg-zk-chip ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      <span className="sr-only">New issue</span>
    </Link>
  );
}

/** A bug with head, antennae, segmented body and three pairs of legs. */
const BUG_ICON_PATH =
  "m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3 3 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4";

/** A sparkle, for feature and improvement types. */
const FEATURE_ICON_PATH =
  "m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z";

type SearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
  severity?: string | string[];
  platform?: string | string[];
  area?: string | string[];
  sort?: string | string[];
  page?: string | string[];
  deleted?: string | string[];
  mine?: string | string[];
  tags?: string | string[];
  [key: string]: string | string[] | undefined;
}>;

function isSeverity(value: string | undefined): value is Severity {
  return !!value && (severities as readonly string[]).includes(value);
}



const LIVE = (issue: MockIssue) => issue.status === "open" || issue.status === "in_progress";

export default async function BugsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const now = new Date();
  const params = await searchParams;
  const workspaceName = MOCK_WORKSPACE.name;
  const activeProject = null;
  const isDeletedView = false;
  const canDelete = false;
  const isWatchingView = false;
  const allProjects = showsAllProjects(params[PROJECT_ALL_PARAM]);
  const shortcutsEnabled = true;
  const isFirstRun = false;
  const tenantId = MOCK_WORKSPACE.id;

  const qParam = toSingleQueryParam(params.q);
  // No ?status= opens the Inbox (the escalated view); ?status=all is the All tab.
  // A search with no tab picked looks across All, so any issue can be found.
  const statusParam =
    toSingleQueryParam(params.status) ?? (qParam?.trim() ? ALL_STATUS : ESCALATED_STATUS);
  const severityParam = toSingleQueryParam(params.severity);
  const sortParam = toSingleQueryParam(params.sort);
  const pageParam = toSingleQueryParam(params.page);
  const mineFilter = parseMineFilter(params.mine);
  const currentSort = parseBugSort(sortParam, defaultSortFor(mineFilter));
  const showDuplicates = parseShowDuplicates(params[DUPLICATES_PARAM]);
  const showResolved = parseShowResolved(params[SHOW_RESOLVED_PARAM]);

  const tagTypes: { id: string; name: string }[] = [];
  const platforms = MOCK_PLATFORMS;
  const milestones: { id: string; title: string; isClosed: boolean }[] = [];
  const areas: { id: string; name: string }[] = [];
  const selectedMilestone = null;
  const selectedTags = parseTagFilter(params.tags, tagTypes);
  const tagsParam = serializeTags(selectedTags.map((t) => t.name));
  const selectedPlatform = parsePlatformFilter(params.platform, platforms);
  const selectedArea = parseProjectAreaFilter(params.area, areas);
  const milestoneParam = "";

  const isEscalatedView = statusParam === ESCALATED_STATUS;
  const inboxParam = toSingleQueryParam(params[INBOX_PARAM]);
  const inboxView: InboxView | null = !isEscalatedView
    ? null
    : inboxParam === "design" || inboxParam === "ideas"
      ? inboxParam
      : "input";
  const stageView: IssueStage | null =
    inboxView === "ideas" ? "reported" : parseIssueStageView(toSingleQueryParam(params.stage));

  // ---- the in-memory "query" ----------------------------------------------
  const searchText = qParam?.trim() ?? "";
  const all = mockIssues(now);
  const matchesSearch = (issue: MockIssue) =>
    !searchText ||
    issue.title.toLowerCase().includes(searchText.toLowerCase()) ||
    String(issue.number) === searchText.replace(/^#/, "");
  // What every tab counts: the search, severity and duplicate settings, whatever the status or platform.
  const scope = all.filter(
    (issue) =>
      matchesSearch(issue) &&
      (!isSeverity(severityParam) || issue.severity === severityParam) &&
      (showDuplicates || statusParam === DUPLICATE_STATUS || issue.duplicateOf === null),
  );
  const onPlatform = (issue: MockIssue) =>
    !selectedPlatform ||
    (selectedPlatform === PLATFORM_NONE ? issue.platformId === null : issue.platformId === selectedPlatform);
  const inStatus = (issue: MockIssue): boolean => {
    switch (statusParam) {
      case ESCALATED_STATUS:
        if (!LIVE(issue) && !showResolved) return false;
        if (inboxView === "input") return issue.hasQuestion;
        if (inboxView === "design") return false;
        return issue.stage === "reported";
      case ALL_STATUS:
        return true;
      case REJECTED_STATUS:
        return issue.rejected;
      case DUPLICATE_STATUS:
        return issue.duplicateOf !== null;
      case READY_TO_MERGE_STATUS:
        return issue.status === "resolved" && issue.reviewStatus === "ready_to_merge";
      case AUTO_MERGE_STATUS:
        return issue.status === "resolved" && issue.reviewStatus === "merged";
      case "closed":
        return issue.status === "closed";
      default:
        return issue.status === statusParam;
    }
  };

  const matching = scope.filter((issue) => onPlatform(issue) && inStatus(issue));
  const stages = new Map<string, IssueStage>(
    matching.flatMap((issue) => (issue.stage ? [[issue.id, issue.stage] as [string, IssueStage]] : [])),
  );
  const staged = stageView ? matching.filter((issue) => issue.stage === stageView) : matching;
  const totalCount = staged.length;
  const pagination = calculatePagination({ page: pageParam, totalCount });
  const sorted = sortBugs(
    staged.map((issue) => ({ ...issue, isBoosted: false })),
    currentSort,
  );
  const bugs = sorted.slice(pagination.skip, pagination.skip + pagination.take).map((issue) => ({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    status: issue.status,
    severity: issue.severity,
    voteCount: issue.voteCount,
    isDeleted: false,
    duplicateOf: showDuplicates && issue.duplicateOf !== null ? { number: issue.duplicateOf } : null,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    type: { name: issue.typeName },
    reporter: issue.reporter,
    assignee: issue.assignee,
    claims: issue.claim
      ? [{ claimedAt: issue.claim.since, createdAt: issue.claim.since, beneficiary: { name: issue.claim.person } }]
      : [],
    category: null as { id: string; name: string } | null,
    votes: issue.userVoted ? [{ id: `v-${issue.id}`, value: 1 }] : [],
    _count: { comments: issue.commentCount, attachments: issue.attachmentCount },
  }));
  const botConfirmations = new Map(all.map((issue) => [issue.id, issue.botConfirmations] as const));
  const snippets = new Map<string, Snippet>();
  // No voter avatars in the demo, but each row's count is its votes.
  const voterSummaries = new Map(
    bugs.map((bug) => {
      const summary = createEmptyVoterSummary();
      return [bug.id, { ...summary, likes: { ...summary.likes, count: bug.voteCount } }] as const;
    }),
  );

  const platformTabs: PlatformTab[] = (() => {
    const inThisTab = scope.filter(inStatus);
    return [
      { id: null, name: "All", count: inThisTab.length },
      ...platforms.map((platform) => ({
        id: platform.id,
        name: platform.name,
        count: inThisTab.filter((issue) => issue.platformId === platform.id).length,
      })),
      { id: PLATFORM_NONE, name: "No platform", count: inThisTab.filter((issue) => issue.platformId === null).length },
    ];
  })();
  const platformHref = (id: string | null) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || key === PLATFORM_PARAM) continue;
      const single = toSingleQueryParam(value);
      if (single) next.set(key, single);
    }
    if (id) next.set(PLATFORM_PARAM, id);
    const qs = next.toString();
    return qs ? `/issues?${qs}` : "/issues";
  };

  const hiddenDuplicates = showDuplicates ? 0 : all.filter((i) => i.duplicateOf !== null && matchesSearch(i)).length;
  const duplicatesHref = (() => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v && key !== DUPLICATES_PARAM && key !== "page") next.set(key, v);
    }
    if (!showDuplicates) next.set(DUPLICATES_PARAM, SHOW_DUPLICATES);
    const qs = next.toString();
    return qs ? `/issues?${qs}` : "/issues";
  })();

  const selectionKey = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => {
      const single = toSingleQueryParam(v);
      return single ? [[k, single] as [string, string]] : [];
    }),
  ).toString();

  const reportedCount = [...stages.values()].filter((stage) => stage === "reported").length;
  const confirmedCount = [...stages.values()].filter((stage) => stage === "confirmed").length;
  const readyCount = [...stages.values()].filter((stage) => stage === "ready").length;

  // Tab counts: the same scope, every status.
  const onTab = scope.filter(onPlatform);
  const countForStatus = (status: string) => onTab.filter((issue) => issue.status === status).length;
  const allCount = onTab.length;
  const live = onTab.filter(LIVE);
  const escalatedCount = live.filter((issue) => issue.hasQuestion).length;
  const rejectedCount = onTab.filter((issue) => issue.rejected).length;
  const duplicateCount = all.filter((issue) => issue.duplicateOf !== null && matchesSearch(issue)).length;
  const readyToMergeCount = onTab.filter((i) => i.status === "resolved" && i.reviewStatus === "ready_to_merge").length;
  const autoMergeCount = onTab.filter((i) => i.status === "resolved" && i.reviewStatus === "merged").length;
  const allFilterCount = (value: string) =>
    value === ALL_STATUS ? allCount : value === REJECTED_STATUS ? rejectedCount : value === DUPLICATE_STATUS ? duplicateCount : value === READY_TO_MERGE_STATUS ? readyToMergeCount : countForStatus(value);
  const designCount = 0;
  const ideasCount = live.filter((issue) => issue.stage === "reported").length;
  const inboxCounts: Record<InboxView, number> = { input: escalatedCount, design: designCount, ideas: ideasCount };

  // Your agents and what they've done, for the right half of the Inbox's top box.
  const inboxAgents = mockAgents(now);
  const inboxHref = (view: InboxView) => {
    // The Inbox is the page with no ?status=.
    const next = new URLSearchParams(statusHref(null).split("?")[1] ?? "");
    if (view !== "input") next.set(INBOX_PARAM, view);
    return `/issues${next.size ? `?${next}` : ""}`;
  };
  // The All tab stays selected on its own filters (Closed, Rejected, Duplicates).
  const allSelected = ALL_FILTERS.some((filter) => filter.value === statusParam);
  const statusHref = (status: string | null) => {
    const next = new URLSearchParams(selectionKey);
    next.delete("page");
    next.delete("stage");
    next.delete(SHOW_RESOLVED_PARAM);
    next.delete(INBOX_PARAM);
    if (status) next.set("status", status);
    else next.delete("status");
    return `/issues${next.size ? `?${next}` : ""}`;
  };
  const emptyPlatform =
    Boolean(selectedPlatform) &&
    !isWatchingView &&
    !qParam &&
    !statusParam &&
    !severityParam &&
    !tagsParam &&
    !selectedMilestone &&
    !selectedArea &&
    !stageView;
  void tenantId;
  void milestoneParam;
  void inboxAgents;

  const page = (
    <div className="issues-page mx-auto w-full max-w-6xl space-y-5">
      <div className="issues-heading flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          {/* A thin breadcrumb row, "Zedu › Issues", in place of a big title. */}
          <nav aria-label="Breadcrumb" className="issues-breadcrumb flex min-w-0 flex-wrap items-center gap-2">
            {workspaceName ? (
              <>
                <Link href="/dashboard" className="truncate text-zk-text2 hover:text-zk-text">{workspaceName}</Link>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-zk-muted"><path d="m9 18 6-6-6-6" /></svg>
              </>
            ) : null}
            <h1 aria-current="page" className="text-zk-text">
              {isDeletedView ? "Deleted Issues" : "Issues"}
            </h1>
            {isDeletedView ? (
              <span className="rounded-md bg-zk-bad-bg px-2 py-0.5 text-[11px] font-bold text-zk-bad-fg">Admin view</span>
            ) : null}
            {allProjects && !isDeletedView ? (
              <span className="rounded-md border border-zk-border bg-zk-tint px-2 py-0.5 text-[11px] font-bold text-zk-accent">All projects</span>
            ) : null}
          </nav>
        </div>
        <Suspense fallback={<div className="h-8 w-36 rounded-lg bg-zk-chip" />}>
          <IssueFilters compact tagTypes={tagTypes} platforms={platforms} milestones={milestones} areas={areas} shortcutsEnabled={shortcutsEnabled}
            stageCounts={isDeletedView ? undefined : { reported: reportedCount, confirmed: confirmedCount, ready: readyCount }}
            trailing={isFirstRun ? null : (
              <>
                {/* Desktop: New issue is a + just left of the platform menu, which stays rightmost. */}
                {!isDeletedView ? <NewIssueButton className="max-md:hidden" /> : null}
                <PlatformMenu
                  compact
                  tabs={platformTabs.map((tab) => ({ ...tab, href: platformHref(tab.id) }))}
                  current={selectedPlatform}
                />
              </>
            )} />
        </Suspense>
        <div className="issues-actions flex flex-wrap items-center gap-2 print:hidden">
          {canDelete ? (
            <Link
              href={isDeletedView ? "/issues" : "/issues?deleted=true"}
              className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-[13px] font-semibold border transition ${
                isDeletedView
                  ? "border-zk-border bg-zk-surface text-zk-text hover:bg-zk-chip"
                  : "border-zk-bad-bd bg-zk-bad-soft text-zk-bad-fg hover:bg-zk-bad-bg"
              }`}
            >
              {isDeletedView ? "← View active issues" : "View deleted issues"}
            </Link>
          ) : null}
          <IssuesToolsToggle
            active={Boolean(searchText || selectedPlatform || selectedTags.length > 0 || isSeverity(severityParam) || selectedMilestone)}
          />
          {/* Phones: the + beside the title, since the tools row is collapsed there.
              Desktop uses the one in the tools row, unless that row has no platform menu yet. */}
          {!isDeletedView ? <NewIssueButton className={isFirstRun ? "" : "md:hidden"} /> : null}
        </div>
      </div>

      <div className="space-y-4">
        {/* Inbox on the left (the escalated issues, formerly the Escalated tab);
            the status tabs sit at the right of the same row. */}
        <div className="issues-tabs-row flex items-center gap-2.5">
          {!isDeletedView ? (
            <InboxButton href={statusHref(null)} active={isEscalatedView} count={escalatedCount} />
          ) : null}
          {!isDeletedView ? (
            <nav aria-label="Issue status" className="issues-status-nav ml-auto min-w-0">
              <ul>
                {[{ value: "open", label: "Open" }, { value: "in_progress", label: "In progress" }, { value: "resolved", label: "Done" }, { value: READY_TO_MERGE_STATUS, label: "Ready to Merge" }, { value: AUTO_MERGE_STATUS, label: "Auto Merge" }, { value: ALL_STATUS, label: "All" }].map(({ value, label }) => (
                  <li key={value}>
                    <Link href={statusHref(value)} aria-current={(value === ALL_STATUS ? allSelected : value === statusParam) ? "page" : undefined}>
                      <span className={`issues-status-dot issues-status-${value}`} aria-hidden="true" />
                      {label}<span className="issues-status-count">{value === ALL_STATUS ? allCount : value === READY_TO_MERGE_STATUS ? readyToMergeCount : value === AUTO_MERGE_STATUS ? autoMergeCount : countForStatus(value)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>

        {inboxView ? (
          <>
            {/* How the Inbox works, above its three lists. */}
            {/* One box in two halves: how the Inbox works, and your agents with what they've done. */}
            <section aria-label="How the Inbox works" className="grid overflow-hidden rounded-[14px] border border-zk-border bg-zk-surface md:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex items-start gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zk-tint text-zk-accent" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-zk-text">How the Inbox works</h2>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-zk-text2">
                    Agents work through issues on their own and stop here when they need a person: to answer a question, give feedback on a design, or weigh in on a new idea.
                  </p>
                </div>
              </div>
              <div aria-label="Your agents" role="group" className="flex flex-col gap-2 border-zk-divider p-3 max-md:border-t md:border-l">
                <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Your agents</h2>
                <InboxAgents
                  // Agents waiting on you, then working ones, come first.
                  agents={[...inboxAgents].sort((a, b) => AGENT_ORDER[a.status] - AGENT_ORDER[b.status]).map((agent) => {
                    const done = MOCK_AGENT_DONE[agent.id];
                    return {
                      id: agent.id,
                      name: agent.name,
                      status: agent.status,
                      activity: agent.activity,
                      done: done ? `Last 30 days: ${done}` : "Nothing done in the last 30 days",
                    };
                  })}
                />
              </div>
            </section>
            <nav aria-label="Inbox lists" className="issues-inbox-tabs overflow-x-auto">
              <ul className="flex w-max gap-1 border-b border-zk-divider">
                {INBOX_TABS.map(({ view, label }) => {
                  const on = inboxView === view;
                  return (
                    <li key={view}>
                      <Link
                        href={inboxHref(view)}
                        aria-current={on ? "page" : undefined}
                        className={`-mb-px inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent ${
                          on ? "border-electric-blue-strong font-semibold text-zk-text" : "border-transparent font-medium text-zk-text2 hover:text-zk-text"
                        }`}
                      >
                        {label}
                        <span className={`rounded-full px-1.5 font-mono text-[11px] tabular-nums ${on ? "bg-zk-tint text-zk-accent" : "bg-zk-chip text-zk-muted"}`}>
                          {inboxCounts[view]}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </>
        ) : null}

        {!isDeletedView && allSelected ? (
          <nav aria-label="Filter all issues" className="issues-all-filters flex flex-wrap items-center justify-end gap-1.5">
            <span className="mr-1 text-[13px] font-medium text-zk-muted">Filter by:</span>
            {ALL_FILTERS.map(({ value, label }) => {
              const on = statusParam === value;
              return (
                <Link
                  key={value}
                  href={statusHref(value)}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent ${
                    on
                      ? "border-electric-blue-strong bg-electric-blue-strong text-white"
                      : "border-zk-border bg-zk-surface text-zk-text2 hover:text-zk-text"
                  }`}
                >
                  {label}
                  <span className={`font-mono text-[11px] tabular-nums ${on ? "text-white/80" : "text-zk-muted"}`}>{allFilterCount(value)}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}


        {isFirstRun ? (
          <FirstRunWelcome isAdmin={canDelete} hasTenant={Boolean(tenantId)} />
        ) : bugs.length === 0 ? (
          <div className="rounded-[20px] border border-zk-border bg-zk-surface px-4 py-12 text-center">
            <p className="font-bold text-zk-text">
              {inboxView
                ? "Nothing here right now."
                : isWatchingView && !qParam && !statusParam && !severityParam && !tagsParam && !selectedPlatform && !selectedMilestone
                ? "You're not watching any issues."
                : emptyPlatform
                  ? "No issues on this platform"
                  : "No issues match these filters."}
            </p>
            <p className="mt-1.5 text-sm text-zk-muted">
              {inboxView === "input"
                ? "No agent is waiting on an answer."
                : inboxView === "design"
                  ? "No redesign proposals are waiting for a decision."
                  : inboxView === "ideas"
                    ? "Newly reported issues show up here until they're confirmed."
                    : isWatchingView
                ? "You watch issues you report, are assigned to or comment on, and any you choose to watch from the issue page."
                : emptyPlatform
                  ? "Issues tagged for this platform will show up here."
                  : "Try clearing filters, or report it with New issue."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link href="/issues" className="text-sm font-bold text-zk-accent hover:underline">Clear filters</Link>
            </div>
          </div>
        ) : (
          <section className="issues-results flex flex-col gap-3.5">
            <div className="issues-results-summary flex flex-wrap items-baseline justify-between gap-2.5">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="text-lg font-bold text-zk-text">All issues</h2>
                <p role="status" aria-live="polite" className="text-[13px] text-zk-muted">
                  {/* Not shown on screen (the tabs carry the counts), but still announced when the results change. */}
                  <span className="sr-only">
                    {resultCountText(totalCount, statusParam ?? null)}, sorted by{" "}
                    {bugSortDescriptions[currentSort]}
                  </span>
                  {hiddenDuplicates > 0 || showDuplicates ? (
                    <>
                      <Link href={duplicatesHref} className="font-bold text-zk-accent hover:underline print:hidden">
                        {showDuplicates ? "Hide duplicates" : `Show ${hiddenDuplicates} duplicate${hiddenDuplicates === 1 ? "" : "s"}`}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="issues-table relative">
              <div>
                <div className="issues-table-heading">
                                    <span className="w-[52px]">Votes</span>
                  <span className="min-w-0 flex-1">Issue</span>
                  <span className="issues-status-cell">Status</span>
                  <span className="issues-priority">Priority</span>
                  <span className="w-10" aria-hidden="true" />
                </div>
                <ul>
                  {bugs.map((bug, index) => {
                    const userVote =
                      Array.isArray(bug.votes) && bug.votes.length > 0
                        ? (bug.votes[0].value ?? 1)
                        : 0;
                    const voterSummary =
                      voterSummaries.get(bug.id) ?? createEmptyVoterSummary();
                    const stage = stages.get(bug.id);
                    const typeName = bug.type?.name ?? "—";
                    const isSecurity = /security/i.test(typeName);
                    const isFeature = !isSecurity && /feature|improve|enhance|request|idea/i.test(typeName);
                    const claim = bug.claims?.[0];
                    // Someone is on it: an active claim, or the issue was moved to in progress.
                    const work = claim || bug.status === "in_progress"
                      ? { person: claim?.beneficiary?.name ?? bug.assignee?.name ?? null, since: claim ? (claim.claimedAt ?? claim.createdAt) : null }
                      : null;
                    const rowStatus = (
                      <IssueRowStatus status={bug.status} stage={stage} botConfirmations={botConfirmations.get(bug.id) ?? 0} votes={bug.voteCount} work={work} />
                    );

                    return (
                      <li
                        key={bug.id}
                        data-severity={bug.severity}
                        className={`issues-row flex items-center gap-2 px-2 py-3.5 lg:gap-4 lg:px-4 ${
                          index < bugs.length - 1 ? "border-b border-zk-divider" : ""
                        }`}
                      >
                        <div className="issues-vote w-[52px] shrink-0">
                          <VoteButton
                            bugId={bug.id}
                            voteCount={bug.voteCount}
                            userVote={userVote}
                            likeCount={voterSummary.likes.count}
                            size="sm"
                            chevron
                            readOnly={isDeletedView}
                          />
                        </div>
                        <Link
                          href={issuePath(bug.number)}
                          data-issue-link=""
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md text-left [touch-action:manipulation] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-electric-blue"
                        >
                          <span
                            data-issue-type-icon=""
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              isSecurity ? "bg-zk-bad-bg text-zk-bad-fg" : "bg-zk-tint text-zk-accent"
                            }`}
                            aria-hidden="true"
                          >
                            {isSecurity ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={BUG_ICON_PATH} /></svg>
                            )}
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className={`issues-row-title text-sm font-semibold leading-snug ${isDone(bug.status) ? "text-zk-muted" : "text-zk-text"}`}>
                              {searchText ? (
                                <Highlighted segments={highlightSegments(bug.title, searchText)} />
                              ) : (
                                bug.title
                              )}
                            </span>
                            <span className="issues-row-meta flex items-center gap-2 text-xs text-zk-muted">
                              <span className="font-mono tabular-nums">{formatIssueNumber(bug.number)}</span>
                              {/* The type, as a small icon: bug, feature or security. */}
                              <span className="inline-flex items-center" title={typeName}>
                                <span className="sr-only">{typeName}</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d={isSecurity ? "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" : isFeature ? FEATURE_ICON_PATH : BUG_ICON_PATH} />
                                </svg>
                              </span>
                              {(bug._count?.comments ?? 0) > 0 ? (
                                <span className="inline-flex items-center gap-1" title={`Conversation: ${bug._count?.comments}`}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                  {bug._count?.comments}
                                </span>
                              ) : null}
                              {(bug._count?.attachments ?? 0) > 0 ? (
                                <span title={`${bug._count?.attachments} attachments`}>📎 {bug._count?.attachments}</span>
                              ) : null}
                              {bug.isDeleted ? <span className="font-bold text-zk-bad-fg">Deleted</span> : null}
                              {bug.duplicateOf ? (
                                <span>Duplicate of {formatIssueNumber(bug.duplicateOf.number)}</span>
                              ) : null}
                              {bug.category ? <span>{bug.category.name}</span> : null}
                              <RowAge date={currentSort === "newest" ? bug.createdAt : bug.updatedAt} sort={currentSort === "newest" ? "newest" : "updated"} />
                              {/* Below md (768px) the status column is hidden, so the status rides at the end of this line. */}
                              <span className="inline-flex min-w-0 md:sr-only">{rowStatus}</span>
                            </span>
                            {snippets.has(bug.id) ? <SearchSnippet snippet={snippets.get(bug.id)!} /> : null}
                          </span>
                        </Link>
                        <span className="issues-status-cell" aria-hidden="true">{rowStatus}</span>
                        <span className="issues-priority" title={`${severityLabels[bug.severity]} priority`}>
                          <span className="sr-only">{severityLabels[bug.severity]} priority</span>
                          <span className="issues-priority-bars" aria-hidden="true">{[0, 1, 2].map((bar) => <i key={bar} data-active={bar < ({ low: 1, medium: 2, high: 3, critical: 3 }[bug.severity])} />)}</span>
                        </span>
                        <span
                          className={`w-10 shrink-0 items-center justify-end gap-2 ${
                            isWatchingView && !bug.isDeleted ? "flex" : "hidden lg:flex"
                          }`}
                        >
                          {bug.assignee ? (
                            <span className="hidden lg:inline-flex">
                              <RowAssignee name={bug.assignee.name} image={bug.assignee.image} />
                            </span>
                          ) : bug.reporter ? (
                            <span className="hidden lg:inline-flex" title={`Reported by ${bug.reporter.name}`}>
                              <Avatar name={bug.reporter.name} image={bug.reporter.image} size="sm" />
                              <span className="sr-only">Reported by {bug.reporter.name}</span>
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={totalCount}
              from={pagination.from}
              to={pagination.to}
              queryParams={issueListPaginationParams({
                status: statusParam,
                severity: severityParam,
                mine: mineFilter,
                q: qParam,
                sort: sortParam,
                milestone: milestoneParam,
                tags: tagsParam,
                platform: selectedPlatform,
                area: selectedArea,
                stage: stageView,
                deleted: isDeletedView,
                showDuplicates,
                showResolved,
                allProjects,
              })}
            />
          </section>
        )}
      </div>
    </div>
  );

  return page;
}

/** What a brand-new tracker shows instead of an empty list (#292, #444). */
function FirstRunWelcome({
  isAdmin,
  hasTenant = true,
}: {
  isAdmin: boolean;
  hasTenant?: boolean;
}) {
  if (!hasTenant) {
    return (
      <section aria-labelledby="issues-workspace-heading" className="issues-workspace-empty rounded-[20px] border border-zk-border bg-zk-bg px-6 py-10 text-center sm:px-8">
        <h2 id="issues-workspace-heading" className="text-xl font-bold leading-7 text-zk-text">No workspace yet</h2>
        <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-zk-text2">
          You are not currently a member of any workspace. Join a workspace via an invite from your team,
          or create your own workspace to start filing issues.
        </p>
        <div className="mt-6">
          <Link
            href="/tenants"
            className="inline-flex min-h-12 max-w-full items-center justify-center rounded-full bg-electric-blue-strong px-6 py-3 text-sm font-bold leading-5 text-white transition-colors hover:bg-blue-slate focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zk-accent"
          >
            Create or join a workspace
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-zk-border bg-zk-surface px-5 py-8 text-center">
      <h2 className="text-lg font-bold text-zk-text">No issues yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-zk-muted">
        This is where reported issues will appear. A good report says what you
        expected, what happened instead, and how to make it happen again.
      </p>
      <div className="mt-5">
        <Link
          href="/issues/new"
          className="inline-flex h-[42px] items-center justify-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(46,111,239,0.35)]"
        >
          Report the first issue
        </Link>
      </div>
      {isAdmin ? (
        <p className="mx-auto mt-6 max-w-md text-sm text-zk-muted">
          Before people start reporting, you may want to set up your{" "}
          <Link href="/projects" className="font-bold text-zk-accent underline">projects</Link>
          , and the{" "}
          <Link href="/admin/categories" className="font-bold text-zk-accent underline">platforms</Link>{" "}
          and{" "}
          <Link href="/admin/types" className="font-bold text-zk-accent underline">issue types</Link>{" "}
          they will choose from.
        </p>
      ) : null}
    </section>
  );
}
