// The labels and types from the real lib/issue-stage.ts. Its database queries are not part of this demo.

/** Where an open issue sits before someone starts the work. Not a status. */
export type IssueStage = "reported" | "confirmed" | "ready";

export const issueStageLabels: Record<IssueStage, string> = {
  reported: "Reported",
  confirmed: "Confirmed",
  ready: "Ready",
};

export type IssueStageView = IssueStage;

export function parseIssueStageView(raw: string | null | undefined): IssueStageView | null {
  return raw === "reported" || raw === "confirmed" || raw === "ready" ? raw : null;
}
